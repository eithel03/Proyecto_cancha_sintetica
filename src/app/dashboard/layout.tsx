import { Metadata, Viewport } from 'next'
import { createClient } from '@/lib/supabase/server'
import DashboardClientLayout from './DashboardClientLayout'

export async function generateViewport(): Promise<Viewport> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { themeColor: '#10b981' }

  const { data: business } = await supabase
    .from('businesses')
    .select('branding')
    .eq('owner_id', user.id)
    .single()

  return {
    themeColor: business?.branding?.primary || '#10b981',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { title: 'Admin - SaaSintética' }

  const { data: business } = await supabase
    .from('businesses')
    .select('name, logo_url')
    .eq('owner_id', user.id)
    .single()

  if (!business) return { title: 'Admin - SaaSintética' }

  return {
    title: {
      default: `${business.name} | Admin`,
      template: `%s | ${business.name} Admin`
    },
    manifest: '/dashboard/manifest.webmanifest',
    icons: {
      icon: business.logo_url || '/favicon.ico',
      apple: business.logo_url || '/favicon.ico',
    },
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>
}
