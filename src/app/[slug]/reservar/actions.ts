'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { notifyUserChallengeConfirmed } from '@/lib/notifications'

export async function checkAvailability(courtId: string, date: string) {
  const supabase = createAdminClient()
  // 1. Obtener Reservas vigentes (Pending y Confirmed, sin importar RLS)
  const { data: reservations, error: resError } = await supabase
    .from('reservations')
    .select('start_time, end_time, status, notes')
    .eq('court_id', courtId)
    .eq('reservation_date', date)
    .in('status', ['pending', 'confirmed'])

  if (resError) {
    console.error('Error fetching availability (reservations):', resError)
    return { error: resError.message }
  }

  // 2. Obtener Retos (Abiertos, Aceptados y Confirmados)
  const { data: challenges, error: chalError } = await supabase
    .from('challenges')
    .select('id, challenge_time, status, notes, gender')
    .eq('court_id', courtId)
    .eq('challenge_date', date)
    .in('status', ['open', 'accepted', 'confirmed'])

  if (chalError) {
    console.error('Error fetching availability (challenges):', chalError)
  }

  // 3. Obtener Partidos de Torneo con sus equipos y género
  const { data: court } = await supabase.from('courts').select('business_id').eq('id', courtId).single()

  const { data: allMatches, error: matchError } = await supabase
    .from('tournament_matches')
    .select(`
      id, 
      match_time, 
      match_date,
      status,
      gender,
      court_id,
      business_id,
      home:home_team_id ( name, logo_url ),
      away:away_team_id ( name, logo_url )
    `)
    .eq('match_date', date)
    .eq('business_id', court?.business_id || '')
    .in('status', ['scheduled', 'live', 'halftime'])

  if (matchError) {
    console.error('Error fetching availability (matches):', matchError)
  }

  const matches = (allMatches || []).filter(m => m.court_id === courtId || m.court_id === null)

  const blocked = [
    ...matches.map(m => {
      const parts = m.match_time.split(':')
      const h = parts[0].padStart(2, '0')
      const min = parts[1] || '00'
      const startNormalized = `${h}:${min}:00`
      const endNormalized = `${(parseInt(h) + 1).toString().padStart(2, '0')}:${min}:00`
      
      return {
        id: m.id,
        start_time: startNormalized,
        end_time: endNormalized,
        type: (m as any).gender === 'femenino' ? 'tournament_female' : 'tournament_male',
        status: m.status,
        home: (m as any).home,
        away: (m as any).away
      }
    }),
    ...(reservations || []).map(r => {
      const startParts = r.start_time.split(':')
      const endParts = r.end_time.split(':')
      const startNormalized = `${startParts[0].padStart(2, '0')}:${startParts[1] || '00'}:00`
      const endNormalized = `${endParts[0].padStart(2, '0')}:${endParts[1] || '00'}:00`
      
      return {
        start_time: startNormalized,
        end_time: endNormalized,
        type: (r.notes && r.notes.includes('Reto')) ? 'confirmed_challenge' : 'reservation',
        status: r.status
      }
    }),
    ...(challenges || []).map(c => {
      const parts = c.challenge_time.split(':')
      const h = parts[0].padStart(2, '0')
      const m = parts[1] || '00'
      const startNormalized = `${h}:${m}:00`
      const endNormalized = `${(parseInt(h) + 1).toString().padStart(2, '0')}:${m}:00`
      
      return {
        id: c.id,
        start_time: startNormalized,
        end_time: endNormalized,
        type: c.status === 'confirmed' ? 'confirmed_challenge' : (c.status === 'open' ? 'open_challenge' : 'accepted_challenge'),
        status: c.status,
        gender: c.gender,
      }
    })
  ]

  return blocked
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
  const startTime = start + ':00'
  const endTime = end + ':00'

  // 1. Verificar choques con otros partidos de torneo o retos confirmados
  const { data: conflictingMatches } = await supabase
    .from('tournament_matches')
    .select('id')
    .eq('match_date', date)
    .in('status', ['scheduled', 'live', 'halftime'])
    .or(`court_id.eq.${courtId},court_id.is.null`)
    .eq('business_id', businessId)
    .filter('match_time', 'eq', start)

  if (conflictingMatches && conflictingMatches.length > 0) {
    return { error: 'Lo sentimos, este horario ya está reservado para un partido de torneo.' }
  }

  const { error } = await supabase
    .from('reservations')
    .insert({
      business_id: businessId,
      court_id: courtId,
      customer_id: profile.id,
      customer_name: profile.full_name || 'Sin nombre',
      customer_phone: profile.phone || 'Sin teléfono',
      customer_email: user.email,
      reservation_date: date,
      start_time: start + ':00',
      end_time: end + ':00',
      status: 'pending'
    })

  if (error) {
    if (error.message.includes('ya está reservada')) {
      return { error: 'Lo sentimos, este horario acaba de ser ocupado. Por favor, elige otro.' }
    }
    return { error: 'Error al procesar reserva: ' + error.message }
  }

  // Notificar al administrador
  const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single()
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


export async function acceptChallenge(challengeId: string) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión para aceptar un reto.' }

  const supabase = createAdminClient()

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*, creator:profiles!challenges_creator_id_fkey(full_name)')
    .eq('id', challengeId)
    .single()

  if (!challenge) return { error: 'Reto no encontrado.' }
  if (challenge.creator_id === user.id) return { error: 'No puedes aceptar tu propio reto.' }
  if (challenge.status !== 'open') return { error: 'Este reto ya no está disponible.' }

  const { error: updateError } = await supabase
    .from('challenges')
    .update({
      opponent_id: user.id,
      status: 'confirmed',
      accepted_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString()
    })
    .eq('id', challengeId)

  if (updateError) return { error: 'Error al aceptar reto: ' + updateError.message }

  const startT = challenge.challenge_time
  const [h, m] = startT.split(':')
  const endT = `${(parseInt(h) + 1).toString().padStart(2, '0')}:${m}:00`

  const { error: resError } = await supabase
    .from('reservations')
    .insert({
      business_id: challenge.business_id,
      court_id: challenge.court_id,
      customer_id: challenge.creator_id,
      customer_name: challenge.customer_name || 'Reto Confirmado',
      customer_phone: challenge.customer_phone || '',
      reservation_date: challenge.challenge_date,
      start_time: startT,
      end_time: endT,
      status: 'confirmed',
      notes: `Reto confirmado. Mensaje original: ${challenge.notes}`
    })

  if (resError) {
    if (resError.message.includes('ya está reservada')) {
      return { error: 'No se puede confirmar: La cancha ya tiene una reserva oficial en ese horario.' }
    }
    return { error: 'Error al crear la reserva: ' + resError.message }
  }

  const { data: opponent } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  await notifyUserChallengeConfirmed(
    challenge.creator?.full_name || 'Jugador',
    opponent?.full_name || 'Oponente',
    challenge.challenge_date,
    challenge.challenge_time.substring(0, 5)
  )

  revalidatePath('/[slug]/reservar')
  revalidatePath('/[slug]/retos')
  return { success: true }
}
