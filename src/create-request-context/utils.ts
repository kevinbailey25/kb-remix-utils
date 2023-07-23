import type { z } from 'zod'
import { get, set } from 'react-hook-form'

import type { ZodInferredOrDefault } from '~/zod'
import type {
	DataFunctionArgs,
	RequestContextFormDataParserArgs,
	RequestContextZodParseErrorEventHandler,
} from './types'

/**
 * If a formSchema is given, it then parses the form that was posted, and converts it into a nice javascript object (ignores files)
 * @param dataArgs the original request data args
 * @param formSchema the form schema to parse and verify it matches
 * @param context the custom context created from the factory
 * @param onParseError optional handler for when zod fails to parse the form
 * @returns a type safe object
 */
export async function parseForm<
	TFormSchema extends z.ZodTypeAny | undefined = undefined,
	TContext extends {} = {},
>(
	dataArgs: DataFunctionArgs,
	formSchema: TFormSchema,
	context: TContext,
	onParseError?: RequestContextZodParseErrorEventHandler<TContext>,
	formDataParser?: (args: RequestContextFormDataParserArgs<TContext>) => Promise<FormData>,
) {
	if (formSchema) {
		const form = formDataParser
			? await formDataParser({ context, dataArgs })
			: await dataArgs.request.formData()
		const obj = {}
		for (const key of form.keys()) {
			let values = form.getAll(key)

			// strip out non-string values
			values = values.filter(v => typeof v === 'string')

			if (values.length === 0) {
				// Probably should just skip
				continue
			}

			// Unwrap array for single value props
			set(obj, key, values.length === 1 ? values[0] : values)
		}

		const result = formSchema.safeParse(obj)
		if (result.success) {
			return result.data as ZodInferredOrDefault<TFormSchema>
		}
		if (onParseError) {
			await onParseError({ error: result.error, context, dataArgs })
		}
		throw new Error('Several issues were found while trying to parse the form data.')
	}
	return undefined as ZodInferredOrDefault<TFormSchema>
}

/**
 * If a paramsSchema was given, it then parses the params
 * @param dataArgs the original request data args
 * @param paramsSchema the params schema to parse and verify it matches
 * @param context the custom context created from the factory
 * @param onParseError optional handler for when zod fails to parse the params
 * @returns a type safe object of params
 */
export async function parseParams<
	TParamsSchema extends z.ZodTypeAny | undefined = undefined,
	TContext extends {} = {},
>(
	dataArgs: DataFunctionArgs,
	paramsSchema: TParamsSchema,
	context: TContext,
	onParseError?: RequestContextZodParseErrorEventHandler<TContext>,
) {
	if (paramsSchema) {
		const result = paramsSchema.safeParse(dataArgs.params)
		if (result.success) {
			return result.data as ZodInferredOrDefault<TParamsSchema, DataFunctionArgs['params']>
		}
		if (onParseError) {
			await onParseError({ error: result.error, context, dataArgs })
		}
		throw new Error('Several issues were found while trying to parse the params.')
	}
	return dataArgs.params as ZodInferredOrDefault<TParamsSchema, DataFunctionArgs['params']>
}

/**
 * If a queryStringSchema was given, it then parses the query string from the request
 * @param dataArgs the original request data args
 * @param queryStringSchema the query string schema to parse and verify it matches
 * @param context the custom context created from the factory
 * @param onParseError optional handler for when zod fails to parse the query string
 * @returns a type safe object of the query string
 */
export async function parseQueryString<
	TQueryStringSchema extends z.ZodTypeAny | undefined = undefined,
	TContext extends {} = {},
>(
	dataArgs: DataFunctionArgs,
	queryStringSchema: TQueryStringSchema,
	context: TContext,
	onParseError?: RequestContextZodParseErrorEventHandler<TContext>,
) {
	if (queryStringSchema) {
		const iterator = new URL(dataArgs.request.url).searchParams.entries()
		const obj = {}
		for (const [key, value] of iterator) {
			const check = get(obj, key, undefined)
			if (check !== undefined) {
				if (Array.isArray(check)) {
					check.push(value)
				} else {
					set(obj, key, [check, value])
				}
			} else {
				set(obj, key, value)
			}
		}

		const result = queryStringSchema.safeParse(obj)
		if (result.success) {
			return result.data as ZodInferredOrDefault<TQueryStringSchema>
		}
		if (onParseError) {
			await onParseError({ error: result.error, context, dataArgs })
		}
		throw new Error('Several issues were found while trying to parse the query string.')
	}
	return undefined as ZodInferredOrDefault<TQueryStringSchema>
}

/**
 * Utility function to unwrap a schema from a function
 * @param schema the schema or function that returns a schema
 * @returns the schema
 */
export function unwrapSchema<TSchema extends z.ZodTypeAny | undefined = undefined>(
	schema?: TSchema | (() => TSchema),
) {
	return typeof schema === 'function' ? schema() : (schema as ZodInferredOrDefault<TSchema>)
}
