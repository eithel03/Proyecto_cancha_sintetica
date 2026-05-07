import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name, logo_url, branding')
    .eq('slug', slug)
    .single()

  if (!business) {
    return new Response('Business not found', { status: 404 })
  }

  const name = `${business.name} Admin`
  const logo = business.logo_url || '/favicon.ico'

  return NextResponse.json({
    id: `/${slug}/admin`,
    name: name,
    short_name: name,
    description: `Panel de control de ${business.name}`,
    start_url: `/${slug}/admin`,
    scope: `/${slug}/admin`,
    display: 'standalone',
    background_color: business.branding?.background || '#09090b',
    theme_color: business.branding?.primary || '#10b981',
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
