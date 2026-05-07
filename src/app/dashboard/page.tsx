import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar el negocio del dueño para redirigir al dashboard correcto
  const { data: business } = await supabase
    .from('businesses')
    .select('slug')
    .eq('owner_id', user.id)
    .single()

  if (business) {
    redirect(`/${business.slug}/admin`)
  }

  // Si no tiene negocio, intentar ver si es super_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'super_admin') {
    redirect('/admin/dashboard')
  }

  redirect('/')
}
