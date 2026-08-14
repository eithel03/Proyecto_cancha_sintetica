import { createClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin'
import SettingsClient from './SettingsClient'

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { business } = await getAdminSession(slug)
  const supabase = await createClient()

  const [{ data: hours }, { data: exceptions }] = await Promise.all([
    supabase.from('business_hours').select('*').eq('business_id', business.id),
    supabase.from('business_exceptions').select('*').eq('business_id', business.id).order('exception_date', { ascending: true }),
  ])

  return <div className="min-w-0 space-y-6 animate-in fade-in duration-300">
    <header className="space-y-2">
      <h2 className="text-3xl font-black tracking-tight text-slate-900">Configuración</h2>
      <p className="font-medium text-slate-500">Administra la información, horarios y apariencia de tu negocio.</p>
    </header>
    <SettingsClient business={business} initialHours={hours || []} initialExceptions={exceptions || []} />
  </div>
}
