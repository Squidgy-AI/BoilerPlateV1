import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Check if this is coming from an invitation magic link
  const redirectTo = requestUrl.searchParams.get('redirectTo')
  if (redirectTo && redirectTo.includes('/invite/')) {
    return NextResponse.redirect(redirectTo)
  }

  // Otherwise redirect to the next URL or home
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}