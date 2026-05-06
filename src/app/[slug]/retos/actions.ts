'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyAdminNewReservation, notifyUserChallengeConfirmed } from '@/lib/notifications'

export async function createChallenge(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión para publicar un reto.' }

  const businessId = formData.get('business_id') as string
  const courtId = formData.get('court_id') as string
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const notes = formData.get('notes') as string

  // 1. VALIDACIÓN PREVENTIVA: ¿Está el horario libre?
  const { data: existingReservations } = await supabase
    .from('reservations')
    .select('id')
    .eq('court_id', courtId)
    .eq('reservation_date', date)
    .eq('start_time', time)
    .in('status', ['pending', 'confirmed'])
    .single()

  if (existingReservations) {
    return { error: 'Este horario ya tiene una reserva oficial. Elige otro.' }
  }

  const { data: existingChallenges } = await supabase
    .from('challenges')
    .select('id')
    .eq('court_id', courtId)
    .eq('challenge_date', date)
    .eq('challenge_time', time)
    .in('status', ['open', 'accepted'])
    .single()

  if (existingChallenges) {
    return { error: 'Ya existe un reto publicado para este mismo horario y cancha.' }
  }

  // 2. Obtener perfil para el nombre y teléfono
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single()

  // 3. Insertar reto
  const { error } = await supabase
    .from('challenges')
    .insert({
      business_id: businessId,
      court_id: courtId,
      creator_id: user.id,
      customer_name: profile?.full_name || 'Invitado',
      customer_phone: profile?.phone || 'Sin teléfono',
      challenge_date: date,
      challenge_time: time,
      notes,
      status: 'open'
    })

  if (error) return { error: 'Error al publicar reto: ' + error.message }

  // Notificar al administrador
  const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single()
  await notifyAdminNewReservation(biz?.name || 'Tu local', profile?.full_name || 'Un cliente', date, time)

  revalidatePath('/[slug]/retos', 'page')
  revalidatePath('/[slug]/reservar', 'page')
  return { success: true }
}

export async function acceptChallenge(challengeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión para aceptar un reto.' }

  const { data: challenge } = await supabase
    .from('challenges')
    .select('creator_id, status')
    .eq('id', challengeId)
    .single()

  if (!challenge) return { error: 'Reto no encontrado.' }
  if (challenge.creator_id === user.id) return { error: 'No puedes aceptar tu propio reto.' }
  if (challenge.status !== 'open') return { error: 'Este reto ya no está disponible.' }

  const { error } = await supabase
    .from('challenges')
    .update({
      opponent_id: user.id,
      status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', challengeId)
    .eq('status', 'open')

  if (error) return { error: 'Error al aceptar reto: ' + error.message }

  revalidatePath('/[slug]/retos', 'page')
  revalidatePath('/dashboard/retos', 'page')
  revalidatePath('/[slug]/reservar', 'page')
  return { success: true }
}

export async function cancelChallenge(challengeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const { error } = await supabase
    .from('challenges')
    .update({ status: 'cancelled' })
    .eq('id', challengeId)

  if (error) return { error: 'Error al cancelar reto: ' + error.message }

  revalidatePath('/[slug]/retos', 'page')
  revalidatePath('/dashboard/retos', 'page')
  revalidatePath('/[slug]/reservar', 'page')
  return { success: true }
}

export async function confirmChallenge(challengeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  // 1. Obtener datos del reto
  const { data: challenge, error: fetchError } = await supabase
    .from('challenges')
    .select('*, businesses(name), creator:profiles!challenges_creator_id_fkey(full_name), opponent:profiles!challenges_opponent_id_fkey(full_name)')
    .eq('id', challengeId)
    .single()

  if (fetchError || !challenge) return { error: 'Reto no encontrado.' }

  // 2. Intentar crear la reserva oficial
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

  // 3. Actualizar estado del reto
  const { error: updateError } = await supabase
    .from('challenges')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    })
    .eq('id', challengeId)

  if (updateError) {
    return { error: 'Reserva creada pero no se pudo actualizar el estado del reto: ' + updateError.message }
  }

  // Notificar a ambos jugadores
  await notifyUserChallengeConfirmed(
    challenge.creator?.full_name || 'Jugador', 
    challenge.opponent?.full_name || 'Oponente', 
    challenge.challenge_date, 
    challenge.challenge_time.substring(0, 5)
  )

  revalidatePath('/[slug]/retos', 'page')
  revalidatePath('/dashboard/retos', 'page')
  revalidatePath('/[slug]/reservar', 'page')
  return { success: true }
}
