'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Auto-start pending matches for a given business.
 * This function is invoked both on client side (via import) and on server side.
 */
export async function autoStartMatches(businessId: string) {
  const supabase = await createClient()
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
