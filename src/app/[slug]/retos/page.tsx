import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Phone, Flag, CalendarCheck, Swords, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ChallengesClient from './ChallengesClient'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function ChallengesPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  // Auth Check
  const { data: { user } } = await supabase.auth.getUser()

  // Obtener retos relevantes para este negocio (open, accepted, confirmed)
  // Traer retos que:
  // 1. Estén abiertos (para que cualquiera los acepte)
  // 2. O que pertenezcan al usuario actual (aunque estén aceptados/confirmados)
  const query = supabase
    .from('challenges')
    .select('*, courts(name)')
    .eq('business_id', business.id)
    .eq('status', 'open')

  const { data: challenges } = await query.order('challenge_date', { ascending: true })

  // Obtener canchas para el modal de creación
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      {/* Header Público */}
      <header className="relative bg-zinc-950/80 border-b border-white/10 p-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10" />
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent drop-shadow-md uppercase tracking-tighter">
          Retos y Desafíos
        </h1>
        <p className="text-muted-foreground mt-2 font-medium tracking-wide uppercase text-xs">{business.name}</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Navigation Tabs */}
        <div className="flex justify-center border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
          <Link href={`/${business.slug}`} className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2 whitespace-nowrap">
            <CalendarCheck className="w-4 h-4" /> Reservas
          </Link>
          <Link href={`/${business.slug}/torneo`} className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2 whitespace-nowrap">
            <Flag className="w-4 h-4" /> Torneo
          </Link>
          <div className="px-6 py-4 border-b-2 border-primary text-primary font-bold flex items-center gap-2 cursor-default whitespace-nowrap">
            <Swords className="w-4 h-4" /> Retos
          </div>
          <Link href={`/${business.slug}/perfil`} className="px-6 py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2 whitespace-nowrap">
            <User className="w-4 h-4" /> Mis Reservas
          </Link>
        </div>

        {!user && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between gap-4">
            <p className="text-sm text-amber-500 font-medium">Inicia sesión para publicar tus propios retos y aceptar desafíos.</p>
            <Link href={`/cliente/login?redirectTo=/${business.slug}/retos`}>
              <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10">Iniciar Sesión</Button>
            </Link>
          </div>
        )}

        <ChallengesClient 
          initialChallenges={challenges || []} 
          businessId={business.id}
          userId={user?.id}
          courts={courts || []}
        />
      </main>

      <footer className="text-center py-8 text-sm text-muted-foreground border-t border-white/10 bg-zinc-950">
        Potenciado por <Link href="/" className="text-primary font-medium hover:underline">SaaSintética</Link>
      </footer>
    </div>
  )
}
