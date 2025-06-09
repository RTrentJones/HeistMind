// Supabase implementation of ProfileRepository
// Uses adapters to transform between Supabase types and domain types

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase-types'
import type { ProfileRepository, Profile, CreateProfileData, UpdateProfileData, Result } from '../domain-types'
import { fromSupabaseProfile, toSupabaseProfileInsert, toSupabaseProfileUpdate } from '../adapters/profile-adapter'

export class SupabaseProfileRepository implements ProfileRepository {
    constructor(private supabase: SupabaseClient<Database>) { }

    async create(data: CreateProfileData): Promise<Result<Profile>> {
        try {
            // Note: In real implementation, you'd get userId from auth context
            // This is just an example
            const userId = 'temp-user-id'

            const insertData = toSupabaseProfileInsert(data, userId)

            const { data: profileRow, error } = await this.supabase
                .from('profiles')
                .insert(insertData)
                .select()
                .single()

            if (error) {
                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.details
                    }
                }
            }

            const profile = fromSupabaseProfile(profileRow)
            return { success: true, data: profile }

        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    code: 'UNKNOWN_ERROR'
                }
            }
        }
    }

    async findById(id: string): Promise<Result<Profile | null>> {
        try {
            const { data: profileRow, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return { success: true, data: null }
                }

                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.details
                    }
                }
            }

            const profile = fromSupabaseProfile(profileRow)
            return { success: true, data: profile }

        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    code: 'UNKNOWN_ERROR'
                }
            }
        }
    }

    async findByUsername(username: string): Promise<Result<Profile | null>> {
        try {
            const { data: profileRow, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return { success: true, data: null }
                }

                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.details
                    }
                }
            }

            const profile = fromSupabaseProfile(profileRow)
            return { success: true, data: profile }

        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    code: 'UNKNOWN_ERROR'
                }
            }
        }
    }

    async update(id: string, data: UpdateProfileData): Promise<Result<Profile>> {
        try {
            const updateData = toSupabaseProfileUpdate(data)

            const { data: profileRow, error } = await this.supabase
                .from('profiles')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.details
                    }
                }
            }

            const profile = fromSupabaseProfile(profileRow)
            return { success: true, data: profile }

        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    code: 'UNKNOWN_ERROR'
                }
            }
        }
    }

    async delete(id: string): Promise<Result<void>> {
        try {
            const { error } = await this.supabase
                .from('profiles')
                .delete()
                .eq('id', id)

            if (error) {
                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.details
                    }
                }
            }

            return { success: true, data: undefined }

        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    code: 'UNKNOWN_ERROR'
                }
            }
        }
    }
}
