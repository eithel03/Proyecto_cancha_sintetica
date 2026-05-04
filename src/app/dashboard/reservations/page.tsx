import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReservationsClient from './ReservationsClient'

export default async function ReservationsPage() {
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

  return (
    <div className="space-y-6">
      <ReservationsClient initialReservations={reservations || []} />
    </div>
  )
}
