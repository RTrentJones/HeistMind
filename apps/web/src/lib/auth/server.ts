import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface AuthUser {
    id: string
    email: string
    name: string
    avatar?: string
    role?: 'gm' | 'player'
}

// Server-side auth helpers
export async function getUser(): Promise<AuthUser | null> {
    const supabase = await createClient()

    try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return null
        }

        // Get profile data from the profiles table (always in public schema)
        const { data: profile } = await supabase
            .schema('public')
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single()

        return {
            id: user.id,
            email: user.email!,
            name: profile?.username || user.user_metadata?.full_name || user.email!.split('@')[0],
            avatar: profile?.avatar_url || user.user_metadata?.avatar_url,
            role: 'player' // Default role for now
        }
    } catch (error) {
        console.error('Error getting user:', error)
        return null
    }
}

export async function requireAuth(): Promise<AuthUser> {
    const user = await getUser()

    if (!user) {
        redirect('/auth/signin')
    }

    return user
}
