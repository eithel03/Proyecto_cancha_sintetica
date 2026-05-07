import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata, Viewport } from 'next'

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
    description: `Reserva tu cancha en ${business.name} - La mejor experiencia deportiva.`,
    manifest: `/${slug}/manifest.webmanifest`,
    icons: {
      icon: business.logo_url || '/favicon.ico',
      apple: business.logo_url || '/favicon.ico',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: business.name,
    },
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
    .select('branding')
    .eq('slug', slug)
    .single()

  if (!business) {
    notFound()
  }

  const branding = business.branding || {}
  
  // Mapeo de colores del branding a variables CSS
  // Usamos los valores actuales como fallback
  const customStyles = {
    '--primary': branding.primary || 'oklch(0.627 0.194 149.214)',
    '--background': branding.background || 'oklch(0.13 0.02 260)',
    '--foreground': branding.text || 'oklch(0.985 0 0)',
    '--card': branding.card_bg || 'oklch(0.16 0.02 260)',
    '--card-foreground': branding.text || 'oklch(0.985 0 0)',
    '--popover': branding.card_bg || 'oklch(0.16 0.02 260)',
    '--popover-foreground': branding.text || 'oklch(0.985 0 0)',
    '--border': `${branding.text}20` || 'oklch(0.25 0.03 260)',
    '--ring': branding.primary || 'oklch(0.627 0.194 149.214)',
  } as React.CSSProperties

  return (
    <div style={customStyles} className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {children}
    </div>
  )
}
