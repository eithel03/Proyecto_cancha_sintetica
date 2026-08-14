import { createClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin'
import ReservationsClient from './ReservationsClient'

export default async function ReservationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { business } = await getAdminSession(slug)
  const supabase = await createClient()

  const twelveMonthsAgo = getDateInTimeZone(new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000), 'America/Costa_Rica')

  const [{ data: reservations }, { data: matches }, { data: allCourts }, { data: hours }] = await Promise.all([
    // Fetch reservations
    supabase
      .from('reservations')
      .select(`
        *,
        courts ( name, description ),
        customer:customer_id ( phone )
      `)
      .eq('business_id', business.id)
      .gte('reservation_date', twelveMonthsAgo)
      .order('reservation_date', { ascending: false })
      .order('start_time', { ascending: true })
      .limit(1500),

    // Fetch tournament matches
    supabase
      .from('tournament_matches')
      .select(`
        *,
        courts ( name, description ),
        home:home_team_id ( name ),
        away:away_team_id ( name )
      `)
      .eq('business_id', business.id)
      .gte('match_date', twelveMonthsAgo)
      .order('match_date', { ascending: false })
      .limit(500),

    // Fetch all courts (including inactive) for display purposes
    supabase
      .from('courts')
      .select('*')
      .eq('business_id', business.id),

    // Fetch business hours
    supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', business.id),
  ])

  // Format matches to look like reservations for the client
  const formattedMatches = (matches || []).map(m => ({
    id: m.id,
    customer_name: `TORNEO: ${m.home?.name} vs ${m.away?.name}`,
    customer_phone: 'N/A',
    reservation_date: m.match_date,
    start_time: m.match_time,
    end_time: `${(parseInt(m.match_time.split(':')[0]) + 1).toString().padStart(2, '0')}:${m.match_time.split(':')[1] || '00'}:00`,
    status: m.status === 'scheduled' ? 'confirmed' : m.status, // Treat scheduled matches as confirmed for the list
    courts: m.courts,
    is_tournament: true
  }))

  const allEvents = [...(reservations || []), ...formattedMatches].sort((a, b) => {
    const dateTimeA = new Date(`${a.reservation_date}T${a.start_time}`).getTime()
    const dateTimeB = new Date(`${b.reservation_date}T${b.start_time}`).getTime()
    return dateTimeB - dateTimeA // Recientes primero
  })

  const courts = (allCourts || []).filter((court) => court.is_active === true)

  return (
    <div className="space-y-6">
      <ReservationsClient 
        initialReservations={allEvents} 
        courts={courts}
        allCourts={allCourts || []}
        businessId={business.id}
        businessHours={hours || []}
        slug={slug}
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
