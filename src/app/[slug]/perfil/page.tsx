import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Flag, CalendarCheck, Swords, User } from 'lucide-react'
import ProfileClient from './ProfileClient'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Obtener Negocio
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  // 2. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.id) {
    redirect(`/cliente/login?redirectTo=/${slug}/perfil`)
  }

  // 3. Obtener Perfil (Asegurar que es el del usuario logueado)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/cliente/login')

  // 4. Obtener Reservas (ESTRICTO: Solo las del usuario actual y que no estén ocultas)
  // Nota: Si aún no corres el SQL, esta consulta podría dar error. 
  // Pero es necesario para que el historial funcione.
  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, courts(name)')
    .eq('customer_id', user.id)
    .eq('business_id', business.id)
    .eq('hidden_by_customer', false) // Filtro de historial
    .order('reservation_date', { ascending: false })

  // 5. Obtener Retos (ESTRICTO: Donde el usuario sea creador o oponente)
  const { data: challenges } = await supabase
    .from('challenges')
    .select('*, courts(name)')
    .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq('business_id', business.id)
    .eq('hidden_by_customer', false) // Filtro de historial
    .order('challenge_date', { ascending: false })

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      {/* Header */}
      <header className="relative bg-zinc-950/80 border-b border-white/10 p-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10" />
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent drop-shadow-md">
          Mi Perfil
        </h1>
        <p className="text-muted-foreground mt-2 font-medium tracking-wide uppercase text-xs">{business.name}</p>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Navigation Tabs */}
        <div className="flex justify-center border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
          <Link href={`/${business.slug}`} className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2 whitespace-nowrap">
            <CalendarCheck className="w-4 h-4" /> Reservas
          </Link>
          <Link href={`/${business.slug}/torneo`} className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2 whitespace-nowrap">
            <Flag className="w-4 h-4" /> Torneo
          </Link>
          <Link href={`/${business.slug}/retos`} className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2 whitespace-nowrap">
            <Swords className="w-4 h-4" /> Retos
          </Link>
          <div className="px-6 py-4 border-b-2 border-primary text-primary font-bold flex items-center gap-2 cursor-default whitespace-nowrap">
            <User className="w-4 h-4" /> Mis Reservas
          </div>
        </div>

        <ProfileClient 
          initialProfile={profile} 
          initialReservations={reservations || []} 
          initialChallenges={challenges || []}
          businessSlug={business.slug}
        />
      </main>

      <footer className="text-center py-8 text-sm text-muted-foreground border-t border-white/10 bg-zinc-950 mt-auto">
        Potenciado por <Link href="/" className="text-primary font-medium hover:underline">SaaSintética</Link>
      </footer>
    </div>
  )
}
