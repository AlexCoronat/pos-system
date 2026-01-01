import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

export default getRequestConfig(async ({ locale }) => {
  // If locale is not provided by middleware, try to get it from headers or cookies
  let finalLocale = locale

  if (!finalLocale) {
    const headersList = headers()
    finalLocale = headersList.get('x-next-intl-locale') || undefined
  }

  if (!finalLocale) {
    const cookieStore = cookies()
    finalLocale = cookieStore.get('NEXT_LOCALE')?.value || undefined
  }


  // Default to 'es' if still no locale found
  if (!finalLocale) {
    finalLocale = 'es'
  }

  return {
    locale: finalLocale,
    messages: (await import(`./messages/${finalLocale}.json`)).default
  }
})
