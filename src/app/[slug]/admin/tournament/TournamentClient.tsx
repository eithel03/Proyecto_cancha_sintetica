'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Activity, BarChart3, Calendar, Clock, Minus, Pencil, Plus, Search, Settings2, Shield, ShieldAlert, Target, Timer, Trash2,
  Trophy, User, UserPlus, Users, X, Zap, type LucideIcon
} from 'lucide-react'
import { upsertTeam, deleteTeam, upsertPlayer, deletePlayer, upsertMatch, deleteMatch, addMatchEvent, deleteFullTournament, autoStartMatches, saveClassificationZones } from './actions'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { cn, formatTime12h } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import styles from './tournament.module.css'
import { calculateTournamentStandings, isPlayedTournamentMatch, type TournamentStanding } from '@/lib/tournament/standings'

type Gender = 'masculino' | 'femenino'

type Team = {
  id: string
  name: string
  captain_name: string | null
  captain_phone: string | null
  logo_url: string | null
  gender: Gender | string | null
}

type Player = {
  id: string
  first_name: string
  last_name: string
  jersey_number: number | null
  position: string | null
  team_id: string
  tournament_teams?: {
    name: string | null
    gender: Gender | string | null
  } | null
}

type Court = {
  id: string
  name: string
}

type MatchTeam = {
  name: string | null
  gender: Gender | string | null
  logo_url?: string | null
} | null

type Match = {
  id: string
  business_id?: string
  home_team_id: string
  away_team_id: string
  court_id: string | null
  match_date: string
  match_time: string
  status: string
  gender: Gender | string | null
  home_score: number | null
  away_score: number | null
  current_minute?: number | null
  live_started_at?: string | null
  elapsed_seconds?: number | null
  home?: MatchTeam
  away?: MatchTeam
  court?: { name: string | null } | null
}

type TournamentEvent = {
  id: string
  business_id: string
  match_id: string
  team_id: string
  player_id: string
  event_type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | string
  quantity: number | null
  minute: number | null
  player?: {
    first_name: string | null
    last_name: string | null
    team_id: string | null
  } | null
  team?: {
    name: string | null
    gender: Gender | string | null
  } | null
}

type ClassificationZoneKey = 'direct' | 'playoff' | 'eliminated'

type ClassificationZoneCounts = Record<ClassificationZoneKey, number>

type ClassificationZonesByGender = Record<Gender, ClassificationZoneCounts>

type InitialClassificationZone = {
  gender: Gender | string
  direct_count: number
  playoff_count: number
  eliminated_count: number
}

const DEFAULT_CLASSIFICATION_ZONES: ClassificationZonesByGender = {
  masculino: { direct: 0, playoff: 0, eliminated: 0 },
  femenino: { direct: 0, playoff: 0, eliminated: 0 },
}

const CLASSIFICATION_ZONE_META: Record<ClassificationZoneKey, {
  label: string
  shortLabel: string
  description: string
  rowClassName: string
  markerClassName: string
  badgeClassName: string
}> = {
  direct: {
    label: 'Clasifican directo',
    shortLabel: 'Clasifican',
    description: 'Primeras posiciones de la tabla',
    rowClassName: 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12]',
    markerClassName: 'bg-emerald-400',
    badgeClassName: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },
  playoff: {
    label: 'Repechaje',
    shortLabel: 'Repechaje',
    description: 'Posiciones intermedias marcadas',
    rowClassName: 'bg-sky-500/[0.08] hover:bg-sky-500/[0.12]',
    markerClassName: 'bg-sky-400',
    badgeClassName: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  },
  eliminated: {
    label: 'Eliminados',
    shortLabel: 'Eliminados',
    description: 'Últimas posiciones de la tabla',
    rowClassName: 'bg-rose-500/[0.08] hover:bg-rose-500/[0.12]',
    markerClassName: 'bg-rose-400',
    badgeClassName: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  },
}

export default function TournamentClient({ 
  businessId, 
  slug,
  initialTeams, 
  initialPlayers, 
  initialMatches, 
  initialEvents,
  courts,
  initialClassificationZones,
}: { 
  businessId: string, 
  slug: string,
  initialTeams: Team[],
  initialPlayers: Player[],
  initialMatches: Match[],
  initialEvents: TournamentEvent[],
  courts: Court[]
  initialClassificationZones: InitialClassificationZone[]
}) {
  const [activeTab, setActiveTab] = useState('teams')
  const [selectedGender, setSelectedGender] = useState<Gender>('masculino')
  const [classificationZones, setClassificationZones] = useState<ClassificationZonesByGender>(() => {
    const next = { ...DEFAULT_CLASSIFICATION_ZONES }
    for (const row of initialClassificationZones) {
      if (row.gender === 'masculino' || row.gender === 'femenino') {
        next[row.gender] = {
          direct: Math.max(0, row.direct_count || 0),
          playoff: Math.max(0, row.playoff_count || 0),
          eliminated: Math.max(0, row.eliminated_count || 0),
        }
      }
    }
    return next
  })
  
  const [playerSearch, setPlayerSearch] = useState('')
  const [teamSearch, setTeamSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [jerseySearch, setJerseySearch] = useState('')
  const [matchStatusFilter, setMatchStatusFilter] = useState('all')
  const [matchDateSort, setMatchDateSort] = useState('desc')
  const [matches, setMatches] = useState<Match[]>(initialMatches)

  // Sincronizar estado cuando cambian las props iniciales (por revalidatePath)
  useEffect(() => {
    // Preserve the existing prop-to-state sync used after server revalidation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches(initialMatches)
  }, [initialMatches])
  
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false)
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false)
  
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [activeMatchForEvent, setActiveMatchForEvent] = useState<Match | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isTeamDetailOpen, setIsTeamDetailOpen] = useState(false)
  const [eventPending, setEventPending] = useState(false)
  const [zonesDirty, setZonesDirty] = useState(false)
  const [zonesSaveState, setZonesSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [selectedViewTeam, setSelectedViewTeam] = useState<any>(null)
  const [isViewTeamModalOpen, setIsViewTeamModalOpen] = useState(false)

  const [isUploading, setIsUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [selectedEventType, setSelectedEventType] = useState('goal')
  const [selectedTeamIdForEvent, setSelectedTeamIdForEvent] = useState('')
  const [matchTime, setMatchTime] = useState('')

  const TIME_OPTIONS = useMemo(() => {
    const options = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
      }
    }
    return options
  }, [])

  // Estado para Diálogo de Confirmación
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean,
    title: string,
    description: string,
    onConfirm: () => void,
    variant?: 'danger' | 'primary'
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  })

  const showConfirm = (title: string, description: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'primary') => {
    setConfirmConfig({ isOpen: true, title, description, onConfirm, variant })
  }

  // Temporizador para partidos en vivo y auto-inicio
  const matchesRef = useRef(matches)
  useEffect(() => {
    matchesRef.current = matches
  }, [matches])

  useEffect(() => {
    // Verificación inicial
    void autoStartMatches(businessId)

    const timer = setInterval(() => {
      // 1. Actualizar minutos en vivo en la UI
      setMatches((prevMatches: Match[]) =>
        prevMatches.map(m => {
          if (m.status === 'live' && m.live_started_at) {
            const elapsedSinceStart = Math.floor((Date.now() - new Date(m.live_started_at).getTime()) / 60000)
            const totalElapsed = Math.floor((m.elapsed_seconds || 0) / 60) + elapsedSinceStart
            return { ...m, current_minute: totalElapsed }
          } else if (m.status === 'halftime') {
            return { ...m, current_minute: Math.floor((m.elapsed_seconds || 0) / 60) }
          }
          return m
        })
      )

      // 2. Verificar si algún partido debe iniciar automáticamente.
      //    Solo se llama al servidor si hay partidos programados que ya
      //    alcanzaron su fecha/hora, evitando requests vacíos cada 30s.
      const current = matchesRef.current
      const now = new Date()
      const todayKey = now.toLocaleDateString('en-CA')
      const nowTime = now.toTimeString().split(' ')[0]
      const hasPendingStart = current.some(m =>
        m.status === 'scheduled' &&
        (m.match_date < todayKey || (m.match_date === todayKey && m.match_time <= nowTime))
      )
      if (hasPendingStart) {
        void autoStartMatches(businessId)
      }
    }, 30000)

    return () => clearInterval(timer)
  }, [businessId])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`tournament_changes_${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_matches', filter: `business_id=eq.${businessId}` },
        (payload: RealtimePostgresChangesPayload<Partial<Match>>) => {
          if (payload.eventType === 'UPDATE') {
            const updatedMatch = payload.new as Partial<Match>
            setMatches((prev) => prev.map((match) => match.id === updatedMatch.id ? { ...match, ...updatedMatch } : match))
          } else if (payload.eventType === 'INSERT') {
            const newMatch = payload.new as Match
            setMatches((prev) => {
              if (prev.some((match) => match.id === newMatch.id)) return prev
              return [newMatch, ...prev]
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedMatch = payload.old as Partial<Match>
            setMatches((prev) => prev.filter((match) => match.id !== deletedMatch.id))
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [businessId])

  // Filtrado de jugadores por género
  const filteredPlayers = initialPlayers.filter(player => {
    const matchesGender = (player.tournament_teams?.gender || 'masculino') === selectedGender
    const matchesSearch = `${player.first_name} ${player.last_name}`.toLowerCase().includes(playerSearch.toLowerCase())
    const matchesJersey = !jerseySearch || player.jersey_number?.toString().includes(jerseySearch)
    const matchesTeam = teamFilter === 'all' || player.team_id === teamFilter
    return matchesGender && matchesSearch && matchesJersey && matchesTeam
  })

  // Filtrado de equipos por género
  const filteredTeams = initialTeams.filter(team => {
    const matchesGender = (team.gender || 'masculino') === selectedGender
    const searchLower = teamSearch.toLowerCase()
    return (
      matchesGender &&
      (team.name.toLowerCase().includes(searchLower) || 
       (team.captain_name && team.captain_name.toLowerCase().includes(searchLower)))
    )
  })

  // Equipos del género actual (para selectores)
  const currentTeams = initialTeams.filter(team => (team.gender || 'masculino') === selectedGender)

  // Filtrado de partidos por género
  const filteredMatches = matches
    .filter(match => {
      const matchesGender = (match.gender || 'masculino') === selectedGender
      const matchesStatus = matchStatusFilter === 'all' || match.status === matchStatusFilter
      return matchesGender && matchesStatus
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.match_date}T${a.match_time}`).getTime()
      const dateB = new Date(`${b.match_date}T${b.match_time}`).getTime()
      return matchDateSort === 'desc' ? dateB - dateA : dateA - dateB
    })

  const currentMatches = matches.filter(match => (match.gender || 'masculino') === selectedGender)
  const playedMatches = currentMatches.filter(match => match.status === 'finished')
  const nextMatch = currentMatches
    .filter(match => match.status === 'scheduled')
    .sort((a, b) => new Date(`${a.match_date}T${a.match_time}`).getTime() - new Date(`${b.match_date}T${b.match_time}`).getTime())[0]
  const progress = currentMatches.length > 0 ? Math.round((playedMatches.length / currentMatches.length) * 100) : 0
  const tournamentTitle = `Liga ${selectedGender === 'masculino' ? 'Masculina' : 'Femenina'}`
  const standings = calculateTournamentStandings(currentTeams, currentMatches)
  const currentEvents = initialEvents.filter(event => (event.team?.gender || 'masculino') === selectedGender)
  const tournamentStats = getTournamentStats(currentTeams, currentMatches, currentEvents, standings)
  const activeClassificationZones = getEffectiveClassificationZones(classificationZones[selectedGender], standings.length)
  const configuredZoneCount = activeClassificationZones.direct + activeClassificationZones.playoff + activeClassificationZones.eliminated

  const updateClassificationZone = (zone: ClassificationZoneKey, nextValue: number) => {
    const current = classificationZones[selectedGender]
    const otherZonesCount = (Object.keys(current) as ClassificationZoneKey[])
      .filter((key) => key !== zone)
      .reduce((sum, key) => sum + current[key], 0)
    const maxValue = Math.max(0, standings.length - otherZonesCount)
    const safeValue = Math.min(Math.max(0, nextValue), maxValue)
    const nextZones = { ...current, [zone]: safeValue }

    setClassificationZones((prev) => ({
      ...prev,
      [selectedGender]: nextZones,
    }))
    setZonesDirty(true)
    setZonesSaveState('idle')
  }

  const handleSaveClassificationZones = async () => {
    const zones = classificationZones[selectedGender]
    setZonesSaveState('saving')
    const result = await saveClassificationZones({
      businessId,
      gender: selectedGender,
      directCount: zones.direct,
      playoffCount: zones.playoff,
      eliminatedCount: zones.eliminated,
    })

    if (result?.error) {
      setZonesSaveState('error')
      toast.error(result.error)
      return
    }

    setZonesDirty(false)
    setZonesSaveState('saved')
  }

  const openTeamDetail = (team: Team) => {
    setSelectedTeam(team)
    setIsTeamDetailOpen(true)
  }

  // --- HANDLERS EQUIPOS ---
  async function handleTeamSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.append('business_id', businessId)
    formData.append('slug', slug)
    if (editingTeam) formData.append('id', editingTeam.id)
    
    const res = await upsertTeam(formData)
    if (res.error) return toast.error(res.error)
    
    toast.success(editingTeam ? 'Equipo actualizado' : 'Equipo creado')
    setIsTeamDialogOpen(false)
    setEditingTeam(null)
    setLogoUrl('')
  }

  // --- HANDLERS JUGADORES ---
  async function handlePlayerSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.append('business_id', businessId)
    formData.append('slug', slug)
    if (editingPlayer) formData.append('id', editingPlayer.id)
    
    const res = await upsertPlayer(formData)
    if (res.error) return toast.error(res.error)
    
    toast.success(editingPlayer ? 'Jugador actualizado' : 'Jugador creado')
    setIsPlayerDialogOpen(false)
    setEditingPlayer(null)
  }

  // --- HANDLERS PARTIDOS ---
  async function handleMatchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.append('business_id', businessId)
    formData.append('slug', slug)
    if (editingMatch) formData.append('id', editingMatch.id)
    
    const res = await upsertMatch(formData)
    if (res.error) return toast.error(res.error)
    
    toast.success(editingMatch ? 'Partido actualizado' : 'Partido creado')
    setIsMatchDialogOpen(false)
    setEditingMatch(null)
  }

  async function handleDeleteTeam(id: string) {
    showConfirm(
      'Eliminar Equipo',
      '¿Estás seguro de eliminar este equipo? Se borrarán sus jugadores y registros asociados.',
      async () => {
        const res = await deleteTeam(id, slug)
        if (res.error) return toast.error(res.error)
        toast.success('Equipo eliminado')
      },
      'danger'
    )
  }

  async function handleDeletePlayer(id: string) {
    showConfirm(
      'Eliminar Jugador',
      '¿Estás seguro de eliminar este jugador?',
      async () => {
        const res = await deletePlayer(id, slug)
        if (res.error) return toast.error(res.error)
        toast.success('Jugador eliminado')
      },
      'danger'
    )
  }

  async function handleDeleteMatch(id: string) {
    showConfirm(
      'Eliminar Partido',
      '¿Estás seguro de eliminar este partido? Esta acción no se puede deshacer.',
      async () => {
        const res = await deleteMatch(id, slug)
        if (res.error) return toast.error(res.error)
        toast.success('Partido eliminado')
      },
      'danger'
    )
  }

  async function handleDeleteFullTournament() {
    showConfirm(
      'Eliminar Torneo',
      `¿Estás seguro de eliminar el torneo ${selectedGender === 'masculino' ? 'Masculino' : 'Femenino'}? TODOS los equipos, jugadores y jornadas se borrarán permanentemente.`,
      async () => {
        const res = await deleteFullTournament(businessId, selectedGender)
        if (res.error) return toast.error(res.error)
        toast.success('Torneo eliminado correctamente')
      },
      'danger'
    )
  }

  // --- HANDLER EVENTOS ---
  async function handleEventSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!activeMatchForEvent) return
    setEventPending(true)
    const formData = new FormData(e.currentTarget)
    
    const eventData = {
      business_id: businessId,
      match_id: activeMatchForEvent.id,
      team_id: String(formData.get('team_id') || ''),
      player_id: String(formData.get('player_id') || ''),
      event_type: String(formData.get('event_type') || 'goal'),
      minute: parseInt(formData.get('minute') as string) || activeMatchForEvent.current_minute || 0,
      quantity: 1
    }

    const res = await addMatchEvent(eventData)
    setEventPending(false)
    
    if (res.error) return toast.error(res.error)
    
    toast.success('Evento registrado correctamente')
    setIsEventDialogOpen(false)
  }

  return (
    <div className={cn('space-y-6', styles.shell)}>
      <section className={cn('-mx-4 -mt-4 bg-emerald-950 px-4 py-6 shadow-sm md:-mx-6 md:-mt-6 md:px-6 lg:-mx-9 lg:-mt-9 lg:px-9', styles.titleBanner)}>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">Gestión de torneo</h2>
      </section>
      {/* Selector de Torneo (género) */}
      <section className={cn('relative overflow-hidden rounded-3xl border border-emerald-500/15 p-6 shadow-xl shadow-black/20', styles.hero)}>
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(45deg,currentColor_1px,transparent_1px)] [background-size:12px_12px] text-white" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <Trophy className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Torneo activo</h2>
            <p className="mt-2 text-3xl font-black uppercase tracking-tight text-white">{tournamentTitle}</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <TournamentMetric value={currentTeams.length} label="Equipos" />
              <TournamentMetric value={currentMatches.length} label="Partidos" />
              <TournamentMetric value={playedMatches.length} label="Jugados" />
              <div>
                <p className="text-2xl font-black leading-none text-white">{nextMatch ? formatShortDate(nextMatch.match_date) : '-'}</p>
                <p className="mt-1 text-xs font-medium text-zinc-400">Próxima jornada</p>
              </div>
            </div>
            <div className="mt-6 max-w-4xl">
              <div className="mb-2 flex items-center justify-between gap-4 text-xs font-bold text-zinc-400">
                <span>Progreso del torneo</span>
                <span className="text-emerald-400">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-400">
                {nextMatch ? `${nextMatch.home?.name || 'Equipo local'} vs ${nextMatch.away?.name || 'Equipo visitante'} · ${formatTime12h(nextMatch.match_time)}` : 'Sin próxima jornada programada.'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row xl:flex-col xl:items-end">
        <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-zinc-950/70 p-1 shadow-sm">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedGender('masculino')}
            className={cn(
              "rounded-xl px-5 font-bold",
              selectedGender === 'masculino' ? "bg-zinc-800 text-white hover:bg-zinc-800" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Masculino
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedGender('femenino')}
            className={cn(
              "rounded-xl px-5 font-bold",
              selectedGender === 'femenino' ? "bg-zinc-800 text-white hover:bg-zinc-800" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Femenino
          </Button>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDeleteFullTournament}
          className="h-10 rounded-xl border-rose-500/30 bg-rose-500/10 px-4 font-bold text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
        >
          <Trash2 className="w-4 h-4" /> Eliminar torneo
        </Button>
        </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v || 'teams')} className="w-full space-y-5">
        <div className={cn('-mx-1 overflow-x-auto px-1 pb-1', styles.tabsNav)}>
          <TabsList className="inline-flex h-11 min-w-max rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <TabsTrigger value="teams" className="gap-2 rounded-lg px-4 font-bold text-slate-600 data-[state=active]:bg-emerald-700 data-[state=active]:text-white"><Users className="h-4 w-4" /> Equipos</TabsTrigger>
            <TabsTrigger value="players" className="gap-2 rounded-lg px-4 font-bold text-slate-600 data-[state=active]:bg-emerald-700 data-[state=active]:text-white"><UserPlus className="h-4 w-4" /> Jugadores</TabsTrigger>
            <TabsTrigger value="matches" className="gap-2 rounded-lg px-4 font-bold text-slate-600 data-[state=active]:bg-emerald-700 data-[state=active]:text-white"><Calendar className="h-4 w-4" /> Partidos</TabsTrigger>
            <TabsTrigger value="standings" className="gap-2 rounded-lg px-4 font-bold text-slate-600 data-[state=active]:bg-emerald-700 data-[state=active]:text-white"><Trophy className="h-4 w-4" /> Posiciones</TabsTrigger>
            <TabsTrigger value="stats" className="gap-2 rounded-lg px-4 font-bold text-slate-600 data-[state=active]:bg-emerald-700 data-[state=active]:text-white"><BarChart3 className="h-4 w-4" /> Estadísticas</TabsTrigger>
          </TabsList>
        </div>

      {/* --- TAB EQUIPOS --- */}
      <TabsContent value="teams">
        <Card className={cn('overflow-hidden rounded-2xl border-white/10 bg-zinc-900/60 shadow-md shadow-black/10', styles.sectionCard)}>
          <CardHeader className="flex flex-col gap-4 border-b border-white/10 bg-zinc-950/45 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input 
                placeholder="Buscar equipo o capitán..." 
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="h-10 rounded-xl border-white/10 bg-zinc-900/70 pl-10"
              />
              </div>
              <Dialog open={isTeamDialogOpen} onOpenChange={(val) => { setIsTeamDialogOpen(val); if(!val) { setEditingTeam(null); setLogoUrl(''); } }}>
                <DialogTrigger render={<Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> Nuevo Equipo</Button>} />
              <DialogContent>
                <div key={editingTeam?.id || 'new-team'}>
                  <form onSubmit={handleTeamSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle>
                    <DialogDescription>Completa los datos del equipo para el torneo.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Equipo</Label>
                      <Input id="name" name="name" defaultValue={editingTeam?.name || ''} required placeholder="Ej: Los Galácticos" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="captain_name">Nombre del Capitán</Label>
                      <Input id="captain_name" name="captain_name" defaultValue={editingTeam?.captain_name || ''} placeholder="Nombre completo" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="captain_phone">Teléfono del Capitán</Label>
                      <Input id="captain_phone" name="captain_phone" type="tel" inputMode="tel" defaultValue={editingTeam?.captain_phone || ''} placeholder="Ej: 88888888 o 8888-8888" />
                    </div>
                    {!editingTeam && (
                      <div className="space-y-2">
                        <Label htmlFor="captain_jersey">Dorsal del Capitán (Opcional)</Label>
                        <Input id="captain_jersey" name="captain_jersey" type="number" placeholder="Ej: 10" />
                        <p className="text-[10px] text-muted-foreground">Si lo incluyes, el capitán se agregará automáticamente como jugador.</p>
                      </div>
                    )}
                    <input type="hidden" name="gender" value={selectedGender} />
                    <div className="space-y-2">
                      <Label htmlFor="logo_url">Logo del Equipo</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-md border flex items-center justify-center overflow-hidden">
                          {editingTeam?.logo_url || logoUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={logoUrl || editingTeam?.logo_url || ''} className="w-full h-full object-contain" alt="Logo preview" />
                            </>
                          ) : (
                            <Shield className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              
                              setIsUploading(true)
                              try {
                                const { createClient } = await import('@/lib/supabase/client')
                                const supabase = createClient()
                                
                                const fileExt = file.name.split('.').pop()
                                const fileName = `${Math.random()}.${fileExt}`
                                const filePath = `${businessId}/${fileName}`
                                
                                const { error } = await supabase.storage
                                  .from('logos')
                                  .upload(filePath, file)
                                  
                                if (error) throw error
                                
                                const { data: { publicUrl } } = supabase.storage
                                  .from('logos')
                                  .getPublicUrl(filePath)
                                  
                                setLogoUrl(publicUrl)
                                toast.success('Logo cargado correctamente')
                              } catch (error) {
                                const message = error instanceof Error ? error.message : 'Error desconocido'
                                toast.error('Error al cargar imagen: ' + message)
                              } finally {
                                setIsUploading(false)
                              }
                            }}
                            disabled={isUploading}
                          />
                          <input type="hidden" name="logo_url" value={logoUrl || editingTeam?.logo_url || ''} />
                          <p className="text-[10px] text-muted-foreground">Recomendado: 200x200px (PNG/JPG)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isUploading}>
                      {isUploading ? 'Cargando...' : (editingTeam ? 'Actualizar' : 'Crear')}
                    </Button>
                  </DialogFooter>
                </form>
              </div>
            </DialogContent>
          </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader className="bg-zinc-900/30">
                <TableRow className="border-zinc-800/60">
                  <TableHead className="w-16 px-6 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Logo</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Nombre</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Capitán</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Teléfono</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Jugadores</TableHead>
                  <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">PJ</TableHead>
                  <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">PG</TableHead>
                  <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">PE</TableHead>
                  <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">PP</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Record</TableHead>
                  <TableHead className="text-right px-6 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => {
                  const stats = standings.find((item) => item.team_id === team.id) || { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }
                  const playerCount = initialPlayers.filter((player) => player.team_id === team.id).length

                  return (
                  <TableRow
                    key={team.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTeamDetail(team)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openTeamDetail(team)
                      }
                    }}
                    className="cursor-pointer border-zinc-800/40 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 group"
                  >
                    <TableCell className="px-6">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full border flex items-center justify-center overflow-hidden">
                        {team.logo_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={team.logo_url} className="w-full h-full object-contain" alt={team.name} />
                          </>
                        ) : (
                          <Shield className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-white group-hover:text-primary transition-colors">{team.name}</TableCell>
                    <TableCell>{team.captain_name || '-'}</TableCell>
                    <TableCell>{team.captain_phone || '-'}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                        {playerCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{stats.pj}</TableCell>
                    <TableCell className="text-center font-semibold text-emerald-300">{stats.g}</TableCell>
                    <TableCell className="text-center font-semibold text-amber-300">{stats.e}</TableCell>
                    <TableCell className="text-center font-semibold text-rose-300">{stats.p}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" title="Victorias" />
                        <span className="text-xs text-zinc-400">{stats.g}</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" title="Empates" />
                        <span className="text-xs text-zinc-400">{stats.e}</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" title="Derrotas" />
                        <span className="text-xs text-zinc-400">{stats.p}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="icon" onClick={() => { setEditingTeam(team); setLogoUrl(team.logo_url || ''); setIsTeamDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  )
                })}
                {filteredTeams.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-20 text-muted-foreground bg-zinc-900/10">
                      <div className="flex flex-col items-center gap-3">
                        <Shield className="w-10 h-10 opacity-10" />
                        <p className="font-bold uppercase italic tracking-tighter text-lg">No se encontraron equipos</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* --- TAB JUGADORES --- */}
      <TabsContent value="players">
        <Card className={cn('overflow-hidden rounded-2xl border-white/10 bg-zinc-900/60 shadow-md shadow-black/10', styles.sectionCard)}>
          <CardHeader className="flex flex-col gap-4 border-b border-white/10 bg-zinc-950/45 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <CardTitle>Jugadores</CardTitle>
              <CardDescription>Inscribe jugadores y asígnalos a sus respectivos equipos.</CardDescription>
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_120px_minmax(180px,220px)] lg:w-auto">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input 
                placeholder="Buscar jugador..." 
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="h-10 w-full rounded-xl border-white/10 bg-zinc-900/70 pl-10"
              />
                </div>
              <Input 
                placeholder="Dorsal #" 
                type="number"
                value={jerseySearch}
                onChange={(e) => setJerseySearch(e.target.value)}
                className="h-10 w-full rounded-xl border-white/10 bg-zinc-900/70"
              />
              <Select value={teamFilter} onValueChange={(val) => setTeamFilter(val || 'all')}>
                <SelectTrigger className="h-10 w-full rounded-xl border-white/10 bg-zinc-900/70">
                  <SelectValue placeholder="Todos los equipos">
                    {(val: string | null) => val === 'all' ? 'Todos los equipos' : currentTeams.find(t => t.id === val)?.name || 'Todos los equipos'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-950">
                  <SelectItem value="all">Todos los equipos</SelectItem>
                  {currentTeams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
              <Dialog open={isPlayerDialogOpen} onOpenChange={(val) => { setIsPlayerDialogOpen(val); if(!val) setEditingPlayer(null); }}>
                <DialogTrigger render={<Button className="h-10 w-full shrink-0 gap-2 rounded-xl font-bold sm:w-auto"><Plus className="h-4 w-4" /> Nuevo Jugador</Button>} />
                <DialogContent>
                  <div key={editingPlayer?.id || 'new-player'}>
                    <form onSubmit={handlePlayerSubmit}>
                    <DialogHeader>
                      <DialogTitle>{editingPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first_name">Nombre</Label>
                          <Input id="first_name" name="first_name" defaultValue={editingPlayer?.first_name} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name">Apellidos</Label>
                          <Input id="last_name" name="last_name" defaultValue={editingPlayer?.last_name} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team_id">Equipo</Label>
                        <Select name="team_id" defaultValue={editingPlayer?.team_id} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona equipo">
                              {(val: string | null) => initialTeams.find(t => t.id === val)?.name || 'Selecciona equipo'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {currentTeams.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="jersey_number">Número #</Label>
                          <Input id="jersey_number" name="jersey_number" type="number" defaultValue={editingPlayer?.jersey_number || ''} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="position">Posición</Label>
                          <Select name="position" defaultValue={editingPlayer?.position || 'Delantero'}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Portero">Portero</SelectItem>
                              <SelectItem value="Defensa">Defensa</SelectItem>
                              <SelectItem value="Mediocampista">Mediocampista</SelectItem>
                              <SelectItem value="Delantero">Delantero</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">{editingPlayer ? 'Actualizar' : 'Crear'}</Button>
                    </DialogFooter>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader className="bg-zinc-900/30">
                <TableRow className="border-zinc-800/60">
                  <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-zinc-500">Nombre</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500">Equipo</TableHead>
                  <TableHead className="w-20 text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500">#</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500">Posición</TableHead>
                  <TableHead className="px-6 text-right font-bold uppercase text-[10px] tracking-widest text-zinc-500">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id} className="border-zinc-800/50 hover:bg-white/[0.03]">
                    <TableCell className="px-6 py-4 font-bold text-white">{player.first_name} {player.last_name}</TableCell>
                    <TableCell className="py-4 text-zinc-200">{player.tournament_teams?.name || '-'}</TableCell>
                    <TableCell className="py-4 text-center font-black text-zinc-100">{player.jersey_number || '-'}</TableCell>
                    <TableCell className="py-4 text-zinc-200">{player.position || '-'}</TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/10 bg-zinc-950/60 hover:bg-zinc-800" onClick={() => { setEditingPlayer(player); setIsPlayerDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => handleDeletePlayer(player.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPlayers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                      No se encontraron jugadores con esos filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* --- TAB JORNADAS --- */}
      <TabsContent value="matches">
        <Card className={cn('overflow-hidden rounded-2xl border-white/10 bg-zinc-900/60 shadow-md shadow-black/10', styles.sectionCard)}>
          <CardHeader className="border-b border-white/10 bg-zinc-950/45">
            <div className="mb-1">
              <CardTitle className="text-xl font-black tracking-tight text-slate-950">Agenda de partidos</CardTitle>
              <CardDescription className="mt-1 text-sm text-slate-500">Consulta rápidamente cuándo juega cada equipo y registra el resultado.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
              <Select value={matchStatusFilter} onValueChange={(v) => setMatchStatusFilter(v || 'all')}>
                <SelectTrigger className="h-10 w-full rounded-xl border-white/10 bg-zinc-900/70 text-xs font-bold uppercase tracking-widest lg:w-[210px]">
                  <SelectValue placeholder="Estado">
                    {(val: string | null) => {
                      const statusMap: Record<string, string> = { 
                        all: 'Todos los estados', 
                        scheduled: 'Programado', 
                        live: 'En Vivo', 
                        halftime: 'Entretiempo', 
                        finished: 'Finalizado', 
                        cancelled: 'Cancelado' 
                      };
                      return statusMap[val || ''] || 'Estado';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="all" className="text-xs font-bold uppercase">Todos los estados</SelectItem>
                  <SelectItem value="scheduled" className="text-xs font-bold uppercase">Programado</SelectItem>
                  <SelectItem value="live" className="text-xs font-bold uppercase text-red-500">En Vivo</SelectItem>
                  <SelectItem value="halftime" className="text-xs font-bold uppercase text-amber-500">Entretiempo</SelectItem>
                  <SelectItem value="finished" className="text-xs font-bold uppercase text-emerald-500">Finalizado</SelectItem>
                  <SelectItem value="cancelled" className="text-xs font-bold uppercase text-zinc-500">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={matchDateSort} onValueChange={(v) => setMatchDateSort(v || 'desc')}>
                <SelectTrigger className="h-10 w-full rounded-xl border-white/10 bg-zinc-900/70 text-xs font-bold uppercase tracking-widest lg:w-[250px]">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5" />
                    <SelectValue placeholder="Orden Fecha">
                      {(val: string | null) => val === 'desc' ? 'Más reciente primero' : 'Más antiguo primero'}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="desc" className="text-xs font-bold uppercase">Más reciente primero</SelectItem>
                  <SelectItem value="asc" className="text-xs font-bold uppercase">Más antiguo primero</SelectItem>
                </SelectContent>
              </Select>

            </div>
              <Dialog open={isMatchDialogOpen} onOpenChange={(val) => { setIsMatchDialogOpen(val); if(!val) { setEditingMatch(null); setMatchTime(''); } }}>
                <DialogTrigger render={<Button className="h-10 w-full shrink-0 gap-2 rounded-xl font-bold lg:w-auto"><Plus className="w-4 h-4" /> Nuevo Partido</Button>} />
              <DialogContent className="max-w-md">
                <div key={editingMatch?.id || 'new-match'}>
                  <form onSubmit={handleMatchSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingMatch ? 'Editar Partido' : 'Programar Partido'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Local</Label>
                        <Select name="home_team_id" defaultValue={editingMatch?.home_team_id} required>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Local">
                              {(val: string | null) => initialTeams.find(t => t.id === val)?.name || 'Local'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {currentTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Visitante</Label>
                        <Select name="away_team_id" defaultValue={editingMatch?.away_team_id} required>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Visitante">
                              {(val: string | null) => initialTeams.find(t => t.id === val)?.name || 'Visitante'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {currentTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="match_date">Fecha</Label>
                        <Input id="match_date" name="match_date" type="date" defaultValue={editingMatch?.match_date} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="match_time">Hora</Label>
                        <Select name="match_time" defaultValue={editingMatch?.match_time} required onValueChange={(value) => setMatchTime(value || '')}>
                          <SelectTrigger className="w-full bg-zinc-900 border-white/10 h-10">
                            <SelectValue placeholder="--:--">
                              {(val: string | null) => val ? formatTime12h(val) : '--:--'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-white/10 max-h-[200px]">
                            {TIME_OPTIONS.map(time => (
                              <SelectItem key={time} value={time}>
                                {formatTime12h(time)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(matchTime || editingMatch?.match_time) && (
                          <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase tracking-widest italic">
                            Identificado como: {formatTime12h(matchTime || editingMatch?.match_time || '')}
                          </p>
                        )}
                      </div>
                    </div>

                    <input type="hidden" name="gender" value={selectedGender} />

                    <div className="space-y-2">
                      <Label>Cancha</Label>
                      <Select name="court_id" defaultValue={editingMatch?.court_id}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Opcional">
                            {(val: string | null) => courts.find(c => c.id === val)?.name || 'Opcional'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {courts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-t pt-4 mt-2">
                      <Label className="text-primary font-bold">Resultado / Estado</Label>
                      <div className="grid grid-cols-3 gap-4 mt-2 items-end">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Goles Local</Label>
                          <Input name="home_score" type="number" defaultValue={editingMatch?.home_score || 0} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Goles Vis.</Label>
                          <Input name="away_score" type="number" defaultValue={editingMatch?.away_score || 0} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Minuto</Label>
                          <Input name="current_minute" type="number" defaultValue={editingMatch?.current_minute || 0} />
                        </div>
                        <div className="space-y-1 col-span-3 sm:col-span-2">
                          <Label className="text-[10px]">Estado</Label>
                          <Select name="status" defaultValue={editingMatch?.status || 'scheduled'}>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder="Estado">
                                {(val: string | null) => {
                                  const statusMap: Record<string, string> = { scheduled: 'Programado', live: 'En Vivo', halftime: 'Entretiempo', finished: 'Finalizado', cancelled: 'Cancelado' };
                                  return statusMap[val || ''] || 'Estado';
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">Programado</SelectItem>
                              <SelectItem value="live">En Vivo</SelectItem>
                              <SelectItem value="halftime">Entretiempo</SelectItem>
                              <SelectItem value="finished">Finalizado</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">{editingMatch ? 'Actualizar' : 'Programar'}</Button>
                  </DialogFooter>
                </form>
              </div>
            </DialogContent>
          </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader className="bg-zinc-900/30">
                <TableRow className="border-zinc-800/60">
                  <TableHead className="w-44 px-6 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Cuándo</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Enfrentamiento</TableHead>
                  <TableHead className="w-36 text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Marcador</TableHead>
                  <TableHead className="w-40 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Situación</TableHead>
                  <TableHead className="text-right px-6 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.map((match) => (
                  <TableRow key={match.id} className={cn('border-zinc-800/40 hover:bg-white/[0.02] transition-colors group', styles.matchRow)}>
                    <TableCell className={cn('px-6 py-4', styles.matchDateCell)}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-emerald-50 p-2 text-emerald-700">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-black text-white">{formatReadableDate(match.match_date)}</div>
                          <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-zinc-500">
                            <Clock className="h-3 w-3" /> {formatTime12h(match.match_time)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={cn('py-4', styles.matchupCell)}>
                      <div className="flex min-w-0 items-center gap-3 font-bold text-white">
                        <div className="min-w-0">
                          <p className="truncate">{match.home?.name || 'Equipo local'}</p>
                          <p className="mt-1 truncate text-sm font-medium text-zinc-500">{match.away?.name || 'Equipo visitante'}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">VS</span>
                      </div>
                      {match.court?.name && <p className="mt-1 text-xs font-medium text-zinc-500">{match.court.name}</p>}
                    </TableCell>
                    <TableCell className={cn('py-4', styles.matchScoreCell)}>
                      {match.status === 'finished' || match.status === 'live' || match.status === 'halftime' ? (
                        <div className="flex flex-col items-center">
                          <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 px-3 text-base font-black text-white">
                            {match.home_score} - {match.away_score}
                          </Badge>
                          {match.status === 'live' && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-red-400">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                              {match.current_minute}&apos; min
                            </span>
                          )}
                          {match.status === 'halftime' && (
                            <span className="mt-1 text-[10px] font-black uppercase tracking-wide text-amber-400">
                              HT (Entretiempo)
                            </span>
                          )}
                        </div>
                      ) : <span className="block text-center text-xs font-semibold text-zinc-500">Sin resultado</span>}
                    </TableCell>
                    <TableCell className={cn('py-4', styles.matchStatusCell)}>
                      <Badge variant="outline" className={cn(getMatchStatusBadgeClassName(match.status), styles.matchStatusBadge)}>
                        {getMatchStatusLabel(match.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn('px-6 py-4', styles.matchActionsCell)}>
                      <div className="flex justify-end gap-2">
                      {match.status === 'live' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 rounded-xl border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15 hover:text-red-200"
                          onClick={() => { 
                            setActiveMatchForEvent(match); 
                            setSelectedEventType('goal');
                            setSelectedTeamIdForEvent('');
                            setIsEventDialogOpen(true); 
                          }}
                        >
                          <Zap className="w-3 h-3 mr-1 fill-red-500" /> Evento
                        </Button>
                      )}
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/10 bg-zinc-950/60 hover:bg-zinc-800" onClick={() => { setEditingMatch(match); setIsMatchDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => handleDeleteMatch(match.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMatches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground bg-zinc-900/10">
                      <div className="flex flex-col items-center gap-3">
                        <Calendar className="w-10 h-10 opacity-10" />
                        <p className="font-bold uppercase italic tracking-tighter text-lg">No hay partidos con estos filtros</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* --- TAB POSICIONES --- */}
      <TabsContent value="standings">
        <Card className={cn('overflow-hidden rounded-2xl border-white/10 bg-zinc-900/60 shadow-md shadow-black/10', styles.sectionCard)}>
          <CardHeader className="gap-5 border-b border-white/10 bg-zinc-950/45">
            <CardTitle>Posiciones</CardTitle>
            <CardDescription>Clasificación calculada con los partidos registrados.</CardDescription>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-black uppercase tracking-wide text-white">Zonas visuales</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-fit border-white/10 bg-white/5 text-zinc-300">
                    {configuredZoneCount} de {standings.length} posiciones
                  </Badge>
                  {zonesDirty && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveClassificationZones}
                      disabled={zonesSaveState === 'saving' || configuredZoneCount !== standings.length}
                      className="h-8 rounded-lg bg-emerald-700 px-3 text-xs font-black text-white hover:bg-emerald-800"
                    >
                      {zonesSaveState === 'saving' ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  )}
                </div>
              </div>
              <p className={cn(
                'mb-3 text-xs font-semibold',
                configuredZoneCount === standings.length ? 'text-emerald-700' : configuredZoneCount < standings.length ? 'text-amber-700' : 'text-rose-700',
              )}>
                {standings.length === 0
                  ? 'Agrega equipos para configurar las zonas.'
                  : configuredZoneCount === standings.length
                    ? configuredZoneCount + ' posiciones distribuidas correctamente.'
                    : configuredZoneCount < standings.length
                      ? 'Falta asignar ' + (standings.length - configuredZoneCount) + ' posición' + (standings.length - configuredZoneCount === 1 ? '' : 'es') + '.'
                      : 'Hay ' + (configuredZoneCount - standings.length) + ' posición' + (configuredZoneCount - standings.length === 1 ? '' : 'es') + ' asignada' + (configuredZoneCount - standings.length === 1 ? '' : 's') + ' de más.'}
              </p>
              <p className="mb-3 text-xs font-semibold text-slate-500" aria-live="polite">
                {zonesSaveState === 'saved' && 'Cambios guardados correctamente.'}
                {zonesSaveState === 'error' && 'No se pudieron guardar los cambios.'}
              </p>
              <div className="grid gap-3 lg:grid-cols-3">
                {(Object.keys(CLASSIFICATION_ZONE_META) as ClassificationZoneKey[]).map((zone) => (
                    <ClassificationZoneEditor
                    key={zone}
                    zone={zone}
                    value={activeClassificationZones[zone]}
                    disabled={standings.length === 0}
                    onChange={(value) => updateClassificationZone(zone, value)}
                  />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-900/30">
                  <TableRow className="border-zinc-800/60">
                    <TableHead className="w-16 px-6 text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Pos</TableHead>
                    <TableHead className="min-w-56 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Equipo</TableHead>
                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">PJ</TableHead>
                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">PG</TableHead>
                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">PE</TableHead>
                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">PP</TableHead>
                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">GF</TableHead>
                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">GC</TableHead>
                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">DIF</TableHead>
                    <TableHead className="text-center font-bold uppercase text-[10px] tracking-widest text-emerald-400 italic">PTS</TableHead>
                    <TableHead className="min-w-40 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Zona</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((row, index) => {
                    const zone = getClassificationZone(index, standings.length, activeClassificationZones)
                    const zoneMeta = zone ? CLASSIFICATION_ZONE_META[zone] : null

                    return (
                      <TableRow key={row.team_id} className={cn("border-zinc-800/40 hover:bg-white/[0.02]", zoneMeta?.rowClassName)}>
                        <TableCell className="px-6 text-center font-black text-zinc-400">
                          <div className="flex items-center justify-center gap-2">
                            {zoneMeta && <span className={cn("h-2.5 w-2.5 rounded-full", zoneMeta.markerClassName)} aria-hidden="true" />}
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
                              {row.team.logo_url ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={row.team.logo_url} className="h-full w-full object-contain" alt={row.team_name} />
                                </>
                              ) : (
                                <Shield className="h-4 w-4 text-zinc-500" />
                              )}
                            </div>
                            <span className="font-bold text-white">{row.team_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{row.pj}</TableCell>
                        <TableCell className="text-center text-emerald-300">{row.g}</TableCell>
                        <TableCell className="text-center text-amber-300">{row.e}</TableCell>
                        <TableCell className="text-center text-rose-300">{row.p}</TableCell>
                        <TableCell className="text-center">{row.gf}</TableCell>
                        <TableCell className="text-center">{row.gc}</TableCell>
                        <TableCell className={cn("text-center font-semibold", row.dg >= 0 ? "text-emerald-300" : "text-rose-300")}>{row.dg}</TableCell>
                        <TableCell className="text-center text-lg font-black text-emerald-300">{row.pts}</TableCell>
                        <TableCell>
                          {zoneMeta ? (
                            <Badge variant="outline" className={zoneMeta.badgeClassName}>{zoneMeta.shortLabel}</Badge>
                          ) : (
                            <span className="text-sm text-zinc-600">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {standings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="py-16 text-center text-muted-foreground">
                        No hay equipos registrados para construir la tabla de posiciones.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* --- TAB ESTADISTICAS --- */}
      <TabsContent value="stats">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {tournamentStats.summary.map((metric) => (
            <Card key={metric.id} className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{metric.value}</p>
                    {metric.description && <p className="mt-1 truncate text-sm font-medium text-slate-500">{metric.description}</p>}
                  </div>
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border", metric.className)}>
                    <metric.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <CardTitle className="text-base font-black text-slate-900">Goleadores</CardTitle>
                <CardDescription>Eventos de gol registrados en partidos del torneo.</CardDescription>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700">
                <Target className="h-5 w-5" />
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {tournamentStats.topScorers.length > 0 ? tournamentStats.topScorers.map((player, index) => (
                <div key={player.player_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition-colors hover:bg-slate-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black', index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-600/10 text-emerald-700')}>
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{player.name}</p>
                      <p className="truncate text-sm text-slate-500">{player.team}</p>
                    </div>
                  </div>
                  <Badge className="shrink-0 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/15">{player.goals} goles</Badge>
                </div>
              )) : (
                <EmptyTournamentState light icon={Target} title="Sin goles registrados" description="Cuando se registren eventos de gol aparecerán aquí." />
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <CardTitle className="text-base font-black text-slate-900">Disciplina</CardTitle>
                <CardDescription>Tarjetas registradas por jugador.</CardDescription>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600/10 text-rose-600">
                <ShieldAlert className="h-5 w-5" />
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {tournamentStats.cards.length > 0 ? tournamentStats.cards.map((player) => (
                <div key={player.player_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition-colors hover:bg-slate-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600/10 text-rose-600">
                      <ShieldAlert className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{player.name}</p>
                      <p className="truncate text-sm text-slate-500">{player.team}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-black text-amber-700">
                      <span className="h-3 w-2 rounded-sm bg-amber-400" /> {player.yellow}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-sm font-black text-rose-600">
                      <span className="h-3 w-2 rounded-sm bg-rose-500" /> {player.red}
                    </span>
                  </div>
                </div>
              )) : (
                <EmptyTournamentState light icon={ShieldAlert} title="Sin disciplina registrada" description="No hay tarjetas amarillas o rojas registradas." />
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TeamDetailDialog
        team={selectedTeam}
        open={isTeamDetailOpen}
        onOpenChange={setIsTeamDetailOpen}
        players={initialPlayers}
        matches={currentMatches}
        events={currentEvents}
        onEditPlayer={(player) => {
          setEditingPlayer(player)
          setIsPlayerDialogOpen(true)
        }}
        onDeletePlayer={handleDeletePlayer}
      />

      {/* --- DIALOG EVENTOS DE PARTIDO --- */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-md">
          {activeMatchForEvent && (
            <form onSubmit={handleEventSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-500 fill-red-500" /> 
                  Registrar Evento - {activeMatchForEvent.home?.name} vs {activeMatchForEvent.away?.name}
                </DialogTitle>
                <DialogDescription>Añade un gol, asistencia o tarjeta en tiempo real.</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Evento</Label>
                  <Select 
                    name="event_type" 
                    value={selectedEventType} 
                    onValueChange={(val) => {
                      setSelectedEventType(val || 'goal');
                      setSelectedTeamIdForEvent(''); // Reset team when type changes
                    }} 
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tipo de Evento">
                        {(val: string | null) => {
                          const typeMap: Record<string, string> = { goal: 'Gol', own_goal: 'Autogol', assist: 'Asistencia', yellow_card: 'Tarjeta Amarilla', red_card: 'Tarjeta Roja' };
                          return typeMap[val || ''] || 'Tipo de Evento';
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goal">Gol</SelectItem>
                      <SelectItem value="own_goal">Autogol</SelectItem>
                      <SelectItem value="assist">Asistencia</SelectItem>
                      <SelectItem value="yellow_card">Tarjeta Amarilla</SelectItem>
                      <SelectItem value="red_card">Tarjeta Roja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{selectedEventType === 'own_goal' ? 'Equipo que recibe el gol' : 'Equipo'}</Label>
                  <Select 
                    name="team_id" 
                    value={selectedTeamIdForEvent} 
                    onValueChange={(v) => setSelectedTeamIdForEvent(v || '')}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona equipo">
                        {(val: string | null) => val === activeMatchForEvent?.home_team_id ? `${activeMatchForEvent?.home?.name} (Local)` : (val === activeMatchForEvent?.away_team_id ? `${activeMatchForEvent?.away?.name} (Visitante)` : 'Selecciona equipo')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={activeMatchForEvent.home_team_id}>{activeMatchForEvent.home?.name} (Local)</SelectItem>
                      <SelectItem value={activeMatchForEvent.away_team_id}>{activeMatchForEvent.away?.name} (Visitante)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{selectedEventType === 'own_goal' ? 'Jugador que anota el autogol' : 'Jugador'}</Label>
                  <Select name="player_id" required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona jugador">
                        {(val: string | null) => {
                          const p = initialPlayers.find(p => p.id === val);
                          return p ? `${p.first_name} ${p.last_name} ${p.jersey_number ? `#${p.jersey_number}` : ''} (${p.tournament_teams?.name})` : 'Selecciona jugador';
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {initialPlayers
                        .filter(p => {
                          if (!selectedTeamIdForEvent) return false;
                          if (selectedEventType === 'own_goal') {
                            // Mostrar solo jugadores del equipo CONTRARIO al seleccionado
                            return p.team_id !== selectedTeamIdForEvent && 
                                   (p.team_id === activeMatchForEvent.home_team_id || p.team_id === activeMatchForEvent.away_team_id);
                          }
                          // Mostrar solo jugadores del equipo seleccionado
                          return p.team_id === selectedTeamIdForEvent;
                        })
                        .map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name} {p.jersey_number ? `#${p.jersey_number}` : ''} ({p.tournament_teams?.name})</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minute">Minuto del Evento (Opcional)</Label>
                  <Input id="minute" name="minute" type="number" placeholder={`Minuto actual: ${activeMatchForEvent.current_minute || 0}`} />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={eventPending}>
                  {eventPending ? 'Registrando...' : 'Registrar Evento'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmationDialog 
        isOpen={confirmConfig.isOpen}
        onOpenChange={(open) => setConfirmConfig((prev) => ({ ...prev, isOpen: open }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        variant={confirmConfig.variant}
      />

      {/* Team Details Modal (Admin View) */}
      <Dialog open={isViewTeamModalOpen} onOpenChange={setIsViewTeamModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-zinc-950 border-white/10 text-white rounded-[40px] shadow-2xl">
          {selectedViewTeam && (() => {
            // Calculate Team Stats
            let pj = 0, g = 0, e = 0, p = 0, gf = 0, gc = 0
            const teamMatches = matches.filter(m => m.home_team_id === selectedViewTeam.id || m.away_team_id === selectedViewTeam.id)
            
            teamMatches.forEach(m => {
              if (
                (m.status === 'finished' || m.status === 'live' || m.status === 'halftime') &&
                m.home_score !== null && m.away_score !== null
              ) {
                pj++
                const isHome = m.home_team_id === selectedViewTeam.id
                const teamScore = isHome ? m.home_score : m.away_score
                const oppScore = isHome ? m.away_score : m.home_score
                gf += teamScore
                gc += oppScore
                if (teamScore > oppScore) g++
                else if (teamScore === oppScore) e++
                else p++
              }
            })

            const yellowCards = initialEvents.filter(s => s.team_id === selectedViewTeam.id && s.event_type === 'yellow_card').length
            const redCards = initialEvents.filter(s => s.team_id === selectedViewTeam.id && s.event_type === 'red_card').length
            const teamPlayers = initialPlayers.filter(p => p.team_id === selectedViewTeam.id)

            return (
              <div className="flex flex-col h-[90vh]">
                <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 sm:p-12 flex flex-col items-center border-b border-white/5">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-[32px] sm:rounded-[40px] flex items-center justify-center p-4 sm:p-6 shadow-2xl mb-6">
                    {selectedViewTeam.logo_url ? <img src={selectedViewTeam.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-200" />}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white mb-2 text-center">{selectedViewTeam.name}</h2>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" /> Capitán: {selectedViewTeam.captain_name || 'Sin capitán'} {selectedViewTeam.captain_phone ? `(${selectedViewTeam.captain_phone})` : ''}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden bg-zinc-950 flex flex-col">
                  <Tabs defaultValue="general" className="flex-1 min-h-0 flex flex-col">
                    <div className="px-6 sm:px-12 pt-6 flex-shrink-0">
                      <TabsList className="grid w-full grid-cols-4 h-12 bg-zinc-900/50 border border-white/5 rounded-xl p-1 gap-1">
                        <TabsTrigger value="general" className="rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">GENERAL</TabsTrigger>
                        <TabsTrigger value="partidos" className="rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">PARTIDOS</TabsTrigger>
                        <TabsTrigger value="disciplina" className="rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">DISCIPLINA</TabsTrigger>
                        <TabsTrigger value="plantilla" className="rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">PLANTILLA</TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 sm:p-12 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                      <TabsContent value="general" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* General Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {[
                            { label: 'Partidos Jugados', val: pj, icon: Activity },
                            { label: 'Victorias', val: g, color: 'text-emerald-400', icon: Trophy },
                            { label: 'Empates', val: e, color: 'text-amber-400', icon: Clock },
                            { label: 'Derrotas', val: p, color: 'text-red-400', icon: X },
                            { label: 'Goles Favor', val: gf, color: 'text-primary', icon: Target },
                            { label: 'Goles Contra', val: gc, color: 'text-zinc-500', icon: ShieldAlert },
                          ].map((st, i) => (
                            <div key={i} className="bg-zinc-900/40 border border-white/5 p-6 rounded-[28px] flex flex-col items-center justify-center text-center group hover:bg-zinc-900/80 transition-all">
                              <st.icon className={`w-4 h-4 mb-3 opacity-20 ${st.color || 'text-white'}`} />
                              <span className={`text-3xl sm:text-5xl font-black italic mb-1 ${st.color || 'text-white'} drop-shadow-md`}>{st.val}</span>
                              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{st.label}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="bg-primary/5 border border-primary/10 p-6 rounded-[28px] flex flex-col items-center justify-center text-center">
                          <span className="text-4xl sm:text-6xl font-black italic text-primary mb-1 drop-shadow-lg">{(g * 3) + (e * 1)}</span>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">PUNTOS TOTALES</span>
                        </div>
                      </TabsContent>

                      <TabsContent value="partidos" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {teamMatches.length === 0 ? (
                          <div className="text-center py-20 bg-zinc-900/20 rounded-[32px] border border-dashed border-white/5">
                            <Calendar className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500 font-black uppercase italic tracking-tighter text-lg">No hay historial aún</p>
                          </div>
                        ) : (
                          teamMatches.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()).map(m => {
                            const isHome = m.home_team_id === selectedViewTeam.id
                            const opp = isHome ? m.away : m.home
                            return (
                              <div key={m.id} className="bg-zinc-900/40 border border-white/5 p-5 sm:p-6 rounded-[24px] flex items-center justify-between gap-6 group hover:bg-zinc-900/80 transition-all">
                                <div className="flex flex-col gap-2">
                                   <div className="flex items-center gap-2">
                                     <span className="bg-white/5 px-2 py-0.5 rounded text-[8px] font-black text-zinc-500 uppercase">
                                       {new Date(m.match_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                     </span>
                                     <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{formatTime12h(m.match_time)}</span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <div className="w-7 h-7 bg-white rounded-lg p-1 shadow-md border border-white/10 flex-shrink-0">
                                       {selectedViewTeam.logo_url ? <img src={selectedViewTeam.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-zinc-300" />}
                                     </div>
                                     <span className="text-[10px] font-black text-zinc-500 italic uppercase">VS</span>
                                     <div className="w-7 h-7 bg-white rounded-lg p-1 shadow-md border border-white/10 flex-shrink-0">
                                       {opp?.logo_url ? <img src={opp.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-zinc-300" />}
                                     </div>
                                     <span className="text-sm sm:text-lg font-black uppercase text-zinc-100 italic tracking-tight ml-1">{opp?.name}</span>
                                   </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {m.status === 'finished' && m.home_score !== null && m.away_score !== null ? (
                                     <div className="flex items-center gap-3">
                                       <span className={`text-2xl sm:text-3xl font-black italic ${
                                         (isHome ? m.home_score : m.away_score) > (isHome ? m.away_score : m.home_score) ? 'text-primary' : 
                                         (isHome ? m.home_score : m.away_score) < (isHome ? m.away_score : m.home_score) ? 'text-red-500' : 'text-zinc-400'
                                       }`}>
                                         {isHome ? `${m.home_score} - ${m.away_score}` : `${m.away_score} - ${m.home_score}`}
                                       </span>
                                     </div>
                                   ) : (
                                     <Badge className="bg-zinc-800 text-zinc-500 text-[8px] font-black uppercase tracking-widest px-3 py-1">Programado</Badge>
                                   )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </TabsContent>

                      <TabsContent value="disciplina" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-yellow-500/[0.03] border border-yellow-500/10 p-8 sm:p-10 rounded-[32px] flex flex-col items-center group hover:bg-yellow-500/[0.06] transition-all">
                            <div className="w-6 h-10 bg-yellow-400 rounded-md mb-4 shadow-[0_0_20px_rgba(250,204,21,0.4)] group-hover:scale-110 transition-transform" />
                            <span className="text-5xl sm:text-7xl font-black italic text-yellow-500 mb-2 drop-shadow-md">{yellowCards}</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500/60">Tarjetas Amarillas</span>
                          </div>
                          <div className="bg-red-500/[0.03] border border-red-500/10 p-8 sm:p-10 rounded-[32px] flex flex-col items-center group hover:bg-red-500/[0.06] transition-all">
                            <div className="w-6 h-10 bg-red-600 rounded-md mb-4 shadow-[0_0_20px_rgba(220,38,38,0.4)] group-hover:scale-110 transition-transform" />
                            <span className="text-5xl sm:text-7xl font-black italic text-red-600 mb-2 drop-shadow-md">{redCards}</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500/60">Tarjetas Rojas</span>
                          </div>
                        </div>
                        
                        <div className="bg-zinc-900/30 p-6 rounded-[28px] border border-white/5 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Puntos de Disciplina</p>
                          <p className="text-2xl font-black italic text-white mt-2">{(yellowCards * 1) + (redCards * 3)} <span className="text-xs text-zinc-700 ml-1">ACUMULADOS</span></p>
                        </div>
                      </TabsContent>

                      <TabsContent value="plantilla" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {teamPlayers.length === 0 ? (
                          <div className="text-center py-20 bg-zinc-900/20 rounded-[32px] border border-dashed border-white/5">
                            <User className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500 font-black uppercase italic tracking-tighter text-lg">No hay jugadores registrados en este equipo</p>
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            {teamPlayers.sort((a: any, b: any) => {
                               const aGoals = initialEvents.filter(s => s.player_id === a.id && s.event_type === 'goal').length
                               const bGoals = initialEvents.filter(s => s.player_id === b.id && s.event_type === 'goal').length
                               return bGoals - aGoals
                            }).map((player: any, idx: number) => {
                               const pGoals = initialEvents.filter(s => s.player_id === player.id && s.event_type === 'goal').length
                               const pYellow = initialEvents.filter(s => s.player_id === player.id && s.event_type === 'yellow_card').length
                               const pRed = initialEvents.filter(s => s.player_id === player.id && s.event_type === 'red_card').length
                              
                              return (
                                <div key={player.id} className="flex items-center justify-between p-5 rounded-[20px] bg-zinc-900/40 border border-white/5 hover:bg-zinc-900/80 transition-all group">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-black italic text-zinc-400 group-hover:text-primary transition-colors">
                                        #{player.jersey_number || idx + 1}
                                      </div>
                                      <div>
                                        <p className="font-black uppercase tracking-tight text-white text-sm sm:text-base italic">{player.first_name} {player.last_name}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{player.position || 'Jugador'}</span>
                                        </div>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-6">
                                      {pGoals > 0 && (
                                        <div className="flex flex-col items-center">
                                          <span className="text-xl font-black italic text-primary">{pGoals}</span>
                                          <span className="text-[7px] font-black text-zinc-600 uppercase">Goles</span>
                                        </div>
                                      )}
                                      <div className="flex gap-1.5">
                                        {pYellow > 0 && <div className="w-2.5 h-4 bg-yellow-400 rounded-sm shadow-lg shadow-yellow-500/10" />}
                                        {pRed > 0 && <div className="w-2.5 h-4 bg-red-600 rounded-sm shadow-lg shadow-red-500/10" />}
                                      </div>
                                   </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
      </Tabs>
    </div>
  )
}

function ClassificationZoneEditor({
  zone,
  value,
  disabled,
  onChange,
}: {
  zone: ClassificationZoneKey
  value: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  const meta = CLASSIFICATION_ZONE_META[zone]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", meta.markerClassName)} aria-hidden="true" />
            <p className="truncate text-sm font-black text-slate-900">{meta.shortLabel}</p>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">{meta.description}</p>
        </div>
        <span className="shrink-0 text-2xl font-black leading-none text-slate-900">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || value === 0}
          onClick={() => onChange(value - 1)}
          className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-700"
          aria-label={`Reducir ${meta.label}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min={0}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className="h-9 rounded-lg border-slate-200 bg-white text-center font-black text-slate-900"
          aria-label={meta.label}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-700"
          aria-label={`Aumentar ${meta.label}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function TeamDetailDialog({
  team,
  open,
  onOpenChange,
  players,
  matches,
  events,
  onEditPlayer,
  onDeletePlayer,
}: {
  team: Team | null
  open: boolean
  onOpenChange: (open: boolean) => void
  players: Player[]
  matches: Match[]
  events: TournamentEvent[]
  onEditPlayer: (player: Player) => void
  onDeletePlayer: (id: string) => void
}) {
  if (!team) return null

  const teamPlayers = players.filter((player) => player.team_id === team.id)
  const teamMatches = matches
    .filter((match) => match.home_team_id === team.id || match.away_team_id === team.id)
    .sort((a, b) => new Date(`${b.match_date}T${b.match_time}`).getTime() - new Date(`${a.match_date}T${a.match_time}`).getTime())
  const teamEvents = events.filter((event) => event.team_id === team.id)
  const disciplineEvents = teamEvents.filter((event) => event.event_type === 'yellow_card' || event.event_type === 'red_card')
  const yellowCards = disciplineEvents.filter((event) => event.event_type === 'yellow_card').reduce((sum, event) => sum + (event.quantity || 1), 0)
  const redCards = disciplineEvents.filter((event) => event.event_type === 'red_card').reduce((sum, event) => sum + (event.quantity || 1), 0)
  const stats = calculateTournamentStandings([team], matches)[0] || { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }
  const statCards = [
    { id: 'played', label: 'Partidos jugados', value: stats.pj, icon: Activity, className: 'border-white/10 bg-white/5 text-white' },
    { id: 'wins', label: 'Victorias', value: stats.g, icon: Trophy, className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' },
    { id: 'draws', label: 'Empates', value: stats.e, icon: Clock, className: 'border-amber-500/20 bg-amber-500/10 text-amber-300' },
    { id: 'losses', label: 'Derrotas', value: stats.p, icon: X, className: 'border-rose-500/20 bg-rose-500/10 text-rose-300' },
    { id: 'gf', label: 'Goles a favor', value: stats.gf, icon: Target, className: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300' },
    { id: 'gc', label: 'Goles en contra', value: stats.gc, icon: ShieldAlert, className: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden rounded-3xl border-white/10 bg-zinc-950 p-0 text-white sm:max-w-4xl">
        <div className="flex max-h-[92vh] flex-col">
          <div className="relative border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-center sm:p-8">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar detalle del equipo"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white p-3 shadow-xl sm:h-24 sm:w-24">
              {team.logo_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={team.logo_url} className="h-full w-full object-contain" alt={team.name} />
                </>
              ) : (
                <Shield className="h-10 w-10 text-zinc-300" />
              )}
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Detalle del equipo</p>
            <DialogTitle className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-4xl">{team.name}</DialogTitle>
            <DialogDescription className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-400">
              <span>Capitán: {team.captain_name || 'Sin capitán'}</span>
              {team.captain_phone && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{team.captain_phone}</span>}
            </DialogDescription>
          </div>

          <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 overflow-x-auto border-b border-white/10 px-5 py-4">
              <TabsList className="inline-flex h-11 min-w-max rounded-2xl border border-white/10 bg-zinc-900/70 p-1">
                <TabsTrigger value="general" className="rounded-xl px-4 text-xs font-bold data-[state=active]:bg-zinc-800 data-[state=active]:text-white">General</TabsTrigger>
                <TabsTrigger value="matches" className="rounded-xl px-4 text-xs font-bold data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Partidos</TabsTrigger>
                <TabsTrigger value="discipline" className="rounded-xl px-4 text-xs font-bold data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Disciplina</TabsTrigger>
                <TabsTrigger value="roster" className="rounded-xl px-4 text-xs font-bold data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Plantilla</TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <TabsContent value="general" className="mt-0 space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {statCards.map((metric) => (
                    <StatTile key={metric.id} icon={metric.icon} label={metric.label} value={metric.value} className={metric.className} />
                  ))}
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
                  <p className="text-4xl font-black text-emerald-300">{stats.pts}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-300/70">Puntos totales</p>
                </div>
              </TabsContent>

              <TabsContent value="matches" className="mt-0 space-y-3">
                {teamMatches.length > 0 ? teamMatches.map((match) => {
                  const isHome = match.home_team_id === team.id
                  const rival = isHome ? match.away : match.home
                  const teamScore = isHome ? match.home_score : match.away_score
                  const rivalScore = isHome ? match.away_score : match.home_score

                  return (
                    <div key={match.id} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">vs {rival?.name || 'Equipo rival'}</p>
                          <p className="mt-1 text-sm text-zinc-400">
                            {formatReadableDate(match.match_date)} · {formatTime12h(match.match_time)}
                            {match.court?.name ? ` · ${match.court.name}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-300">{getMatchStatusLabel(match.status)}</Badge>
                          {isPlayedTournamentMatch(match) && (
                            <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20">{teamScore ?? 0} - {rivalScore ?? 0}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }) : (
                  <EmptyTournamentState icon={Calendar} title="Sin partidos" description="Este equipo todavía no tiene partidos registrados." />
                )}
              </TabsContent>

              <TabsContent value="discipline" className="mt-0 space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <StatTile icon={ShieldAlert} label="Tarjetas amarillas" value={yellowCards} className="border-amber-500/20 bg-amber-500/10 text-amber-300" />
                  <StatTile icon={ShieldAlert} label="Tarjetas rojas" value={redCards} className="border-rose-500/20 bg-rose-500/10 text-rose-300" />
                </div>
                {disciplineEvents.length > 0 ? (
                  <div className="space-y-3">
                    {disciplineEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
                        <div>
                          <p className="font-bold text-white">
                            {event.player ? `${event.player.first_name || ''} ${event.player.last_name || ''}`.trim() : 'Jugador'}
                          </p>
                          <p className="text-sm text-zinc-500">{event.minute ? `Minuto ${event.minute}` : 'Sin minuto registrado'}</p>
                        </div>
                        <Badge className={event.event_type === 'red_card' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}>
                          {event.event_type === 'red_card' ? 'Roja' : 'Amarilla'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyTournamentState icon={ShieldAlert} title="Sin registros disciplinarios" description="No hay registros disciplinarios para este equipo." />
                )}
              </TabsContent>

              <TabsContent value="roster" className="mt-0 space-y-3">
                {teamPlayers.length > 0 ? teamPlayers.map((player) => (
                  <div key={player.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-800 text-sm font-black text-zinc-400">
                        {player.jersey_number ? `#${player.jersey_number}` : player.first_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white">{player.first_name} {player.last_name}</p>
                        <p className="text-sm text-zinc-500">{player.position || 'Jugador'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEditPlayer(player)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => onDeletePlayer(player.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                      </Button>
                    </div>
                  </div>
                )) : (
                  <EmptyTournamentState icon={Users} title="Sin jugadores" description="Este equipo no tiene jugadores registrados." />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatTile({ icon: Icon, label, value, className }: { icon: LucideIcon; label: string; value: number; className: string }) {
  return (
    <div className={cn("rounded-2xl border p-5 text-center", className)}>
      <Icon className="mx-auto mb-3 h-5 w-5 opacity-80" />
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] opacity-75">{label}</p>
    </div>
  )
}

function EmptyTournamentState({ icon: Icon, title, description, light = false }: { icon: LucideIcon; title: string; description: string; light?: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-8 text-center', light ? 'border-slate-200 bg-slate-50/60' : 'border border-dashed border-white/10 bg-zinc-900/30')}>
      <Icon className={cn('mx-auto mb-3 h-8 w-8', light ? 'text-slate-400' : 'text-zinc-700')} />
      <p className={cn('font-bold', light ? 'text-slate-700' : 'text-white')}>{title}</p>
      <p className={cn('mt-1 text-sm', light ? 'text-slate-500' : 'text-zinc-500')}>{description}</p>
    </div>
  )
}

function getEffectiveClassificationZones(zones: ClassificationZoneCounts, totalRows: number): ClassificationZoneCounts {
  const direct = Math.min(Math.max(0, zones.direct), totalRows)
  const playoff = Math.min(Math.max(0, zones.playoff), Math.max(0, totalRows - direct))
  const eliminated = Math.min(Math.max(0, zones.eliminated), Math.max(0, totalRows - direct - playoff))

  return { direct, playoff, eliminated }
}

function getClassificationZone(
  index: number,
  totalRows: number,
  zones: ClassificationZoneCounts,
): ClassificationZoneKey | null {
  const position = index + 1

  if (position <= zones.direct) return 'direct'
  if (position <= zones.direct + zones.playoff) return 'playoff'
  if (zones.eliminated > 0 && position > totalRows - zones.eliminated) return 'eliminated'

  return null
}

function getTournamentStats(teams: Team[], matches: Match[], events: TournamentEvent[], standings: TournamentStanding[]) {
  const played = matches.filter(isPlayedTournamentMatch)
  const eventGoals = events
    .filter((event) => event.event_type === 'goal' || event.event_type === 'own_goal')
    .reduce((sum, event) => sum + (event.quantity || 1), 0)
  const scoreGoals = played.reduce((sum, match) => sum + (match.home_score || 0) + (match.away_score || 0), 0)
  const totalGoals = eventGoals || scoreGoals
  const topWinner = standings.reduce<TournamentStanding | null>((best, current) => (!best || current.g > best.g ? current : best), null)
  const bestAttack = standings.reduce<TournamentStanding | null>((best, current) => (!best || current.gf > best.gf ? current : best), null)
  const bestDefense = standings.reduce<TournamentStanding | null>((best, current) => (!best || current.gc < best.gc ? current : best), null)
  const topScorers = Object.values(
    events
      .filter((event) => event.event_type === 'goal')
      .reduce<Record<string, { player_id: string; name: string; team: string; goals: number }>>((acc, event) => {
        const playerId = event.player_id
        const playerName = event.player ? `${event.player.first_name || ''} ${event.player.last_name || ''}`.trim() : 'Jugador'
        acc[playerId] = acc[playerId] || {
          player_id: playerId,
          name: playerName || 'Jugador',
          team: event.team?.name || 'Equipo',
          goals: 0,
        }
        acc[playerId].goals += event.quantity || 1
        return acc
      }, {})
  ).sort((a, b) => b.goals - a.goals).slice(0, 5)
  const cards = Object.values(
    events
      .filter((event) => event.event_type === 'yellow_card' || event.event_type === 'red_card')
      .reduce<Record<string, { player_id: string; name: string; team: string; yellow: number; red: number }>>((acc, event) => {
        const playerId = event.player_id
        const playerName = event.player ? `${event.player.first_name || ''} ${event.player.last_name || ''}`.trim() : 'Jugador'
        acc[playerId] = acc[playerId] || {
          player_id: playerId,
          name: playerName || 'Jugador',
          team: event.team?.name || 'Equipo',
          yellow: 0,
          red: 0,
        }
        if (event.event_type === 'yellow_card') acc[playerId].yellow += event.quantity || 1
        if (event.event_type === 'red_card') acc[playerId].red += event.quantity || 1
        return acc
      }, {})
  ).sort((a, b) => (b.red * 2 + b.yellow) - (a.red * 2 + a.yellow)).slice(0, 5)

  return {
    summary: [
      { id: 'teams', label: 'Equipos', value: teams.length, description: 'Registrados en la rama actual', icon: Users, className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' },
      { id: 'played', label: 'Partidos jugados', value: played.length, description: `${matches.length} partidos programados`, icon: Calendar, className: 'border-blue-500/20 bg-blue-500/10 text-blue-300' },
      { id: 'goals', label: 'Goles registrados', value: totalGoals, description: played.length ? `${(totalGoals / played.length).toFixed(1)} por partido` : 'Sin partidos jugados', icon: Target, className: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300' },
      { id: 'wins', label: 'Más victorias', value: topWinner?.g || 0, description: topWinner?.team_name || 'Sin datos', icon: Trophy, className: 'border-amber-500/20 bg-amber-500/10 text-amber-300' },
      { id: 'attack', label: 'Mejor ataque', value: bestAttack?.gf || 0, description: bestAttack?.team_name || 'Sin datos', icon: Zap, className: 'border-purple-500/20 bg-purple-500/10 text-purple-300' },
      { id: 'defense', label: 'Mejor defensa', value: bestDefense?.gc || 0, description: bestDefense?.team_name || 'Sin datos', icon: Shield, className: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300' },
    ],
    topScorers,
    cards,
  }
}

function getMatchStatusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: 'Programado',
    live: 'En vivo',
    halftime: 'Entretiempo',
    finished: 'Finalizado',
    cancelled: 'Cancelado',
  }

  return labels[status] || status
}

function getMatchStatusBadgeClassName(status: string) {
  const classNames: Record<string, string> = {
    scheduled: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300',
    live: 'border-red-500/25 bg-red-500/10 text-red-300',
    halftime: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    finished: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    cancelled: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  }

  return cn('font-black', classNames[status] || 'border-white/10 bg-white/5 text-zinc-300')
}

function formatReadableDate(date: string) {
  if (!date) return '-'
  const target = new Date(`${date}T12:00:00`)
  if (Number.isNaN(target.getTime())) return '-'

  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(target)
}

function TournamentMetric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-black leading-none text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-zinc-400">{label}</p>
    </div>
  )
}

function formatShortDate(date: string) {
  if (!date) return '-'

  const target = new Date(`${date}T12:00:00`)
  if (Number.isNaN(target.getTime())) return '-'

  return new Intl.DateTimeFormat('es-CR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(target)
}
