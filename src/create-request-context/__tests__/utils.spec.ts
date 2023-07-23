import { z } from 'zod'

import type {
	DataFunctionArgs,
	RequestContextFormDataParserArgs,
	RequestContextZodParseErrorEventHandler,
} from '../types'
import { parseForm, parseParams, parseQueryString, unwrapSchema } from '../utils'

describe('parseForm', () => {
	test('should return undefined if given no schema', async () => {
		const result = await parseForm(
			{ request: new Request('http://localhost/'), params: {} },
			undefined,
			{},
		)

		expect(result).toBeUndefined()
	})

	test('should parse the form data', async () => {
		const formData = new FormData()
		formData.append('name', 'Jimmy')
		formData.append('age', '5')

		const request = {
			formData: async () => formData,
		} as Request

		const result = await parseForm(
			{ request, params: {} },
			z.object({ name: z.string(), age: z.coerce.number() }),
			{},
		)

		expect(result.name).toBe('Jimmy')
		expect(result.age).toBe(5)
	})

	test(`should error when it can't parse`, async () => {
		const formData = new FormData()

		const request = {
			formData: async () => formData,
		} as Request

		await expect(() =>
			parseForm(
				{ request, params: {} },
				z.object({ name: z.string(), age: z.coerce.number() }),
				{},
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the form data."',
		)
	})

	test(`should error when it can't parse and call onParseError function`, async () => {
		const formData = new FormData()

		const request = {
			formData: async () => formData,
		} as Request

		const onParseError = vi.fn()

		await expect(() =>
			parseForm(
				{ request, params: {} },
				z.object({ name: z.string(), age: z.coerce.number() }),
				{},
				onParseError,
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the form data."',
		)

		expect(onParseError).toBeCalled()
	})

	test(`should when it fails to parse, any error thrown in the onParseError shouldn't throw default error`, async () => {
		const formData = new FormData()

		const request = {
			formData: async () => formData,
		} as Request

		const onParseError = () => {
			throw new Error('custom error')
		}

		await expect(() =>
			parseForm(
				{ request, params: {} },
				z.object({ name: z.string(), age: z.coerce.number() }),
				{},
				onParseError,
			),
		).rejects.toThrowErrorMatchingInlineSnapshot('"custom error"')
	})

	test(`should use onParseError and receive the given context and dataArgs`, async () => {
		const formData = new FormData()

		const mockedDataArgs: DataFunctionArgs = {
			request: {
				formData: async () => formData,
			} as Request,
			params: {},
		}

		const context = {
			test: vi.fn(),
		}

		const onParseError: RequestContextZodParseErrorEventHandler<typeof context> = ({
			context,
			dataArgs,
		}) => {
			context.test(dataArgs)
		}

		await expect(() =>
			parseForm(
				mockedDataArgs,
				z.object({ name: z.string(), age: z.coerce.number() }),
				context,
				onParseError,
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the form data."',
		)

		expect(context.test).toBeCalled()
		expect(context.test.mock.calls[0][0]).toBe(mockedDataArgs)
	})

	test(`should use our custom form parser function`, async () => {
		const formData = new FormData()
		formData.append('name', 'Jimmy')
		formData.append('age', '5')

		const request = {
			formData: async () => formData,
		} as Request

		const customParser = vi.fn(
			async ({ dataArgs: { request } }: RequestContextFormDataParserArgs<{}>) => {
				return await request.formData()
			},
		)

		const result = await parseForm(
			{ request, params: {} },
			z.object({ name: z.string(), age: z.coerce.number() }),
			{},
			undefined,
			customParser,
		)

		expect(customParser).toBeCalled()
		expect(result.name).toBe('Jimmy')
		expect(result.age).toBe(5)
	})
})

describe('parseParams', () => {
	test('should return params if given no schema', async () => {
		const result = await parseParams(
			{ request: {} as Request, params: { page: '5' } },
			undefined,
			{},
		)

		expect(result.page).toBe('5')
	})

	test('should parse the params data', async () => {
		const result = await parseParams(
			{ request: {} as Request, params: { page: '5' } },
			z.object({
				page: z.coerce.number(),
			}),
			{},
		)

		expect(result.page).toBe(5)
	})

	test(`should error when it can't parse`, async () => {
		await expect(() =>
			parseParams(
				{ request: {} as Request, params: { foo: 'bar' } },
				z.object({
					page: z.coerce.number(),
				}),
				{},
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the params."',
		)
	})

	test(`should error when it can't parse and call onParseError function`, async () => {
		const onParseError = vi.fn()

		await expect(() =>
			parseParams(
				{ request: {} as Request, params: { foo: 'bar' } },
				z.object({
					page: z.coerce.number(),
				}),
				{},
				onParseError,
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the params."',
		)

		expect(onParseError).toBeCalled()
	})

	test(`should when it fails to parse, any error thrown in the onParseError shouldn't throw default error`, async () => {
		const onParseError = () => {
			throw new Error('custom error')
		}

		await expect(() =>
			parseParams(
				{ request: {} as Request, params: { foo: 'bar' } },
				z.object({
					page: z.coerce.number(),
				}),
				{},
				onParseError,
			),
		).rejects.toThrowErrorMatchingInlineSnapshot('"custom error"')
	})

	test(`should use onParseError and receive the given context and dataArgs`, async () => {
		const context = {
			test: vi.fn(),
		}

		const mockedDataArgs: DataFunctionArgs = { request: {} as Request, params: { foo: 'bar' } }

		const onParseError: RequestContextZodParseErrorEventHandler<typeof context> = ({
			context,
			dataArgs,
		}) => {
			context.test(dataArgs)
		}

		await expect(() =>
			parseParams(
				mockedDataArgs,
				z.object({
					page: z.coerce.number(),
				}),
				context,
				onParseError,
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the params."',
		)

		expect(context.test).toBeCalled()
		expect(context.test.mock.calls[0][0]).toBe(mockedDataArgs)
	})
})

describe('parseQueryString', () => {
	test('should return undefined if given no schema', async () => {
		const result = await parseQueryString(
			{ request: new Request('http://localhost/?page=1&size=25&sort=asc'), params: {} },
			undefined,
			{},
		)

		expect(result).toBeUndefined()
	})

	test('should parse the params data', async () => {
		const result = await parseQueryString(
			{ request: new Request('http://localhost/?page=1&size=25&sort=asc'), params: {} },
			z.object({
				page: z.coerce.number(),
				size: z.coerce.number(),
				sort: z.enum(['asc', 'desc']),
			}),
			{},
		)

		expect(result.page).toBe(1)
		expect(result.size).toBe(25)
		expect(result.sort).toBe('asc')
	})

	test(`should error when it can't parse`, async () => {
		await expect(() =>
			parseQueryString(
				{ request: new Request('http://localhost/?page=1&size=25&sort=asc'), params: {} },
				z.object({
					id: z.coerce.number(),
				}),
				{},
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the query string."',
		)
	})

	test(`should error when it can't parse and call onParseError function`, async () => {
		const onParseError = vi.fn()

		await expect(() =>
			parseQueryString(
				{ request: new Request('http://localhost/?page=1&size=25&sort=asc'), params: {} },
				z.object({
					id: z.coerce.number(),
				}),
				{},
				onParseError,
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the query string."',
		)

		expect(onParseError).toBeCalled()
	})

	test(`should when it fails to parse, any error thrown in the onParseError shouldn't throw default error`, async () => {
		const onParseError = () => {
			throw new Error('custom error')
		}

		await expect(() =>
			parseQueryString(
				{ request: new Request('http://localhost/?page=1&size=25&sort=asc'), params: {} },
				z.object({
					id: z.coerce.number(),
				}),
				{},
				onParseError,
			),
		).rejects.toThrowErrorMatchingInlineSnapshot('"custom error"')
	})

	test(`should use onParseError and receive the given context and dataArgs`, async () => {
		const context = {
			test: vi.fn(),
		}

		const mockedDataArgs: DataFunctionArgs = {
			request: new Request('http://localhost/?page=1&size=25&sort=asc'),
			params: {},
		}

		const onParseError: RequestContextZodParseErrorEventHandler<typeof context> = ({
			context,
			dataArgs,
		}) => {
			context.test(dataArgs)
		}

		await expect(() =>
			parseQueryString(
				mockedDataArgs,
				z.object({
					id: z.coerce.number(),
				}),
				context,
				onParseError,
			),
		).rejects.toThrowErrorMatchingInlineSnapshot(
			'"Several issues were found while trying to parse the query string."',
		)

		expect(context.test).toBeCalled()
		expect(context.test.mock.calls[0][0]).toBe(mockedDataArgs)
	})
})

describe('unwrapSchema', () => {
	test(`unwraps the schema if it's a function`, () => {
		const schema = unwrapSchema(() => z.object({}))

		expect(typeof schema).toBe('object')
	})
	test(`returns the schema if its not a schema`, () => {
		const schema = z.object({})
		const unwrappedSchema = unwrapSchema(schema)

		expect(schema).toBe(unwrappedSchema)
	})
})
