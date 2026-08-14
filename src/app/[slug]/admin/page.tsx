import { createClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin'
import { DashboardStats } from './DashboardStats'

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { business } = await getAdminSession(slug)
  const supabase = await createClient()

  const today = getDateInTimeZone(new Date(), 'America/Costa_Rica')
  const ninetyDaysAgo = getDateInTimeZone(new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000), 'America/Costa_Rica')

  const [{ data: recentReservations }, { data: recentChallenges }] = await Promise.all([
    supabase
      .from('reservations')
      .select(`
        id,
        status,
        reservation_date,
        start_time,
        end_time,
        customer_name,
        created_at,
        courts ( name, description )
      `)
      .eq('business_id', business.id)
      .gte('reservation_date', ninetyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('challenges')
      .select(`
        id,
        status,
        challenge_date,
        challenge_time,
        customer_name,
        notes,
        created_at,
        courts ( name, description ),
        creator:creator_id ( full_name ),
        opponent:opponent_id ( full_name )
      `)
      .eq('business_id', business.id)
      .gte('challenge_date', ninetyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <DashboardStats
        reservations={recentReservations || []}
        challenges={recentChallenges || []}
        businessName={business.name}
        today={today}
      />
    </div>
  )
}

function getDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}
