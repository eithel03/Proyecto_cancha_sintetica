import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'Explorar - SaaSintética',
    short_name: 'Explorar',
    description: 'Encuentra las mejores canchas sintéticas cerca de ti',
    start_url: '/explorar',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#10b981',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  })
}
