import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const redirectTo = searchParams.get('redirect_to') || '/dashboard'

    if (code) {
        const supabase = await createClient()

        try {
            const { error } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
                console.error('OAuth callback error:', error)
                return NextResponse.redirect(new URL(`/auth/signin?error=${encodeURIComponent(error.message)}`, request.url))
            }

            // Successful authentication - redirect to intended destination
            return NextResponse.redirect(new URL(redirectTo, request.url))
        } catch (error) {
            console.error('OAuth exchange error:', error)
            return NextResponse.redirect(new URL('/auth/signin?error=oauth_error', request.url))
        }
    }

    // No code provided
    return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url))
}
