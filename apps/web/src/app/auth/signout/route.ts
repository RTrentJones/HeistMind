import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
    const supabase = await createClient()

    try {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
    } catch (error) {
        console.error('Sign out error:', error)
        return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
    }
}
