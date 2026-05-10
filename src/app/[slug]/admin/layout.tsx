import { Metadata, Viewport } from 'next'
import { createClient } from '@/lib/supabase/server'
import DashboardClientLayout from './DashboardClientLayout'
import { Activity, ShieldAlert } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params
  const supabase = await createClient()
  
  const { data: business } = await supabase
    .from('businesses')
    .select('branding')
    .eq('slug', slug)
    .single()

  return {
    themeColor: business?.branding?.primary || '#10b981',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('name, logo_url')
    .eq('slug', slug)
    .single()

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('is_active, name')
    .eq('slug', slug)
    .single()

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

  return <DashboardClientLayout>{children}</DashboardClientLayout>
}
