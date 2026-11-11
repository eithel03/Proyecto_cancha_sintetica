import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata, Viewport } from 'next'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { SuspensionCheck } from '@/components/SuspensionCheck'

export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: business } = await supabase
    .from('businesses_public')
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
    .from('businesses_public')
    .select('name, logo_url, branding')
    .eq('slug', slug)
    .single()

  if (!business) return {}

  return {
    title: {
      default: business.name,
      template: `%s | ${business.name}`
    },
    manifest: `/${slug}/manifest.webmanifest?v=${encodeURIComponent(business.logo_url || '1')}`,
    icons: {
      icon: business.logo_url || '/favicon.ico',
      apple: business.logo_url || '/favicon.ico',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: business.name,
    },
    other: {
      'apple-mobile-web-app-capable': 'yes',
      'mobile-web-app-capable': 'yes',
    }
  }
}

export default async function SlugLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses_public')
    .select('name, logo_url, branding, is_active')
    .eq('slug', slug)
    .single()

  if (!business) {
    notFound()
  }

  const branding = business.branding || {}
  
  // Solo se hereda el color de marca. Fondo, texto, superficies y bordes
  // provienen de los tokens del tema activo (claro, oscuro o sistema) para
  // que el portal respete la preferencia del usuario sin cambiar la geometría.
  const brandPrimary = branding.primary || '#2f9565'
  const customStyles = {
    '--primary': brandPrimary,
    '--ring': brandPrimary,
    '--primary-green': brandPrimary,
    '--brand-green': brandPrimary,
  } as React.CSSProperties

  return (
    <SuspensionCheck isActive={business.is_active ?? true} businessName={business.name}>
      <div style={customStyles} className="min-h-screen bg-background text-foreground selection:bg-primary/30 pb-20 md:pb-0">
        {children}
        <PWAInstallPrompt 
          businessName={business.name} 
          businessLogo={business.logo_url || ''} 
          slug={slug} 
        />
      </div>
    </SuspensionCheck>
  )
}
