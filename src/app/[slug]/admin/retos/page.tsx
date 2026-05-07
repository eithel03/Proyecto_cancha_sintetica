import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminChallengesClient from './AdminChallengesClient'

export default async function AdminChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/onboarding')

  // Fetch challenges (accepted ones primarily, but also others for history)
  const { data: challenges } = await supabase
    .from('challenges')
    .select(`
      *,
      courts ( name ),
      creator:creator_id ( full_name, phone ),
      opponent:opponent_id ( full_name, phone )
    `)
    .eq('business_id', business.id)
    .in('status', ['open', 'accepted', 'confirmed'])
    .order('challenge_date', { ascending: false })

  return (
    <div className="space-y-6">
      <AdminChallengesClient initialChallenges={challenges || []} />
    </div>
  )
}
