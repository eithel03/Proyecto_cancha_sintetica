'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyBusinessAdminAccess } from '@/lib/auth'

/**
 * Auto-start pending matches for a given business.
 * This function is invoked both on client side (via import) and on server side.
 */
export async function autoStartMatches(businessId: string) {
  const supabase = await createClient()

  // SECURITY: require an authenticated session before any database read/write
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('No autorizado')
  }

  // SECURITY: only the business owner, admin-level staff (manager) or a global
  // super_admin can start matches; any other session gets a generic error
  // and no data is exposed about why access was denied.
  const { error: accessError } = await verifyBusinessAdminAccess(supabase, user.id, businessId)
  if (accessError) {
    throw new Error('No autorizado')
  }

  // Find matches that are scheduled and should start automatically (e.g., status = 'pending' and match_time <= now)
  const now = new Date()
  
  const { data: matches, error } = await supabase
    .from('tournament_matches')
    .select('id, status, match_date, match_time')
    .eq('business_id', businessId)
    .eq('status', 'pending')

  if (error) {
    console.error('autoStartMatches error:', error)
    return
  }

  if (!matches) return

  for (const m of matches) {
    const matchDateTime = new Date(`${m.match_date}T${m.match_time}`)
    if (matchDateTime <= now) {
      // Update the match to live state and set live_started_at
      await supabase
        .from('tournament_matches')
        .update({ status: 'live', live_started_at: now.toISOString() })
        .eq('id', m.id)
    }
  }
}
