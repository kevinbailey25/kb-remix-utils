import { z } from 'zod'

/**
 * Helper type to get the inferred type from a zod schema, if no schema is provided, it uses a default, which defaults to undefined.
 */
export type ZodInferredOrDefault<
	TSchema extends z.ZodTypeAny | undefined = undefined,
	TDefault = undefined,
> = TSchema extends undefined ? TDefault : TSchema extends z.ZodTypeAny ? z.infer<TSchema> : never

/**
 * Base event object for Zod schema parsing failures.
 * @see {@link ZodParseErrorEventHandler}
 */
export type ZodParseErrorEventBase = {
	/** The Zod error details. */
	error: z.ZodError
}

/**
 * A callback for when Zod schema parsing fails.
 * @param event The error event details.
 */
export type ZodParseErrorEventHandler<
	TEvent extends ZodParseErrorEventBase = ZodParseErrorEventBase,
> = (event: TEvent) => Promise<void> | void

/**
 * Creates a z.object() that defaults to an empty object
 * @param shape
 * @returns
 */
export function zodObject<T extends z.ZodRawShape>(shape: T) {
	return z.object(shape).default({} as any)
}

/**
 * Creates a z.discriminatedUnion with an enabled property that properly converts a string of 'true' to true | false.
 * @param shape Additional properties to have if enabled is `true`.
 * @returns a preprocessed discriminated enable union
 */
export function zodDiscriminatedEnabledUnion<T extends z.ZodRawShape>(shape: T) {
	return z.preprocess(
		val =>
			objectHasEnabledProperty(val)
				? {
						...val,
						enabled:
							typeof val.enabled === 'boolean' ? val.enabled : val.enabled === 'true',
				  }
				: { enabled: false },
		z.discriminatedUnion('enabled', [
			z.object({
				enabled: z.literal(false),
			}),
			z.object({
				...shape,
				enabled: z.literal(true),
			}),
		]),
	)
}

/**
 * Type guard for verifying that the passed in variable is an object that is not null and not undefined with a enabled property on it.
 * @param val the object to check
 * @returns boolean of whether it has the enabled property
 */
function objectHasEnabledProperty(val: unknown): val is { enabled: unknown } {
	return typeof val === 'object' && val !== null && val !== undefined && 'enabled' in val
}
