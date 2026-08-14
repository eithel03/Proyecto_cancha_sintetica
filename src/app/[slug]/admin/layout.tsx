import { Metadata, Viewport } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAdminSession, getBusinessBySlug } from '@/lib/admin'
import DashboardClientLayout from './DashboardClientLayout'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)

  return {
    themeColor: business?.branding?.primary || '#10b981',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)

  if (!business) return { title: 'Admin - SaaSintética' }

  return {
    title: {
      default: `${business.name} | Admin`,
      template: `%s | ${business.name} Admin`
    },
    // manifest: `/${slug}/admin/manifest.webmanifest`,
    icons: {
      icon: business.logo_url || '/favicon.ico',
      apple: business.logo_url || '/favicon.ico',
    },
  }
}

export default async function Layout({ 
  children,
  params
}: { 
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { user, business } = await getAdminSession(slug)
  const supabase = await createClient()

  const today = getDateInTimeZone(new Date(), 'America/Costa_Rica')

  const [
    { data: profile },
    { count: pendingReservations },
    { count: pendingChallenges },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'pending')
      .gte('reservation_date', today),
    supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .in('status', ['open', 'accepted']),
  ])

  if (business && business.is_active === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-center">
        <div className="bg-red-500/10 p-6 rounded-full mb-6 animate-pulse">
          <ShieldAlert className="h-16 w-12 text-red-500" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">Acceso Restringido</h1>
        <div className="max-w-md space-y-4">
          <p className="text-zinc-400 font-medium">
            Lo sentimos, la cuenta de <span className="text-white font-bold">{business.name}</span> ha sido suspendida temporalmente por la administración central.
          </p>
          <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5 text-sm text-zinc-500">
            Si crees que esto es un error o deseas reactivar tu servicio, por favor contacta al equipo de soporte de SaaSintética.
          </div>
          <div className="pt-4">
            <Link href="/login">
              <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl py-6 font-bold uppercase tracking-widest text-[10px]">
                Volver al Inicio de Sesión
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const profileName = profile?.full_name?.trim() || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
  const metadataName =
    user.user_metadata?.full_name?.trim() ||
    user.user_metadata?.name?.trim() ||
    [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ').trim()
  const userName = profileName || metadataName || 'Sin nombre registrado'

  return (
    <div className="dark admin-theme">
      <DashboardClientLayout
        businessName={business.name}
        userName={userName}
        pendingReservationsCount={pendingReservations || 0}
        pendingChallengesCount={pendingChallenges || 0}
      >
        {children}
      </DashboardClientLayout>
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
