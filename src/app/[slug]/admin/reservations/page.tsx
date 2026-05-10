import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReservationsClient from './ReservationsClient'

export default async function ReservationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/onboarding')

  // Fetch reservations
  const { data: reservations } = await supabase
    .from('reservations')
    .select(`
      *,
      courts ( name ),
      customer:customer_id ( phone )
    `)
    .eq('business_id', business.id)
    .order('reservation_date', { ascending: false })
    .order('start_time', { ascending: true })

  // Fetch tournament matches
  const { data: matches } = await supabase
    .from('tournament_matches')
    .select(`
      *,
      courts ( name ),
      home:home_team_id ( name ),
      away:away_team_id ( name )
    `)
    .eq('business_id', business.id)
    .order('match_date', { ascending: false })

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

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)

  const { data: hours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', business.id)

  return (
    <div className="space-y-6">
      <ReservationsClient 
        initialReservations={allEvents} 
        courts={courts || []} 
        businessId={business.id}
        businessHours={hours || []}
        slug={slug}
      />
    </div>
  )
}
