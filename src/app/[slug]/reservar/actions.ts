'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function checkAvailability(courtId: string, date: string) {
  const supabase = await createClient()

  // 1. Obtener Reservas
  const { data: reservations, error: resError } = await supabase
    .from('reservations')
    .select('start_time, end_time, status, notes')
    .eq('court_id', courtId)
    .eq('reservation_date', date)
    .in('status', ['pending', 'confirmed'])

  if (resError) {
    console.error('Error fetching availability (reservations):', resError)
  }

  // 2. Obtener Retos (Abiertos, Aceptados y Confirmados)
  const { data: challenges, error: chalError } = await supabase
    .from('challenges')
    .select('id, challenge_time, status, notes')
    .eq('court_id', courtId)
    .eq('challenge_date', date)
    .in('status', ['open', 'accepted', 'confirmed'])

  if (chalError) {
    console.error('Error fetching availability (challenges):', chalError)
  }

  // Combinar resultados
  const blocked = [
    ...(reservations || []).map(r => ({
      start_time: r.start_time,
      end_time: r.end_time,
      type: (r.notes && r.notes.includes('Reto')) ? 'confirmed_challenge' : 'reservation',
      status: r.status
    })),
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
        status: c.status
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

  revalidatePath('/[slug]/reservar')
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

  revalidatePath('/[slug]/reservar')
  revalidatePath('/[slug]/retos')
  return { success: true }
}
