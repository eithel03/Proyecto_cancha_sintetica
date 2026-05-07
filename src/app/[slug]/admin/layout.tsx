import { Metadata, Viewport } from 'next'
import { createClient } from '@/lib/supabase/server'
import DashboardClientLayout from './DashboardClientLayout'

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
    manifest: `/${slug}/admin/manifest.webmanifest`,
    icons: {
      icon: business.logo_url || '/favicon.ico',
      apple: business.logo_url || '/favicon.ico',
    },
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>
}
