'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyBusinessAccess } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { notifyAdminNewReservation, notifyUserChallengeConfirmed } from '@/lib/notifications'

type ChallengeRecord = {
  id: string
  business_id: string
  court_id: string
  creator_id: string | null
  opponent_id: string | null
  customer_name: string | null
  challenge_date: string
  challenge_time: string
  notes: string | null
  status: string | null
  creator?: { full_name: string | null } | null
  opponent?: { full_name: string | null } | null
}

type ChallengeContext = {
  userId: string
  profile: { role: string | null; full_name: string | null; phone: string | null }
  challenge: ChallengeRecord
  canManageBusiness: boolean
}

type AvailabilitySlot = {
  start_time: string | null
  end_time: string | null
  kind: string | null
}

type ActionResult =
  | { success: true; error?: undefined }
  | { success?: false; error: string }

type DeleteChallengesResult =
  | { success: true; count: number; error?: undefined }
  | { success?: false; error: string; count?: undefined }

const challengeSelect = `
  id, business_id, court_id, creator_id, opponent_id, customer_name,
  challenge_date, challenge_time, notes, status
`

function todayInCostaRica() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function normalizeChallengeTime(value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null

  const [hours, minutes] = value.split(':').map(Number)
  if (hours === 23) return null

  return {
    start: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`,
    end: `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`,
  }
}

function normalizeAvailabilityRange(available: AvailabilitySlot) {
  const start = available.start_time?.substring(0, 8)
  const end = available.end_time?.substring(0, 8)
  const timeFormat = /^(?:[01]\d|2[0-3]):[0-5]\d:00$/

  if (!start || !end || !timeFormat.test(start) || !timeFormat.test(end)) return null
  return { start, end }
}

function parseOptionalCount(value: FormDataEntryValue | null) {
  if (value === null || value === '') return null
  const count = Number(value)
  return Number.isInteger(count) && count >= 0 && count <= 100 ? count : undefined
}

async function getChallengeContext(challengeId: string): Promise<ChallengeContext | { error: string }> {
  if (!challengeId) return { error: 'Identificador de reto inválido.' }

  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const [{ data: profile }, { data: challenge, error: challengeError }] = await Promise.all([
    userClient.from('profiles').select('role, full_name, phone').eq('id', user.id).maybeSingle(),
    userClient.from('challenges_public').select(challengeSelect).eq('id', challengeId).maybeSingle(),
  ])

  if (challengeError || !challenge) return { error: 'Reto no encontrado.' }
  if (!profile) return { error: 'No se encontró el perfil del usuario.' }

  const record = challenge as unknown as ChallengeRecord
  const participantIds = [record.creator_id, record.opponent_id].filter((id): id is string => Boolean(id))
  if (participantIds.length > 0) {
    const { data: publicProfiles } = await userClient
      .from('profiles_public')
      .select('id, full_name')
      .in('id', participantIds)

    const nameById = new Map((publicProfiles || []).map((item: { id: string; full_name: string | null }) => [item.id, item.full_name]))
    if (record.creator_id) record.creator = { full_name: nameById.get(record.creator_id) ?? null }
    if (record.opponent_id) record.opponent = { full_name: nameById.get(record.opponent_id) ?? null }
  }

  const access = await verifyBusinessAccess(record.business_id)
  return {
    userId: user.id,
    profile,
    challenge: record,
    canManageBusiness: profile.role === 'super_admin' || !access.error,
  }
}

async function validateCourtForBusiness(courtId: string, businessId: string) {
  const supabase = await createClient()
  const { data: court, error } = await supabase
    .from('courts')
    .select('id, business_id, is_active')
    .eq('id', courtId)
    .maybeSingle()

  if (error || !court || court.business_id !== businessId || !court.is_active) {
    return { error: 'La cancha seleccionada no está disponible para este negocio.' }
  }

  return { court }
}

function revalidateChallengePaths() {
  revalidatePath('/[slug]/retos', 'page')
  revalidatePath('/[slug]/reservar', 'page')
  revalidatePath('/[slug]/perfil', 'page')
}

export async function createChallenge(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión para publicar un reto.' }

  const businessId = String(formData.get('business_id') || '')
  const courtId = String(formData.get('court_id') || '')
  const date = String(formData.get('date') || '')
  const time = String(formData.get('time') || '')
  const notes = String(formData.get('notes') || '').trim()
  const gender = String(formData.get('gender') || 'masculino')
  const menCount = parseOptionalCount(formData.get('men_count'))
  const womenCount = parseOptionalCount(formData.get('women_count'))

  if (!businessId || !courtId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayInCostaRica()) {
    return { error: 'Selecciona una cancha y una fecha válida.' }
  }
  if (!['masculino', 'femenino', 'mixto'].includes(gender) || menCount === undefined || womenCount === undefined) {
    return { error: 'Los datos del reto no son válidos.' }
  }

  const slot = normalizeChallengeTime(time)
  if (!slot) return { error: 'Selecciona una hora válida con al menos una hora de duración.' }

  const [{ data: profile }, courtResult] = await Promise.all([
    supabase.from('profiles').select('full_name, phone, role').eq('id', user.id).maybeSingle(),
    validateCourtForBusiness(courtId, businessId),
  ])

  if (!profile || profile.role !== 'customer') {
    return { error: 'Debes iniciar sesión con una cuenta de cliente para publicar un reto.' }
  }
  if (courtResult.error) return { error: courtResult.error }

  // Disponibilidad por RPC SECURITY DEFINER: devuelve sólo horario, estado y
  // tipo de bloque, sin filas de reservas ni datos de clientes. Las RLS de
  // `reservations` impiden leerlas directamente a un cliente.
  const { data: availability, error: availabilityError } = await supabase.rpc('get_court_availability', {
    p_court_id: courtId,
    p_date: date,
  })

  if (availabilityError) {
    return { error: 'No se pudo verificar la disponibilidad. Intenta de nuevo.' }
  }

  const overlappingSlots = ((availability || []) as AvailabilitySlot[]).filter((available) => {
    const range = normalizeAvailabilityRange(available)
    if (!range) return false
    return slot.start < range.end && slot.end > range.start
  })

  // Un reto confirmado ya tiene la cancha bloqueada como reserva oficial.
  const overlapsReservation = overlappingSlots.some(
    (available) => available.kind === 'reservation' || available.kind === 'confirmed_challenge',
  )
  if (overlapsReservation) return { error: 'Este horario se cruza con una reserva oficial. Elige otro.' }
  if (overlappingSlots.length > 0) {
    return { error: 'Este horario se cruza con otro reto publicado. Elige otro.' }
  }

  const { error } = await supabase.from('challenges').insert({
    business_id: businessId,
    court_id: courtId,
    creator_id: user.id,
    customer_name: profile.full_name || 'Cliente',
    customer_phone: profile.phone || '',
    challenge_date: date,
    challenge_time: slot.start,
    notes: notes || null,
    gender,
    men_count: menCount,
    women_count: womenCount,
    status: 'open',
  })

  if (error) {
    // Los triggers y RPC de PostgreSQL siguen siendo la autoridad final ante
    // carreras entre publicaciones simultáneas; sus mensajes se muestran tal cual.
    const knownMessages = [
      'La cancha ya está reservada en este horario',
      'Este horario ya tiene una reserva oficial',
      'Este horario se cruza con otro reto publicado',
      'La hora del reto no es válida',
    ]
    if (knownMessages.some((fragment) => error.message.includes(fragment))) {
      return { error: error.message }
    }
    return { error: 'Error al publicar reto: ' + error.message }
  }

  const { data: business } = await supabase.from('businesses_public').select('name').eq('id', businessId).maybeSingle()
  await notifyAdminNewReservation(business?.name || 'Tu local', profile.full_name || 'Un cliente', date, slot.start.substring(0, 5))

  revalidateChallengePaths()
  return { success: true }
}

function mapChallengeRpcError(message: string) {
  const known = [
    'Debes iniciar sesión',
    'Solo las cuentas de cliente',
    'Reto no encontrado',
    'No puedes aceptar tu propio reto',
    'Este reto ya no está disponible',
    'La cancha',
    'Solo el personal autorizado',
    'Este reto no está disponible para confirmación',
    'No autorizado',
  ]

  return known.some((fragment) => message.includes(fragment))
    ? message
    : 'No se pudo completar la operación del reto.'
}

export async function acceptChallenge(challengeId: string): Promise<ActionResult> {
  const context = await getChallengeContext(challengeId)
  if ('error' in context) return context
  if (context.profile.role !== 'customer') return { error: 'Solo las cuentas de cliente pueden aceptar retos.' }
  if (context.challenge.creator_id === context.userId) return { error: 'No puedes aceptar tu propio reto.' }
  if (context.challenge.status !== 'open') return { error: 'Este reto ya no está disponible.' }

  const slot = normalizeChallengeTime(context.challenge.challenge_time.substring(0, 5))
  if (!slot) return { error: 'El reto tiene una hora inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_challenge', { p_challenge_id: challengeId })

  if (error) return { error: mapChallengeRpcError(error.message) }

  await notifyUserChallengeConfirmed(
    context.challenge.creator?.full_name || 'Jugador',
    context.profile.full_name || 'Oponente',
    context.challenge.challenge_date,
    slot.start.substring(0, 5),
  )

  revalidateChallengePaths()
  return { success: true }
}

export async function cancelChallenge(challengeId: string): Promise<ActionResult> {
  const context = await getChallengeContext(challengeId)
  if ('error' in context) return context

  const isCreator = context.challenge.creator_id === context.userId
  if (!isCreator && !context.canManageBusiness) return { error: 'No tienes permisos para cancelar este reto.' }
  if (context.challenge.status === 'cancelled') return { error: 'Este reto ya está cancelado.' }
  if (isCreator && !context.canManageBusiness && !['open', 'accepted'].includes(context.challenge.status || '')) {
    return { error: 'Solo el administrador puede cancelar un reto confirmado.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('challenges').update({ status: 'cancelled' }).eq('id', challengeId)
  if (error) return { error: 'Error al cancelar reto: ' + error.message }

  revalidateChallengePaths()
  return { success: true }
}

export async function confirmChallenge(challengeId: string): Promise<ActionResult> {
  const context = await getChallengeContext(challengeId)
  if ('error' in context) return context
  if (!context.canManageBusiness) return { error: 'Solo el personal autorizado puede confirmar retos.' }
  if (!['open', 'accepted'].includes(context.challenge.status || '')) {
    return { error: 'Este reto no está disponible para confirmación.' }
  }

  const slot = normalizeChallengeTime(context.challenge.challenge_time.substring(0, 5))
  if (!slot) return { error: 'El reto tiene una hora inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('confirm_challenge', { p_challenge_id: challengeId })

  if (error) return { error: mapChallengeRpcError(error.message) }

  await notifyUserChallengeConfirmed(
    context.challenge.creator?.full_name || 'Jugador',
    context.challenge.opponent?.full_name || 'Oponente',
    context.challenge.challenge_date,
    slot.start.substring(0, 5),
  )

  revalidateChallengePaths()
  return { success: true }
}

export async function deleteChallenge(challengeId: string): Promise<ActionResult> {
  const context = await getChallengeContext(challengeId)
  if ('error' in context) return context
  if (!context.canManageBusiness) return { error: 'Solo el personal autorizado puede eliminar retos.' }

  const isCancelled = context.challenge.status === 'cancelled'
  const isPastConfirmed = context.challenge.status === 'confirmed' && context.challenge.challenge_date < todayInCostaRica()
  if (!isCancelled && !isPastConfirmed) {
    return { error: 'Solo se pueden eliminar retos cancelados o confirmados con fecha pasada.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('challenges').delete().eq('id', challengeId)
  if (error) return { error: 'Error al eliminar reto: ' + error.message }

  revalidateChallengePaths()
  return { success: true }
}

export async function deleteOldChallenges(businessId: string): Promise<DeleteChallengesResult> {
  if (!businessId) return { error: 'Negocio inválido.' }
  const access = await verifyBusinessAccess(businessId)
  if (access.error) return { error: access.error }

  const today = todayInCostaRica()
  const supabase = await createClient()
  const { data: toDelete, error: queryError } = await supabase
    .from('challenges')
    .select('id')
    .eq('business_id', businessId)
    .or(`status.eq.cancelled,and(status.eq.confirmed,challenge_date.lt.${today})`)

  if (queryError) return { error: 'Error al buscar retos: ' + queryError.message }
  if (!toDelete?.length) return { error: 'No hay retos cancelados o pasados para eliminar.' }

  const { error } = await supabase.from('challenges').delete().in('id', toDelete.map((challenge) => challenge.id))
  if (error) return { error: 'Error al eliminar retos: ' + error.message }

  revalidateChallengePaths()
  return { success: true, count: toDelete.length }
}
