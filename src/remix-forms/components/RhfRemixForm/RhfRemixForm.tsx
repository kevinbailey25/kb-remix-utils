import { zodResolver } from '@hookform/resolvers/zod'
import type { FetcherWithComponents, FormMethod, FormProps } from '@remix-run/react'
import { Form, useNavigation } from '@remix-run/react'
import type { SerializeFrom } from '@remix-run/server-runtime'
import * as React from 'react'
import type { FieldValues, SubmitHandler } from 'react-hook-form'
import { FormProvider, useForm } from 'react-hook-form'
import type { z } from 'zod'

import { useMergedFetcher } from './use-merged-fetcher'
import { useLatestCallback } from '../../hooks'

export interface RhfRemixFormProps<
	TResponseData = unknown,
	TZodSchema extends z.ZodTypeAny = z.ZodTypeAny,
> extends Omit<FormProps, 'onSubmit' | 'defaultValue' | 'defaultChecked'> {
	/** default values for the form */
	defaultValues?: z.infer<TZodSchema>

	/** The Zod Schema representing the form */
	schema: TZodSchema | (() => TZodSchema)

	/** Orientation of fields either horizontal/vertical */
	orientation?: 'horizontal' | 'vertical'

	/** The label alignment for horizontal fields
	 * @default 'right'
	 */
	labelAlign?: 'left' | 'center' | 'right'

	/** Optionally override the default horizontal label width for all FormGroups */
	horizontalLabelWidth?: string

	/** Optionally use a fetcher to use with the form. */
	fetcher?: FetcherWithComponents<SerializeFrom<TResponseData>>

	/** The HTTP method to send the form with.
	 * @default 'POST'
	 */
	method?: Uppercase<FormMethod>

	/**
	 * Optional handler to run after submission if the action returns data
	 * @param data data returned from the action
	 */
	onSubmitted?: (data: SerializeFrom<TResponseData>) => void
}

/**
 * Smart Rhf powered Remix Form that knows how to handle file uploads with RhfRemixFileDropzone.
 * @param props
 * @returns
 */
export function RhfRemixForm<
	TResponseData = unknown,
	TZodSchema extends z.ZodTypeAny = z.ZodTypeAny,
>({
	method = 'POST',
	defaultValues,
	schema,
	children,
	orientation,
	labelAlign = 'right',
	horizontalLabelWidth,
	fetcher,
	onSubmitted,
	...formProps
}: RhfRemixFormProps<TResponseData, TZodSchema>) {
	const navigation = useNavigation()

	const mergedFetcher = useMergedFetcher<TResponseData>(fetcher)

	const isRedirecting =
		navigation.state === 'loading' &&
		mergedFetcher.formData != null &&
		mergedFetcher.formAction !== navigation.location.pathname

	const methods = useForm({
		defaultValues,
		resolver: zodResolver(typeof schema === 'function' ? schema() : schema),
	})

	const onLatestSubmitted = useLatestCallback(onSubmitted ?? (() => {}))
	React.useEffect(() => {
		if (mergedFetcher.data) {
			onLatestSubmitted(mergedFetcher.data)
		}
	}, [mergedFetcher.data, onLatestSubmitted])

	const onSubmit: SubmitHandler<FieldValues> = (_, event) => {
		if (event) {
			mergedFetcher.submit(event.target)
		}
	}

	return (
		<FormProvider {...methods}>
			<Form method={method} onSubmit={methods.handleSubmit(onSubmit)} {...formProps}>
				<fieldset disabled={mergedFetcher.state === 'submitting' || isRedirecting}>
					{children}
				</fieldset>
			</Form>
		</FormProvider>
	)
}
