import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// This client bypasses RLS and should ONLY be used in server environments
// and ONLY for administrative tasks (like creating users)
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
