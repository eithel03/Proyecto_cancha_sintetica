'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// --- EQUIPOS ---

export async function upsertTeam(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const business_id = formData.get('business_id') as string
  
  const data = {
    business_id,
    name: formData.get('name') as string,
    captain_name: formData.get('captain_name') as string,
    captain_phone: formData.get('captain_phone') as string,
    logo_url: formData.get('logo_url') as string,
    gender: formData.get('gender') as string || 'masculino',
  }

  let error
  if (id) {
    const { error: err } = await supabase.from('tournament_teams').update(data).eq('id', id)
    error = err
  } else {
    const { error: err } = await supabase.from('tournament_teams').insert(data)
    error = err
  }

  if (error) return { error: error.message }
  revalidatePath('/dashboard/tournament')
  return { success: true }
}

export async function deleteTeam(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tournament_teams').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/tournament')
  return { success: true }
}

// --- JUGADORES ---

export async function upsertPlayer(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const business_id = formData.get('business_id') as string
  
  const data = {
    business_id,
    team_id: formData.get('team_id') as string,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    jersey_number: parseInt(formData.get('jersey_number') as string) || null,
    position: formData.get('position') as string,
  }

  let error
  if (id) {
    const { error: err } = await supabase.from('tournament_players').update(data).eq('id', id)
    error = err
  } else {
    const { error: err } = await supabase.from('tournament_players').insert(data)
    error = err
  }

  if (error) return { error: error.message }
  revalidatePath('/dashboard/tournament')
  return { success: true }
}

export async function deletePlayer(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tournament_players').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/tournament')
  return { success: true }
}

// --- PARTIDOS ---

export async function upsertMatch(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const business_id = formData.get('business_id') as string
  
  const status = formData.get('status') as string || 'scheduled'
  
  const data: any = {
    business_id,
    home_team_id: formData.get('home_team_id') as string,
    away_team_id: formData.get('away_team_id') as string,
    court_id: formData.get('court_id') as string || null,
    match_date: formData.get('match_date') as string,
    match_time: formData.get('match_time') as string,
    status,
    gender: formData.get('gender') as string || 'masculino',
    home_score: parseInt(formData.get('home_score') as string) || 0,
    away_score: parseInt(formData.get('away_score') as string) || 0,
    current_minute: parseInt(formData.get('current_minute') as string) || 0,
  }

  // VALIDACIÓN DE CHOQUE DE HORARIOS
  if (data.court_id && data.match_date && data.match_time && (status === 'scheduled' || status === 'live')) {
    const matchTime = data.match_time.substring(0, 5)
    // Asumimos 1 hora de duración para el chequeo
    const nextHour = (parseInt(matchTime.split(':')[0]) + 1).toString().padStart(2, '0')
    const matchEndTime = `${nextHour}:${matchTime.split(':')[1] || '00'}:00`
    const matchStartTime = `${matchTime}:00`

    // 1. Revisar Reservas
    const { data: conflictingRes } = await supabase
      .from('reservations')
      .select('id')
      .eq('court_id', data.court_id)
      .eq('reservation_date', data.match_date)
      .in('status', ['pending', 'confirmed'])
      .filter('start_time', 'lt', `${(parseInt(matchTime.split(':')[0]) + 1).toString().padStart(2, '0')}:${matchTime.split(':')[1] || '00'}:00`)
      .filter('end_time', 'gt', `${matchTime}:00`)

    if (conflictingRes && conflictingRes.length > 0) {
      return { error: 'Ya existe una reserva en este horario y cancha.' }
    }

    // 2. Revisar otros partidos de torneo
    let matchQuery = supabase
      .from('tournament_matches')
      .select('id')
      .eq('court_id', data.court_id)
      .eq('match_date', data.match_date)
      .in('status', ['scheduled', 'live', 'halftime'])
      .filter('match_time', 'eq', data.match_time)
    
    if (id) matchQuery = matchQuery.neq('id', id)
    
    const { data: conflictingMatches } = await matchQuery
    if (conflictingMatches && conflictingMatches.length > 0) {
      return { error: 'Ya existe otro partido de torneo programado a esta misma hora.' }
    }

    // 3. Revisar retos (Cualquiera: abierto, aceptado o confirmado)
    const { data: conflictingChallenges } = await supabase
      .from('challenges')
      .select('id, status')
      .eq('court_id', data.court_id)
      .eq('challenge_date', data.match_date)
      .in('status', ['open', 'accepted', 'confirmed'])
      .filter('challenge_time', 'eq', data.match_time)

    if (conflictingChallenges && conflictingChallenges.length > 0) {
      const statusLabel = conflictingChallenges[0].status === 'confirmed' ? 'confirmado' : 'pendiente';
      return { error: `Existe un reto ${statusLabel} en este horario. Debes cancelarlo o usar otra cancha/hora.` }
    }
  }

  let error
  try {
    if (id) {
      // Fetch previous match state to handle timer logic
      const { data: prevMatch } = await supabase.from('tournament_matches').select('status, live_started_at, elapsed_seconds').eq('id', id).single()
      
      if (prevMatch) {
        if (status === 'live' && prevMatch.status !== 'live') {
          // Resuming or starting
          data.live_started_at = new Date().toISOString()
        } else if (status === 'halftime' && prevMatch.status === 'live') {
          // Pausing
          if (prevMatch.live_started_at) {
            const elapsed = Math.floor((Date.now() - new Date(prevMatch.live_started_at).getTime()) / 1000)
            data.elapsed_seconds = (prevMatch.elapsed_seconds || 0) + elapsed
          }
          data.live_started_at = null
        } else if ((status === 'finished' || status === 'cancelled') && prevMatch.status === 'live') {
          // Ending
          data.live_started_at = null
        }
      }

      const { error: err } = await supabase.from('tournament_matches').update(data).eq('id', id)
      if (err && err.message.includes('current_minute')) {
        // Re-intentar sin current_minute si la columna no existe
        const { current_minute, ...safeData } = data
        const { error: retryErr } = await supabase.from('tournament_matches').update(safeData).eq('id', id)
        error = retryErr
      } else {
        error = err
      }
    } else {
      if (status === 'live') {
        data.live_started_at = new Date().toISOString()
      }
      const { error: err } = await supabase.from('tournament_matches').insert(data)
      if (err && err.message.includes('current_minute')) {
        const { current_minute, ...safeData } = data
        const { error: retryErr } = await supabase.from('tournament_matches').insert(safeData)
        error = retryErr
      } else {
        error = err
      }
    }
  } catch (e) {
    console.error(e)
    return { error: 'Error inesperado al guardar el partido' }
  }

  if (error) return { error: error.message }
  revalidatePath('/dashboard/tournament')
  return { success: true }
}

export async function deleteMatch(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tournament_matches').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/tournament')
  return { success: true }
}

// --- EVENTOS (GOLES, ETC) ---

export async function addMatchEvent(data: any) {
  const supabase = await createClient()
  const { error } = await supabase.from('tournament_match_events').insert(data)
  if (error) return { error: error.message }
  
  // Si es un gol, también actualizamos el marcador del partido automáticamente
  if (data.event_type === 'goal') {
    const { data: match } = await supabase
      .from('tournament_matches')
      .select('home_team_id, home_score, away_score')
      .eq('id', data.match_id)
      .single()
    
    if (match) {
      const isHome = match.home_team_id === data.team_id
      const updateData = isHome 
        ? { home_score: (match.home_score || 0) + 1 }
        : { away_score: (match.away_score || 0) + 1 }
      
      await supabase.from('tournament_matches').update(updateData).eq('id', data.match_id)
    }
  }

  revalidatePath('/dashboard/tournament')
  return { success: true }
}

export async function deleteFullTournament(business_id: string, gender: string) {
  const supabase = await createClient()
  
  try {
    // 1. Obtener IDs de equipos de este género para borrar sus jugadores
    const { data: teams } = await supabase
      .from('tournament_teams')
      .select('id')
      .eq('business_id', business_id)
      .eq('gender', gender)
    
    const teamIds = teams?.map(t => t.id) || []

    // 2. Obtener IDs de partidos de este género para borrar sus eventos
    const { data: matches } = await supabase
      .from('tournament_matches')
      .select('id')
      .eq('business_id', business_id)
      .eq('gender', gender)
    
    const matchIds = matches?.map(m => m.id) || []

    // Borrado en cascada manual
    if (matchIds.length > 0) {
      await supabase.from('tournament_match_events').delete().in('match_id', matchIds)
      await supabase.from('tournament_matches').delete().in('id', matchIds)
    }

    if (teamIds.length > 0) {
      await supabase.from('tournament_players').delete().in('team_id', teamIds)
      await supabase.from('tournament_teams').delete().in('id', teamIds)
    }

    revalidatePath('/dashboard/tournament')
    return { success: true }
  } catch (error: any) {
    console.error('Error al eliminar torneo:', error)
    return { error: error.message || 'Error desconocido al eliminar el torneo' }
  }
}
