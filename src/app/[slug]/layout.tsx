import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata, Viewport } from 'next'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { SuspensionCheck } from '@/components/SuspensionCheck'

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
    .from('businesses')
    .select('name, logo_url, branding, is_active')
    .eq('slug', slug)
    .single()

  if (!business) {
    notFound()
  }

  const branding = business.branding || {}
  
  // Tema claro forzado: solo se hereda el color primario del branding.
  // El fondo, texto y superficies siempre usan los tokens claros del tema
  // para garantizar legibilidad y evitar fondos oscuros.
  const customStyles = {
    '--primary': branding.primary || '#2f9565',
    '--ring': branding.primary || '#2f9565',
    '--background': '#f8f5ed',
    '--foreground': '#071b21',
    '--card': '#ffffff',
    '--card-foreground': '#071b21',
    '--popover': '#ffffff',
    '--popover-foreground': '#071b21',
    '--border': '#e6e1d5',
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
