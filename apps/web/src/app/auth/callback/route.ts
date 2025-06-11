import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const redirectTo = searchParams.get('redirect_to') || '/dashboard'

    if (code) {
        const supabase = await createClient()

        try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
                console.error('OAuth callback error:', error)
                return NextResponse.redirect(new URL(`/auth/signin?error=${encodeURIComponent(error.message)}`, request.url))
            }

            if (!data.session) {
                console.error('No session after OAuth exchange')
                return NextResponse.redirect(new URL('/auth/signin?error=no_session', request.url))
            }

            console.log('OAuth successful for user:', data.user?.email)

            // Create response with redirect
            const response = NextResponse.redirect(new URL(redirectTo, request.url))

            // Add a header to indicate successful auth for client-side detection
            response.headers.set('x-auth-success', 'true')

            return response
        } catch (error) {
            console.error('OAuth exchange error:', error)
            return NextResponse.redirect(new URL('/auth/signin?error=oauth_error', request.url))
        }
    }

    // No code provided
    return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url))
}
