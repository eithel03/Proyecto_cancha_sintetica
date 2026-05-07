import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'Admin - SaaSintética',
    short_name: 'SaaS Admin',
    description: 'Panel de administración de canchas sintéticas',
    start_url: '/login',
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
