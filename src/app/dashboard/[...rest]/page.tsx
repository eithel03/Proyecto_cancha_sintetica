import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardCatchAll({ params }: { params: Promise<{ rest: string[] }> }) {
  const { rest } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('slug')
    .eq('owner_id', user.id)
    .single()

  if (business) {
    const path = rest.join('/')
    redirect(`/${business.slug}/admin/${path}`)
  }

  redirect('/dashboard')
}
