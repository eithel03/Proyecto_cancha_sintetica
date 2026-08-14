import { createClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin'
import AdminChallengesClient from './AdminChallengesClient'

export default async function AdminChallengesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { business } = await getAdminSession(slug)
  const supabase = await createClient()

  const [{ data: challenges }, { data: courts }] = await Promise.all([
    supabase
      .from('challenges')
      .select(`
        *,
        courts ( id, name, description ),
        creator:creator_id ( full_name, phone ),
        opponent:opponent_id ( full_name, phone )
      `)
      .eq('business_id', business.id)
      .in('status', ['open', 'accepted', 'confirmed', 'cancelled', 'completed', 'expired'])
      .order('challenge_date', { ascending: true })
      .order('challenge_time', { ascending: true }),
    supabase
      .from('courts')
      .select('id, name, description, is_active')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <div className="min-w-0">
      <AdminChallengesClient initialChallenges={challenges || []} courts={courts || []} businessId={business.id} slug={slug} />
    </div>
  )
}
