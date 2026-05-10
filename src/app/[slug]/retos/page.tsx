import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Phone, Flag, CalendarCheck, Swords, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ChallengesClient from './ChallengesClient'
import { PublicNav } from '@/components/PublicNav'

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

  // Obtener horarios para las opciones de tiempo
  const { data: businessHours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', business.id)

  const { data: exceptions } = await supabase
    .from('business_exceptions')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_closed', true)

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <PublicNav slug={business.slug} businessName={business.name} />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
          businessHours={businessHours || []}
          exceptions={exceptions || []}
        />
      </main>

      <footer className="text-center py-8 text-sm text-muted-foreground border-t border-white/10 bg-zinc-950">
        Potenciado por <Link href="/" className="text-primary font-medium hover:underline">SaaSintética</Link>
      </footer>
    </div>
  )
}
