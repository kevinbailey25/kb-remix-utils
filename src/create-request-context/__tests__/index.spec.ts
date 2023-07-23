import { z } from 'zod'
import { createRequestContextFactory } from '..'

describe('createRequestContextFactory', () => {
	test('should create a basic createRequestContext', async () => {
		const createRequestContext = createRequestContextFactory(() => ({}))

		expect(typeof createRequestContext).toBe('function')

		const context = await createRequestContext({
			params: { id: '5' },
			request: new Request('http://localhost/test/?page=1&size=25&sort=asc'),
		})

		expect(context.form).toBeUndefined()
		expect(context.params.id).toBe('5')
		expect(context.queryString).toBeUndefined()
	})

	test('should parse query strings and params', async () => {
		const createRequestContext = createRequestContextFactory(() => ({}))

		expect(typeof createRequestContext).toBe('function')

		const context = await createRequestContext(
			{
				params: { id: '5' },
				request: new Request('http://localhost/test/?page=1&size=25&sort=asc'),
			},
			{
				queryStringSchema: z.object({
					page: z.coerce.number(),
					size: z.coerce.number(),
					sort: z.string(),
				}),
				paramsSchema: z.object({ id: z.coerce.number() }),
			},
		)

		expect(context.form).toBeUndefined()
		expect(context.params.id).toBe(5)
		expect(context.queryString.page).toBe(1)
		expect(context.queryString.size).toBe(25)
		expect(context.queryString.sort).toBe('asc')
	})

	test('should call onParseError handler for params', async () => {
		const onParamsError = vi.fn()
		const createRequestContext = createRequestContextFactory({
			configurator: () => ({}),
			onParamsError,
		})

		expect(typeof createRequestContext).toBe('function')

		await expect(() =>
			createRequestContext(
				{
					params: { thing: '5' },
					request: new Request('http://localhost/test/?page=1&size=25&sort=asc'),
				},
				{
					paramsSchema: z.object({ id: z.coerce.number() }),
				},
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the params."',
		)

		expect(onParamsError).toBeCalled()
	})

	test('should call onParseError handler for query string', async () => {
		const onQueryStringError = vi.fn()
		const createRequestContext = createRequestContextFactory({
			configurator: () => ({}),
			onQueryStringError,
		})

		expect(typeof createRequestContext).toBe('function')

		await expect(() =>
			createRequestContext(
				{
					params: {},
					request: new Request('http://localhost/test/?page=1&size=25&sort=asc'),
				},
				{
					queryStringSchema: z.object({ id: z.coerce.number() }),
				},
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the query string."',
		)

		expect(onQueryStringError).toBeCalled()
	})

	test('should parse form data', async () => {
		const createRequestContext = createRequestContextFactory(() => ({}))

		expect(typeof createRequestContext).toBe('function')

		const formData = new FormData()
		formData.append('name', 'Jimmy')
		formData.append('age', '5')

		const request = {
			formData: async () => formData,
		} as Request

		const context = await createRequestContext(
			{
				params: {},
				request,
			},
			{
				formSchema: z.object({ name: z.string(), age: z.coerce.number() }),
			},
		)

		expect(context.form.age).toBe(5)
		expect(context.form.name).toBe('Jimmy')
	})

	test('should call onParseError handler for form data', async () => {
		const onFormError = vi.fn()
		const createRequestContext = createRequestContextFactory({
			configurator: () => ({}),
			onFormError,
		})

		expect(typeof createRequestContext).toBe('function')

		const formData = new FormData()
		formData.append('name', 'Jimmy')
		formData.append('age', '5')

		const request = {
			formData: async () => formData,
		} as Request

		await expect(() =>
			createRequestContext(
				{
					params: {},
					request,
				},
				{
					formSchema: z.object({ id: z.coerce.number() }),
				},
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the form data."',
		)

		expect(onFormError).toBeCalled()
	})

	test('adding extra options', async () => {
		const moreStuffToDo = vi.fn()

		const createRequestContext = createRequestContextFactory<{}, { doMore?: boolean }>(
			(_, options) => {
				if (options?.doMore) {
					moreStuffToDo()
				}
				return {}
			},
		)

		expect(typeof createRequestContext).toBe('function')

		await createRequestContext({
			params: {},
			request: new Request('http://localhost'),
		})

		expect(moreStuffToDo).not.toBeCalled()

		await createRequestContext(
			{
				params: {},
				request: new Request('http://localhost'),
			},
			{ doMore: true },
		)

		expect(moreStuffToDo).toBeCalled()
	})

	test('adding extra context items', async () => {
		const createRequestContext = createRequestContextFactory<
			{ magic: number },
			{ magicEight?: boolean }
		>((_, options) => {
			if (options?.magicEight) {
				return { magic: 8 }
			}
			return { magic: 0 }
		})

		expect(typeof createRequestContext).toBe('function')

		const { magic } = await createRequestContext({
			params: {},
			request: new Request('http://localhost'),
		})

		expect(magic).toBe(0)

		const { magic: magic2 } = await createRequestContext(
			{
				params: {},
				request: new Request('http://localhost'),
			},
			{ magicEight: true },
		)

		expect(magic2).toBe(8)
	})

	test('throwing an error in the configurator is fine', async () => {
		const createRequestContext = createRequestContextFactory(() => {
			throw new Error('I can do this!')
		})

		expect(typeof createRequestContext).toBe('function')

		await expect(() =>
			createRequestContext({
				params: {},
				request: new Request('http://localhost'),
			}),
		).rejects.toThrowErrorMatchingInlineSnapshot('"I can do this!"')
	})

	test('custom contexts that have getters should not be called upon creation', async () => {
		const check = vi.fn()

		const createRequestContext = createRequestContextFactory<{ test: string }>(() => ({
			get test() {
				check()
				return 'test'
			},
		}))

		expect(typeof createRequestContext).toBe('function')

		const context = await createRequestContext({
			params: { id: '5' },
			request: new Request('http://localhost/test/?page=1&size=25&sort=asc'),
		})

		expect(context.form).toBeUndefined()
		expect(context.params.id).toBe('5')
		expect(context.queryString).toBeUndefined()
		expect(check).not.toBeCalled()
		expect(context.test).toBe('test')
		expect(check).toBeCalled()
	})
})
