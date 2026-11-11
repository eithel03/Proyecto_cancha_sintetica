'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'


export async function checkAvailability(courtId: string, date: string) {
  if (!/^[0-9a-fA-F-]{36}$/.test(courtId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'La cancha o la fecha no son válidas.' }
  }

  const supabase = await createClient()
  const { data: court, error: courtError } = await supabase
    .from('courts')
    .select('business_id')
    .eq('id', courtId)
    .maybeSingle()

  if (courtError || !court) {
    return { error: 'No se encontró la cancha solicitada.' }
  }

  const [{ data: slots, error: slotsError }, { data: allMatches, error: matchError }] = await Promise.all([
    supabase.rpc('get_court_availability', { p_court_id: courtId, p_date: date }),
    supabase
      .from('tournament_matches')
      .select(`
        id,
        match_time,
        status,
        gender,
        court_id,
        home:home_team_id ( name, logo_url ),
        away:away_team_id ( name, logo_url )
      `)
      .eq('match_date', date)
      .eq('business_id', court.business_id)
      .in('status', ['scheduled', 'live', 'halftime']),
  ])

  if (slotsError) {
    return { error: 'No se pudo consultar la disponibilidad.' }
  }
  if (matchError) {
    console.error('Error fetching availability (matches):', matchError)
  }

  const matches = (allMatches || []).filter((match) => match.court_id === courtId || match.court_id === null)

  return [
    ...matches.map((match) => {
      const parts = match.match_time.split(':')
      const hour = parts[0].padStart(2, '0')
      const minute = parts[1] || '00'
      const startNormalized = `${hour}:${minute}:00`
      const endNormalized = `${(parseInt(hour) + 1).toString().padStart(2, '0')}:${minute}:00`

      return {
        id: match.id,
        start_time: startNormalized,
        end_time: endNormalized,
        type: match.gender === 'femenino' ? 'tournament_female' : 'tournament_male',
        status: match.status,
        home: match.home,
        away: match.away,
      }
    }),
    ...(slots || []).map((slot: {
      start_time: string
      end_time: string
      status: string
      kind: string
      gender: string | null
      reference_id: string | null
    }) => ({
      id: slot.reference_id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      type: slot.kind,
      status: slot.status,
      gender: slot.gender,
    })),
  ]
}

function mapReservationRpcError(message: string) {
  const known = [
    'Debes iniciar sesión',
    'cuenta de cliente',
    'horario seleccionado',
    'cancha seleccionada',
    'partido de torneo',
    'reto publicado',
    'ya está reservada',
  ]

  return known.some((fragment) => message.includes(fragment))
    ? message
    : 'No se pudo procesar la reserva. Intenta de nuevo.'
}

export async function createReservation(formData: FormData) {
  const supabase = await createClient()

  // Verify auth again
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión para reservar.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') {
    return { error: 'Debes iniciar sesión con una cuenta de cliente para reservar.' }
  }

  const businessId = formData.get('business_id') as string
  const courtId = formData.get('court_id') as string
  const date = formData.get('date') as string
  const timeSlot = formData.get('time_slot') as string // Formato "08:00-09:00"
  
  if (!businessId || !courtId || !date || !timeSlot) {
    return { error: 'Faltan datos obligatorios para la reserva.' }
  }

  const [start, end] = timeSlot.split('-')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end || '') || start >= end) {
    return { error: 'El horario seleccionado no es válido.' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'La fecha seleccionada no es válida.' }
  }

  const { data: court } = await supabase
    .from('courts')
    .select('id, business_id, is_active')
    .eq('id', courtId)
    .maybeSingle()

  if (!court || court.business_id !== businessId || !court.is_active) {
    return { error: 'La cancha seleccionada no pertenece a este negocio o no está disponible.' }
  }

  const { error } = await supabase.rpc('create_customer_reservation', {
    p_business_id: businessId,
    p_court_id: courtId,
    p_reservation_date: date,
    p_start_time: start,
    p_end_time: end,
    p_customer_name: profile.full_name || 'Sin nombre',
    p_customer_phone: profile.phone || 'Sin teléfono',
    p_customer_email: user.email ?? null,
  })

  if (error) {
    return { error: mapReservationRpcError(error.message) }
  }

  // Notificar al administrador
  const { data: biz } = await supabase.from('businesses_public').select('name').eq('id', businessId).maybeSingle()
  import('@/lib/notifications').then(n => n.notifyAdminNewReservation(
    biz?.name || 'Tu local',
    profile.full_name || 'Un cliente',
    date,
    start
  ))

  revalidatePath('/[slug]/reservar', 'page')
  revalidatePath('/[slug]/perfil', 'page')
  return { success: true }
}
