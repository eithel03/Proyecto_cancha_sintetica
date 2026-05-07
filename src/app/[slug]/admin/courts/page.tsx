import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CourtsClient from './CourtsClient'

export default async function CourtsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/onboarding')

  // Fetch courts
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Tus Canchas</h2>
        <p className="text-muted-foreground mt-2">
          Administra las canchas disponibles para reservar.
        </p>
      </div>

      <CourtsClient initialCourts={courts || []} businessId={business.id} />
    </div>
  )
}
