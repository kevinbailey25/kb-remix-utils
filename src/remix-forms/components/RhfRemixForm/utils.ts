/**
 * Smart to upper case function that helps typescript preserve string unions
 * @param value the value to uppercase
 * @returns the uppercase string (along with the smarter union types)
 */
export function toUpper<T extends string | undefined>(
	value: T,
): T extends string ? Uppercase<T> : undefined {
	return value?.toUpperCase() as T extends string ? Uppercase<T> : undefined
}
