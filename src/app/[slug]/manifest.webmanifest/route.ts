import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()
  
  const { data: business } = await supabase
    .from('businesses')
    .select('name, logo_url, branding')
    .eq('slug', slug)
    .single()

  if (!business) {
    return new Response('Not found', { status: 404 })
  }

  const name = business.name || 'Sintética'
  const logo = business.logo_url || '/favicon.ico'
  const themeColor = business.branding?.primary || '#10b981'

  return NextResponse.json({
    name: name,
    short_name: name,
    description: `Reserva tu cancha en ${name}`,
    start_url: `/${slug}`,
    display: 'standalone',
    background_color: business.branding?.background || '#09090b',
    theme_color: themeColor,
    icons: [
      {
        src: logo,
        sizes: 'any',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  })
}
