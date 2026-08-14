'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { notifyUserReservationConfirmed } from '@/lib/notifications'
import { verifyBusinessAccess } from '@/lib/auth'

export type WeeklyReservation = {
  id: string
  business_id?: string
  court_id?: string | null
  customer_name: string
  customer_phone: string | null
  customer_email?: string | null
  reservation_date: string
  start_time: string
  end_time: string
  status: string
  notes?: string | null
  created_at?: string | null
  courts?: { name: string | null; description?: string | null } | null
  customer?: { phone: string | null } | null
  is_tournament?: boolean
}

export async function getWeeklyReservations(businessId: string, startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', reservations: [] as WeeklyReservation[] }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, owner_id')
    .eq('id', businessId)
    .single()

  if (!business) return { error: 'Negocio no encontrado', reservations: [] as WeeklyReservation[] }

  if (business.owner_id !== user.id) {
    const { data: staffAccess } = await supabase
      .from('business_users')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!staffAccess) return { error: 'No autorizado', reservations: [] as WeeklyReservation[] }
  }

  const { data: reservations, error: reservationsError } = await supabase
    .from('reservations')
    .select(`
      *,
      courts ( name, description ),
      customer:customer_id ( phone )
    `)
    .eq('business_id', businessId)
    .gte('reservation_date', startDate)
    .lte('reservation_date', endDate)
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (reservationsError) {
    return { error: 'Error al cargar reservas: ' + reservationsError.message, reservations: [] as WeeklyReservation[] }
  }

  const { data: matches } = await supabase
    .from('tournament_matches')
    .select(`
      id,
      match_date,
      match_time,
      status,
      courts ( name, description ),
      home:home_team_id ( name ),
      away:away_team_id ( name )
    `)
    .eq('business_id', businessId)
    .gte('match_date', startDate)
    .lte('match_date', endDate)
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true })

  const formattedMatches: WeeklyReservation[] = (matches || []).map((match) => ({
    id: match.id,
    customer_name: `TORNEO: ${getRelatedName(match.home) || 'Equipo local'} vs ${getRelatedName(match.away) || 'Equipo visita'}`,
    customer_phone: 'N/A',
    reservation_date: match.match_date,
    start_time: match.match_time,
    end_time: addOneHour(match.match_time),
    status: match.status === 'scheduled' ? 'confirmed' : match.status,
    courts: Array.isArray(match.courts) ? match.courts[0] : match.courts,
    is_tournament: true,
  }))

  return {
    reservations: [...((reservations || []) as WeeklyReservation[]), ...formattedMatches],
  }
}

export async function updateReservationStatus(reservationId: string, status: string, slug?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verify reservation belongs to user's business
  const { data: reservation } = await supabase.from('reservations').select('business_id').eq('id', reservationId).single()
  if (reservation) {
    const access = await verifyBusinessAccess(reservation.business_id)
    if (access.error) return { error: access.error }
  }

  // Obtener detalles de la reserva para la notificación
  const { data: res } = await supabase
    .from('reservations')
    .select('*, businesses(name)')
    .eq('id', reservationId)
    .single()

  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', reservationId)

  if (error) {
    return { error: 'Error al actualizar reserva: ' + error.message }
  }

  // Notificar al usuario si se confirma
  if (status === 'confirmed' && res) {
    await notifyUserReservationConfirmed(
      res.customer_name,
      res.businesses?.name || 'la cancha',
      res.reservation_date,
      res.start_time.substring(0, 5),
      res.customer_phone
    )
  }

  if (slug) {
    revalidatePath(`/${slug}/admin/reservations`)
    revalidatePath(`/${slug}/perfil`)
  }
  return { success: true }
}

function addOneHour(time: string) {
  const [hour, minute = '00'] = time.split(':')
  return `${String(Number(hour) + 1).padStart(2, '0')}:${minute}:00`
}

function getRelatedName(value: { name: string | null } | { name: string | null }[] | null) {
  if (Array.isArray(value)) return value[0]?.name || null
  return value?.name || null
}

export async function createAdminReservation(data: {
  business_id: string,
  court_id: string,
  customer_name: string,
  customer_phone: string,
  reservation_date: string,
  start_time: string,
  end_time: string,
  notes?: string,
  slug?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const access = await verifyBusinessAccess(data.business_id)
  if (access.error) return { error: access.error }

  const { error } = await supabase
    .from('reservations')
    .insert({
      business_id: data.business_id,
      court_id: data.court_id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      reservation_date: data.reservation_date,
      start_time: data.start_time,
      end_time: data.end_time,
      notes: data.notes,
      status: 'confirmed' // Las reservas manuales del admin se confirman automáticamente
    })

  if (error) {
    if (error.message.includes('ya está reservada')) {
      return { error: 'Este horario ya está ocupado por otra reserva o partido.' }
    }
    return { error: 'Error al crear reserva manual: ' + error.message }
  }

  if (data.slug) {
    revalidatePath(`/${data.slug}/admin/reservations`)
    revalidatePath(`/${data.slug}/reservar`, 'page')
    revalidatePath(`/${data.slug}/reservar`, 'layout')
  }
  return { success: true }
}

export async function exportReservationsCSV(businessId: string, startDate?: string, endDate?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', csv: '' }

  let query = supabase
    .from('reservations')
    .select('id, customer_name, customer_phone, customer_email, reservation_date, start_time, end_time, status, notes, created_at, courts(name)')
    .eq('business_id', businessId)
    .order('reservation_date', { ascending: false })

  if (startDate) query = query.gte('reservation_date', startDate)
  if (endDate) query = query.lte('reservation_date', endDate)

  const { data: reservations, error } = await query

  if (error) return { error: 'Error al obtener reservas: ' + error.message, csv: '' }

  const headers = ['Fecha', 'Hora Inicio', 'Hora Fin', 'Cliente', 'Telefono', 'Email', 'Cancha', 'Estado', 'Notas', 'Creada']
  const rows = (reservations || []).map(r => [
    r.reservation_date,
    r.start_time?.substring(0, 5) || '',
    r.end_time?.substring(0, 5) || '',
    r.customer_name,
    r.customer_phone,
    r.customer_email || '',
    Array.isArray(r.courts) ? (r.courts[0] as any)?.name || '' : (r.courts as any)?.name || '',
    r.status || '',
    r.notes || '',
    r.created_at || '',
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return { csv: csvContent, error: null }
}
