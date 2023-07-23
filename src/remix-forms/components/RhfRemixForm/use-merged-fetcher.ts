import type { FetcherWithComponents, FormMethod, SubmitFunction } from '@remix-run/react'
import { useActionData, useNavigation, useSubmit } from '@remix-run/react'
import { toUpper } from './utils'
import type { SerializeFrom } from '@remix-run/server-runtime'

/**
 * Different states that a merged fetcher can be in.
 */
export type MergedFetcherStates<TResponseData = unknown> = {
	Idle: {
		state: 'idle'
		formMethod: undefined
		formAction: undefined
		formData: undefined
		submit: SubmitFunction
		data: SerializeFrom<TResponseData> | undefined
	}
	Loading: {
		state: 'loading'
		formMethod: Uppercase<FormMethod> | undefined
		formAction: string | undefined
		formData: FormData | undefined
		submit: SubmitFunction
		data: SerializeFrom<TResponseData> | undefined
	}
	Submitting: {
		state: 'submitting'
		formMethod: Uppercase<FormMethod>
		formAction: string
		formData: FormData | undefined
		submit: SubmitFunction
		data: SerializeFrom<TResponseData> | undefined
	}
}

/**
 * Discriminated Union for the state for a merged fetcher.
 */
export type MergedFetcher<TData = unknown> =
	MergedFetcherStates<TData>[keyof MergedFetcherStates<TData>]

/**
 * Hook to standardize the API for submitting a form with Remix.
 * If a `fetcher` is provided, the api will use it.
 * Otherwise it will default to using standard methods of submitting forms with Remix.
 * @param fetcher fetcher to use to power the form
 * @returns
 */
export function useMergedFetcher<TResponseData = unknown>(
	fetcher?: FetcherWithComponents<SerializeFrom<TResponseData>>,
): MergedFetcher<TResponseData> {
	const navigation = useNavigation()
	const submit = useSubmit()
	const actionData = useActionData<TResponseData>()

	// break out into switches to help typescript derive their types better.
	if (fetcher) {
		switch (fetcher.state) {
			case 'idle':
				return {
					state: 'idle',
					formAction: fetcher.formAction,
					formData: fetcher.formData,
					formMethod: fetcher.formMethod,
					submit: fetcher.submit,
					data: fetcher.data,
				}
			case 'loading':
				return {
					state: 'loading',
					formAction: fetcher.formAction,
					formData: fetcher.formData,
					formMethod: fetcher.formMethod,
					submit: fetcher.submit,
					data: fetcher.data,
				}
			case 'submitting':
				return {
					state: 'submitting',
					formAction: fetcher.formAction,
					formData: fetcher.formData,
					formMethod: fetcher.formMethod,
					submit: fetcher.submit,
					data: fetcher.data,
				}
		}
	}

	switch (navigation.state) {
		case 'idle':
			return {
				state: 'idle',
				formMethod: navigation.formMethod,
				formAction: navigation.formAction,
				formData: navigation.formData,
				submit,
				data: actionData,
			}
		case 'loading':
			return {
				state: 'loading',
				formAction: navigation.formAction,
				formData: navigation.formData,
				formMethod: toUpper(navigation.formMethod),
				submit,
				data: actionData,
			}
		case 'submitting':
			return {
				state: 'submitting',
				formAction: navigation.formAction,
				formData: navigation.formData,
				formMethod: toUpper(navigation.formMethod),
				submit,
				data: actionData,
			}
	}
}
