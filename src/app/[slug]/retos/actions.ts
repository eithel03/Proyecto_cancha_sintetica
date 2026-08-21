'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  const gender = formData.get('gender') as string
  const menCount = formData.get('men_count') ? parseInt(formData.get('men_count') as string) : null
  const womenCount = formData.get('women_count') ? parseInt(formData.get('women_count') as string) : null

  // 1. VALIDACIÓN PREVENTIVA: ¿Está el intervalo de 59 minutos libre?
  const [ch, cm] = (time || '00:00').split(':')
  const startT = `${ch.padStart(2, '0')}:${cm || '00'}`
  const endT = `${(parseInt(ch) + 1).toString().padStart(2, '0')}:${cm || '00'}`

  const { data: overlappingReservations } = await supabase
    .from('reservations')
    .select('start_time, end_time')
    .eq('court_id', courtId)
    .eq('reservation_date', date)
    .in('status', ['pending', 'confirmed'])

  const overlapsReservation = (overlappingReservations || []).some(r => {
    const resStart = r.start_time.substring(0, 5)
    const resEnd = r.end_time.substring(0, 5)
    return startT < resEnd && endT > resStart
  })

  if (overlapsReservation) {
    return { error: 'Este horario se cruza con una reserva oficial. Elige otro.' }
  }

  const { data: overlappingChallenges } = await supabase
    .from('challenges')
    .select('challenge_time')
    .eq('court_id', courtId)
    .eq('challenge_date', date)
    .in('status', ['open', 'accepted', 'confirmed'])

  const overlapsChallenge = (overlappingChallenges || []).some(c => {
    const cStart = c.challenge_time.substring(0, 5)
    const cEnd = `${(parseInt(cStart.split(':')[0]) + 1).toString().padStart(2, '0')}:${cStart.split(':')[1]}`
    return startT < cEnd && endT > cStart
  })

  if (overlapsChallenge) {
    return { error: 'Este horario se cruza con otro reto publicado. Elige otro.' }
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
      gender,
      men_count: menCount,
      women_count: womenCount,
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

  revalidatePath('/[slug]/retos', 'page')
  revalidatePath('/[slug]/reservar', 'page')
  return { success: true }
}

export async function cancelChallenge(challengeId: string) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('challenges')
    .update({ status: 'cancelled' })
    .eq('id', challengeId)

  if (error) return { error: 'Error al cancelar reto: ' + error.message }

  revalidatePath('/[slug]/retos', 'page')
  revalidatePath('/[slug]/reservar', 'page')
  return { success: true }
}

export async function confirmChallenge(challengeId: string) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const supabase = createAdminClient()

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

export async function deleteChallenge(challengeId: string) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const supabase = createAdminClient()

  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, status, challenge_date')
    .eq('id', challengeId)
    .single()

  if (!challenge) return { error: 'Reto no encontrado.' }

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Costa_Rica' })
  const isCancelled = challenge.status === 'cancelled'
  const isPastConfirmed = challenge.status === 'confirmed' && challenge.challenge_date < today

  if (!isCancelled && !isPastConfirmed) {
    return { error: 'Solo se pueden eliminar retos cancelados o confirmados con fecha pasada.' }
  }

  const { error } = await supabase
    .from('challenges')
    .delete()
    .eq('id', challengeId)

  if (error) return { error: 'Error al eliminar reto: ' + error.message }

  revalidatePath('/[slug]/retos', 'page')
  revalidatePath('/dashboard/retos', 'page')
  return { success: true }
}

export async function deleteOldChallenges(businessId: string) {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const supabase = createAdminClient()

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Costa_Rica' })

  const { data: toDelete, error: queryError } = await supabase
    .from('challenges')
    .select('id')
    .eq('business_id', businessId)
    .or(`status.eq.cancelled,and(status.eq.confirmed,challenge_date.lt.${today})`)

  if (queryError) return { error: 'Error al buscar retos: ' + queryError.message }

  if (!toDelete || toDelete.length === 0) {
    return { error: 'No hay retos cancelados o pasados para eliminar.' }
  }

  const { error } = await supabase
    .from('challenges')
    .delete()
    .in('id', toDelete.map(c => c.id))

  if (error) return { error: 'Error al eliminar retos: ' + error.message }

  revalidatePath('/[slug]/retos', 'page')
  revalidatePath('/dashboard/retos', 'page')
  return { success: true, count: toDelete.length }
}
