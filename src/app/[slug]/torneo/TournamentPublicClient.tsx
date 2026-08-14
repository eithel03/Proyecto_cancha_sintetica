'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Trophy, CalendarDays, Users, BarChart3, User, Shield, X, Activity, Target, ShieldAlert, Clock, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatTime12h } from '@/lib/utils'
import { autoStartMatches } from '../../dashboard/tournament/actions'
import { HeroSection, MatchRow, EmptyState } from '@/components/portal'

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type ClassificationZoneRow = {
  gender: string | null
  direct_count: number | null
  playoff_count: number | null
  eliminated_count: number | null
}

type ZoneCounts = { direct: number; playoff: number; eliminated: number }

const ZONE_META = {
  direct: {
    label: 'Zona de clasificación',
    shortLabel: 'Clasifican',
    rowClassName: 'bg-primary-green-light/50 hover:bg-primary-green-light/70',
    markerClassName: 'bg-primary-green',
    badgeClassName: 'border-primary-green/30 bg-primary-green-light text-primary-green-dark',
  },
  playoff: {
    label: 'Repechaje',
    shortLabel: 'Repechaje',
    rowClassName: 'bg-sky-50/60 hover:bg-sky-50',
    markerClassName: 'bg-sky-500',
    badgeClassName: 'border-sky-500/30 bg-sky-50 text-sky-700',
  },
  eliminated: {
    label: 'Eliminados',
    shortLabel: 'Eliminados',
    rowClassName: 'bg-rose-50/60 hover:bg-rose-50',
    markerClassName: 'bg-rose-500',
    badgeClassName: 'border-rose-500/30 bg-rose-50 text-rose-600',
  },
} as const

type ZoneKey = keyof typeof ZONE_META

function getEffectiveZoneCounts(zone: ZoneCounts, totalRows: number): ZoneCounts {
  const direct = Math.min(Math.max(0, zone.direct), totalRows)
  const playoff = Math.min(Math.max(0, zone.playoff), Math.max(0, totalRows - direct))
  const eliminated = Math.min(Math.max(0, zone.eliminated), Math.max(0, totalRows - direct - playoff))
  return { direct, playoff, eliminated }
}

function getClassificationZone(index: number, totalRows: number, zones: ZoneCounts): ZoneKey | null {
  const position = index + 1
  if (position <= zones.direct) return 'direct'
  if (position <= zones.direct + zones.playoff) return 'playoff'
  if (zones.eliminated > 0 && position > totalRows - zones.eliminated) return 'eliminated'
  return null
}

export default function TournamentPublicClient({ businessId, businessName: _businessName, matches: initialMatches, standings: initialStandings, teams: initialTeams, stats, classificationZones }: {
  businessId: string,
  businessName: string,
  matches: any[],
  standings: any[],
  teams: any[],
  stats: any[],
  classificationZones?: ClassificationZoneRow[]
}) {
  const [matches, setMatches] = useState(initialMatches)
  const [selectedGender, setSelectedGender] = useState('masculino')
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setMatches((prevMatches: any[]) => 
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
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (matches.length === 0) return;
    const businessId = matches[0]?.business_id;
    if (!businessId) return;

    const setupRealtime = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const channelId = `public_tournament_matches_${Math.random()}`
      const channel = supabase.channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tournament_matches', filter: `business_id=eq.${businessId}` },
          (payload: { eventType: string; new: any }) => {
            if (payload.eventType === 'UPDATE') {
              setMatches((prev: any) => prev.map((m: any) => m.id === payload.new.id ? { ...m, ...payload.new } : m))
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    
    setupRealtime()
  }, [matches.length])

  useEffect(() => {
    autoStartMatches(businessId)
    const interval = setInterval(() => {
      autoStartMatches(businessId)
    }, 60000)
    return () => clearInterval(interval)
  }, [businessId])

  const filteredMatches = matches.filter(m => (m.gender || 'masculino') === selectedGender)
  const filteredStandings = initialStandings.filter(s => (s.gender || 'masculino') === selectedGender)
  const filteredTeams = initialTeams.filter(t => (t.gender || 'masculino') === selectedGender)
  const filteredStats = (stats || []).filter(s => (s.team?.gender || 'masculino') === selectedGender)

  const todayKey = getLocalDateKey()
  const hasTodayMatch = filteredMatches.some(m => m.match_date === todayKey)
  
  const matchesByDate = filteredMatches
    .reduce((acc: any, match: any) => {
      const date = match.match_date
      if (!acc[date]) acc[date] = []
      acc[date].push(match)
      return acc
    }, {})

  const sortedDates = Object.keys(matchesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  const scorers = filteredStats
    .filter(e => e.event_type === 'goal')
    .reduce((acc: any, event: any) => {
      const playerId = event.player_id
      if (!acc[playerId]) {
        acc[playerId] = { 
          name: `${event.player?.first_name} ${event.player?.last_name}`,
          team: event.team?.name,
          goals: 0 
        }
      }
      acc[playerId].goals += (event.quantity || 1)
      return acc
    }, {})
  
  const topScorers = Object.values(scorers).sort((a: any, b: any) => b.goals - a.goals).slice(0, 10)

  const assists = filteredStats
    .filter(e => e.event_type === 'assist')
    .reduce((acc: any, event: any) => {
      const playerId = event.player_id
      if (!acc[playerId]) {
        acc[playerId] = { 
          name: `${event.player?.first_name} ${event.player?.last_name}`,
          team: event.team?.name,
          assists: 0 
        }
      }
      acc[playerId].assists += (event.quantity || 1)
      return acc
    }, {})
  
  const topAssists = Object.values(assists).sort((a: any, b: any) => b.assists - a.assists).slice(0, 10)

  const liveStandings = filteredTeams.map(team => {
    let pj = 0, g = 0, e = 0, p = 0, gf = 0, gc = 0
    filteredMatches.forEach(m => {
      if (m.status === 'finished' || m.status === 'live' || m.status === 'halftime') {
        if (m.home_team_id === team.id) {
          pj++
          gf += (m.home_score || 0)
          gc += (m.away_score || 0)
          if (m.home_score > m.away_score) g++
          else if (m.home_score === m.away_score) e++
          else p++
        } else if (m.away_team_id === team.id) {
          pj++
          gf += (m.away_score || 0)
          gc += (m.home_score || 0)
          if (m.away_score > m.home_score) g++
          else if (m.away_score === m.home_score) e++
          else p++
        }
      }
    })
    return {
      team_id: team.id,
      team_name: team.name,
      logo_url: team.logo_url,
      pj, g, e, p, gf, gc,
      dg: gf - gc,
      pts: (g * 3) + (e * 1)
    }
  }).sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf)

  const finishedCount = filteredMatches.filter((m: any) => m.status === 'finished').length
  const totalMatches = filteredMatches.length

  const activeZones = getEffectiveZoneCounts({
    direct: (classificationZones || []).find((z) => (z.gender || 'masculino') === selectedGender)?.direct_count || 0,
    playoff: (classificationZones || []).find((z) => (z.gender || 'masculino') === selectedGender)?.playoff_count || 0,
    eliminated: (classificationZones || []).find((z) => (z.gender || 'masculino') === selectedGender)?.eliminated_count || 0,
  }, liveStandings.length)
  const hasConfiguredZones = activeZones.direct + activeZones.playoff + activeZones.eliminated > 0

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 animate-in fade-in duration-1000">
      {/* HERO DEL TORNEO */}
      <HeroSection
        icon={Trophy}
        badge="Torneo activo"
        title={selectedGender === 'femenino' ? 'Liga femenina' : 'Liga masculina'}
        subtitle="Consulta partidos, posiciones y estadísticas del campeonato."
        stats={[
          { value: filteredTeams.length, label: 'Equipos' },
          { value: totalMatches, label: 'Partidos' },
          { value: finishedCount, label: 'Jugados' },
        ]}
        variant="green"
        className="rounded-[20px]"
      >
        <div className="self-start inline-flex p-1 bg-[#08262D]/50 border border-white/15 rounded-[12px] gap-1">
          <button
            onClick={() => setSelectedGender('masculino')}
            className={`flex-1 py-2.5 px-5 rounded-[10px] font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
              selectedGender === 'masculino'
              ? 'bg-[#0F3D3E] text-white shadow-sm border border-white/10'
              : 'bg-white/10 text-[#D9E5E1] hover:bg-white/15 hover:text-white'
            }`}
          >
            <Trophy className={`w-4 h-4 ${selectedGender === 'masculino' ? 'text-[#F5BF16]' : 'text-[#B8C9C4]'}`} /> Masculino
          </button>
          <button
            onClick={() => setSelectedGender('femenino')}
            className={`flex-1 py-2.5 px-5 rounded-[10px] font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
              selectedGender === 'femenino'
              ? 'bg-[#8F3657] text-white shadow-sm border border-white/10'
              : 'bg-white/10 text-[#D9E5E1] hover:bg-white/15 hover:text-white'
            }`}
          >
            <Trophy className={`w-4 h-4 ${selectedGender === 'femenino' ? 'text-[#FFD6E5]' : 'text-[#B8C9C4]'}`} /> Femenino
          </button>
        </div>
      </HeroSection>

      <Tabs defaultValue="jornada" className="w-full">
        <div className="sticky top-16 sm:top-20 z-30 py-2 sm:py-3 bg-background/80 backdrop-blur-md mb-4 sm:mb-5 px-1">
          <TabsList className="flex w-full h-12 bg-white border border-border rounded-[14px] p-[5px] gap-1 shadow-soft overflow-x-auto no-scrollbar">
            {[
              { id: 'jornada', label: 'Partidos', icon: CalendarDays },
              { id: 'clasificacion', label: 'Tabla', icon: Trophy },
              { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
              { id: 'equipos', label: 'Equipos', icon: Users },
            ].map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                data-value={tab.id}
                className="flex-1 min-w-[88px] rounded-[10px] font-semibold text-xs sm:text-sm text-[#52646A] hover:text-primary-green hover:bg-primary-green-subtle data-[state=active]:bg-primary-green data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-bold transition-all whitespace-nowrap px-2"
              >
                <tab.icon className="w-3.5 h-3.5 mr-1.5" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="jornada" className="space-y-5 sm:space-y-6">
          <Card className="gap-0 rounded-2xl border border-border bg-white py-0 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 sm:px-5 py-4">
              <CardTitle className="flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-tight text-foreground">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-green-light text-primary-green">
                  <CalendarDays className="h-4 w-4" />
                </span>
                Próximos partidos
              </CardTitle>
              {hasTodayMatch && (
                <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  Partido de hoy
                </span>
              )}
            </CardHeader>
            <CardContent className="p-0">
          {/* Matches grouped by date */}
          {sortedDates.map(date => {
            const isToday = date === todayKey
            const dateLabel = isToday
              ? `HOY · ${new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }).toUpperCase()}`
              : new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()

            return (
              <div key={date} className="border-b border-border/70 last:border-b-0">
                <h3 className="bg-[#FBF9F3] px-4 sm:px-5 py-2 text-xs sm:text-[13px] font-bold uppercase tracking-[0.12em] text-[#5D7076]">
                  {dateLabel}
                </h3>
                <div>
                        {matchesByDate[date].map((match: typeof filteredMatches[number]) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      isToday={isToday}
                      onClick={() => { setSelectedMatch(match); setIsModalOpen(true); }}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {sortedDates.length === 0 && (
            <div className="p-10">
              <EmptyState
              icon={CalendarDays}
              title="No hay partidos programados"
              description="Aún no se han creado partidos para este torneo."
              />
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clasificacion">
          <Card className="border-border bg-card rounded-2xl overflow-hidden shadow-soft">
            {hasConfiguredZones && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface/50 px-4 sm:px-5 py-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Zonas</span>
                {(Object.keys(ZONE_META) as ZoneKey[])
                  .filter((key) => activeZones[key] > 0)
                  .map((key) => (
                    <span key={key} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span className={cn("h-2.5 w-2.5 rounded-full", ZONE_META[key].markerClassName)} />
                      {ZONE_META[key].shortLabel}
                    </span>
                  ))}
              </div>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-surface">
                  <TableRow className="hover:bg-transparent border-slate-100 h-12">
                    <TableHead className="w-12 sm:w-16 text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">#</TableHead>
                    <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Equipo</TableHead>
                    <TableHead className="text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">PJ</TableHead>
                    <TableHead className="text-center font-semibold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">G</TableHead>
                    <TableHead className="text-center font-semibold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">E</TableHead>
                    <TableHead className="text-center font-semibold text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">P</TableHead>
                    <TableHead className="text-center font-semibold text-slate-500 text-xs uppercase tracking-wide">DG</TableHead>
                    <TableHead className="text-center font-semibold text-primary text-xs uppercase tracking-wide">Pts</TableHead>
                    {hasConfiguredZones && (
                      <TableHead className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Zona</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveStandings.map((row, idx) => {
                    const zone = hasConfiguredZones ? getClassificationZone(idx, liveStandings.length, activeZones) : null
                    const zoneMeta = zone ? ZONE_META[zone] : null

                    return (
                    <TableRow key={row.team_id} className={cn(
                      "border-slate-100 transition-colors group h-14 sm:h-16",
                      zoneMeta ? zoneMeta.rowClassName : "hover:bg-slate-50"
                    )}>
                      <TableCell className="text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-bold text-sm",
                          idx === 0 ? 'bg-primary text-white' : 
                          idx === 1 ? 'bg-primary/15 text-primary' : 'text-slate-400'
                        )}>
                          {idx + 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 bg-white rounded-lg p-1 border border-slate-100 flex-shrink-0">
                            {row.logo_url ? <img src={row.logo_url} className="w-full h-full object-contain" alt={row.team_name} /> : <Shield className="w-full h-full text-slate-300" />}
                          </div>
                          <span className="font-semibold text-sm text-foreground truncate max-w-[110px] sm:max-w-none">{row.team_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-600 text-sm">{row.pj}</TableCell>
                      <TableCell className="text-center text-green-700 font-medium text-sm hidden sm:table-cell">{row.g}</TableCell>
                      <TableCell className="text-center text-slate-400 font-medium text-sm hidden sm:table-cell">{row.e}</TableCell>
                      <TableCell className="text-center text-red-500 font-medium text-sm hidden sm:table-cell">{row.p}</TableCell>
                      <TableCell className="text-center text-slate-500 font-medium text-sm">{row.dg > 0 ? `+${row.dg}` : row.dg}</TableCell>
                      <TableCell className="text-center">
                         <span className="text-base sm:text-lg font-bold text-primary">{row.pts}</span>
                      </TableCell>
                      {hasConfiguredZones && (
                        <TableCell>
                          {zoneMeta ? (
                            <Badge variant="outline" className={zoneMeta.badgeClassName}>{zoneMeta.shortLabel}</Badge>
                          ) : (
                            <span className="text-sm text-slate-300">-</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {liveStandings.length === 0 && (
              <div className="p-10">
                <EmptyState
                  icon={Trophy}
                  title="No hay posiciones aún"
                  description="Las posiciones aparecerán cuando se juguen partidos."
                />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="estadisticas" className="space-y-6 sm:space-y-8">
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
            <Card className="border-border bg-card rounded-2xl overflow-hidden shadow-soft">
              <CardHeader className="border-b border-border p-5">
                <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2.5 text-foreground">
                  <div className="p-2 bg-primary/10 rounded-lg"><Target className="w-4 h-4 text-primary" /></div> Goleadores
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {topScorers.length === 0 ? (
                  <div className="p-10">
                    <EmptyState
                      icon={Target}
                      title="No hay goleadores aún"
                      description="Las estadísticas aparecerán cuando se registren goles."
                    />
                  </div>
                ) : (
                  topScorers.map((scorer: any, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <span className="text-xl sm:text-2xl font-bold text-slate-200 w-8 text-center flex-shrink-0">{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{scorer.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{scorer.team}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xl sm:text-2xl font-bold text-primary">{scorer.goals}</span>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-0.5">Goles</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card rounded-2xl overflow-hidden shadow-soft">
              <CardHeader className="border-b border-border p-5">
                <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2.5 text-foreground">
                   <div className="p-2 bg-blue-50 rounded-lg"><Activity className="w-4 h-4 text-blue-500" /></div> Asistencias
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {topAssists.length === 0 ? (
                  <div className="p-10">
                    <EmptyState
                      icon={Activity}
                      title="No hay asistencias aún"
                      description="Las estadísticas aparecerán cuando se registren asistencias."
                    />
                  </div>
                ) : (
                  topAssists.map((player: any, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <span className="text-xl sm:text-2xl font-bold text-slate-200 w-8 text-center flex-shrink-0">{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{player.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{player.team}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xl sm:text-2xl font-bold text-blue-500">{player.assists}</span>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-0.5">Pases</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipos">
          <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredTeams.map((team, idx) => (
              <motion.div
                key={team.id}
                whileHover={{ y: -4 }}
                onClick={() => { setSelectedTeam(team); setIsTeamModalOpen(true); }}
                className="cursor-pointer"
              >
                <Card className="border-border bg-card hover:border-slate-300 transition-all duration-200 rounded-2xl text-center p-5 sm:p-6 h-full flex flex-col items-center group shadow-soft hover:shadow-card-hover">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-slate-100 mb-3 group-hover:scale-105 transition-transform">
                    {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-contain" alt={team.name} /> : <Shield className="w-full h-full text-slate-300" />}
                  </div>
                  <h4 className="font-semibold text-sm text-foreground mb-2 leading-tight">{team.name}</h4>
                  <div className="mt-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    <User className="w-3 h-3 text-primary" /> {team.captain_name || 'Sin capitán'}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          {filteredTeams.length === 0 && (
            <EmptyState
              icon={Users}
              title="No hay equipos registrados"
              description="Los equipos aparecerán cuando se creen para este torneo."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Match Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white border-slate-200 text-foreground rounded-2xl shadow-2xl">
          {selectedMatch && (
            <div className="flex flex-col h-[85vh]">
              <div className="relative bg-gradient-to-b from-green-50 to-white p-8 sm:p-10 flex flex-col items-center border-b border-slate-200">
                <div className="absolute top-5 left-6 sm:left-8 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> {selectedMatch.court?.name}
                </div>
                
                <div className="flex items-center justify-between w-full mt-4">
                  <div className="flex-1 flex flex-col items-center gap-3 text-center min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-sm border border-slate-100">
                      {selectedMatch.home?.logo_url ? <img src={selectedMatch.home.logo_url} className="w-full h-full object-contain" alt={selectedMatch.home.name} /> : <Shield className="w-8 h-8 text-slate-300" />}
                    </div>
                    <span className="font-semibold text-sm sm:text-base text-foreground truncate max-w-[130px] sm:max-w-[180px]">{selectedMatch.home?.name}</span>
                  </div>

                  <div className="flex flex-col items-center px-6 sm:px-8">
                    <div className="flex items-baseline gap-2.5 sm:gap-4">
                      <span className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground">{selectedMatch.home_score}</span>
                      <span className="text-xl sm:text-2xl font-semibold text-slate-300">:</span>
                      <span className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground">{selectedMatch.away_score}</span>
                    </div>
                    {selectedMatch.status === 'live' && (
                       <Badge className="bg-red-600 text-white font-semibold px-3 py-1 mt-3 animate-pulse uppercase tracking-wide text-xs">{selectedMatch.current_minute}' LIVE</Badge>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-3 text-center min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-sm border border-slate-100">
                      {selectedMatch.away?.logo_url ? <img src={selectedMatch.away.logo_url} className="w-full h-full object-contain" alt={selectedMatch.away.name} /> : <Shield className="w-8 h-8 text-slate-300" />}
                    </div>
                    <span className="font-semibold text-sm sm:text-base text-foreground truncate max-w-[130px] sm:max-w-[180px]">{selectedMatch.away?.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-8 sm:p-10 bg-white scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-8 text-center">Timeline</h3>
                
                <div className="relative space-y-6">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2" />

                  {stats
                    .filter(e => e.match_id === selectedMatch.id)
                    .sort((a, b) => (b.minute || 0) - (a.minute || 0))
                    .map((event, idx) => {
                      const isHome = event.team_id === selectedMatch.home_team_id
                      return (
                        <div key={idx} className={`flex items-center w-full ${isHome ? 'flex-row' : 'flex-row-reverse'}`}>
                          <div className={`flex-1 ${isHome ? 'text-right pr-6' : 'text-left pl-6'} space-y-0.5`}>
                            <p className={cn(
                              "font-semibold text-sm tracking-tight",
                              event.event_type === 'own_goal' ? "text-red-500" : "text-foreground"
                            )}>
                              {event.player?.first_name} {event.player?.last_name}
                            </p>
                            <p className={cn(
                              "text-xs font-medium uppercase tracking-wide",
                              event.event_type === 'own_goal' ? "text-red-500" : "text-slate-400"
                            )}>
                               {event.event_type === 'goal' ? 'Gol' : 
                                event.event_type === 'own_goal' ? 'Autogol' : 
                                event.event_type === 'assist' ? 'Asistencia' : 
                                event.event_type.replace('_', ' ')}
                            </p>
                          </div>
                          
                          <div className="relative z-10 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                            {event.event_type === 'goal' && <span className="text-base">⚽</span>}
                            {event.event_type === 'own_goal' && <span className="text-base">⚽❌</span>}
                            {event.event_type === 'assist' && <span className="text-base">👟</span>}
                            {event.event_type === 'yellow_card' && <div className="w-2.5 h-4 bg-yellow-400 rounded-sm" />}
                            {event.event_type === 'red_card' && <div className="w-2.5 h-4 bg-red-600 rounded-sm" />}
                            <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">{event.minute}'</span>
                          </div>
                          
                          <div className="flex-1" />
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Team Details Modal */}
      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white border-slate-200 text-foreground rounded-2xl shadow-2xl">
          {selectedTeam && (() => {
            let pj = 0, g = 0, e = 0, p = 0, gf = 0, gc = 0
            const teamMatches = matches.filter(m => m.home_team_id === selectedTeam.id || m.away_team_id === selectedTeam.id)
            
            teamMatches.forEach(m => {
              if (m.status === 'finished' || m.status === 'live' || m.status === 'halftime') {
                pj++
                const isHome = m.home_team_id === selectedTeam.id
                const teamScore = isHome ? m.home_score : m.away_score
                const oppScore = isHome ? m.away_score : m.home_score
                gf += teamScore
                gc += oppScore
                if (teamScore > oppScore) g++
                else if (teamScore === oppScore) e++
                else p++
              }
            })

            const yellowCards = stats.filter(s => s.team_id === selectedTeam.id && s.event_type === 'yellow_card').length
            const redCards = stats.filter(s => s.team_id === selectedTeam.id && s.event_type === 'red_card').length

            return (
              <div className="flex flex-col h-[90vh]">
                <div className="relative bg-gradient-to-b from-green-50 to-white p-6 sm:p-10 flex flex-col items-center border-b border-slate-200">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl flex items-center justify-center p-3 sm:p-4 shadow-sm border border-slate-100 mb-4">
                    {selectedTeam.logo_url ? <img src={selectedTeam.logo_url} className="w-full h-full object-contain" alt={selectedTeam.name} /> : <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300" />}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2 text-center">{selectedTeam.name}</h2>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-medium shadow-sm">
                    <User className="w-3.5 h-3.5 text-primary" /> Capitán: {selectedTeam.captain_name || 'Sin capitán'}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden bg-white flex flex-col">
                  <Tabs defaultValue="general" className="flex-1 min-h-0 flex flex-col">
                    <div className="px-5 sm:px-10 pt-5 flex-shrink-0">
                      <TabsList className="grid w-full grid-cols-4 h-11 bg-surface rounded-xl p-1 gap-1">
                        <TabsTrigger value="general" className="rounded-lg text-xs font-medium text-muted-foreground hover:text-primary-green hover:bg-primary-green-subtle data-[state=active]:bg-primary-green data-[state=active]:text-white data-[state=active]:font-semibold">General</TabsTrigger>
                        <TabsTrigger value="partidos" className="rounded-lg text-xs font-medium text-muted-foreground hover:text-primary-green hover:bg-primary-green-subtle data-[state=active]:bg-primary-green data-[state=active]:text-white data-[state=active]:font-semibold">Partidos</TabsTrigger>
                        <TabsTrigger value="disciplina" className="rounded-lg text-xs font-medium text-muted-foreground hover:text-primary-green hover:bg-primary-green-subtle data-[state=active]:bg-primary-green data-[state=active]:text-white data-[state=active]:font-semibold">Disciplina</TabsTrigger>
                        <TabsTrigger value="plantilla" className="rounded-lg text-xs font-medium text-muted-foreground hover:text-primary-green hover:bg-primary-green-subtle data-[state=active]:bg-primary-green data-[state=active]:text-white data-[state=active]:font-semibold">Plantilla</TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 sm:p-10 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      <TabsContent value="general" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { label: 'Partidos jugados', val: pj, icon: Activity },
                            { label: 'Victorias', val: g, color: 'text-green-700', icon: Trophy },
                            { label: 'Empates', val: e, color: 'text-amber-500', icon: Clock },
                            { label: 'Derrotas', val: p, color: 'text-red-500', icon: X },
                            { label: 'Goles a favor', val: gf, color: 'text-primary', icon: Target },
                            { label: 'Goles contra', val: gc, color: 'text-slate-400', icon: ShieldAlert },
                          ].map((st, i) => (
                            <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                              <st.icon className={`w-4 h-4 mb-2 ${st.color || 'text-foreground'}`} />
                              <span className={`text-2xl sm:text-3xl font-bold mb-0.5 ${st.color || 'text-foreground'}`}>{st.val}</span>
                              <span className="text-[10px] font-medium text-slate-500">{st.label}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="bg-primary/5 border border-primary/15 p-5 rounded-xl flex flex-col items-center justify-center text-center">
                          <span className="text-3xl sm:text-4xl font-bold text-primary mb-0.5">{(g * 3) + (e * 1)}</span>
                          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary/70">Puntos totales</span>
                        </div>
                      </TabsContent>

                      <TabsContent value="partidos" className="mt-0 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {teamMatches.length === 0 ? (
                          <EmptyState
                            icon={CalendarDays}
                            title="No hay historial aún"
                          />
                        ) : (
                          teamMatches.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()).map(m => {
                            const isHome = m.home_team_id === selectedTeam.id
                            const opp = isHome ? m.away : m.home
                            return (
                              <div key={m.id} className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-xl flex items-center justify-between gap-4">
                                <div className="flex flex-col gap-1.5 min-w-0">
                                   <div className="flex items-center gap-2">
                                     <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-500">
                                       {new Date(m.match_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                     </span>
                                     <span className="text-xs font-medium text-slate-400">{formatTime12h(m.match_time)}</span>
                                   </div>
                                   <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 bg-white rounded-lg p-1 border border-slate-100 flex-shrink-0">
                                        {opp?.logo_url ? <img src={opp.logo_url} className="w-full h-full object-contain" alt={opp.name} /> : <Shield className="w-full h-full text-slate-300" />}
                                      </div>
                                      <span className="text-sm font-semibold text-foreground truncate">vs {opp?.name}</span>
                                   </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                   {m.status === 'finished' ? (
                                     <span className={`text-lg sm:text-xl font-bold ${
                                       (isHome ? m.home_score : m.away_score) > (isHome ? m.away_score : m.home_score) ? 'text-primary' : 
                                       (isHome ? m.home_score : m.away_score) < (isHome ? m.away_score : m.home_score) ? 'text-red-500' : 'text-slate-400'
                                     }`}>
                                       {isHome ? `${m.home_score} - ${m.away_score}` : `${m.away_score} - ${m.home_score}`}
                                     </span>
                                   ) : (
                                     <Badge className="bg-slate-100 text-slate-500 text-[10px] font-medium px-3 py-1 border border-slate-200">Programado</Badge>
                                   )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </TabsContent>

                      <TabsContent value="disciplina" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl flex flex-col items-center">
                            <div className="w-4 h-7 bg-yellow-400 rounded mb-3" />
                            <span className="text-3xl sm:text-4xl font-bold text-yellow-500 mb-1">{yellowCards}</span>
                            <span className="text-[10px] font-medium uppercase tracking-wide text-yellow-600/80 text-center">Amarillas</span>
                          </div>
                          <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex flex-col items-center">
                            <div className="w-4 h-7 bg-red-600 rounded mb-3" />
                            <span className="text-3xl sm:text-4xl font-bold text-red-600 mb-1">{redCards}</span>
                            <span className="text-[10px] font-medium uppercase tracking-wide text-red-500/80 text-center">Rojas</span>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Puntos de disciplina</p>
                          <p className="text-xl font-bold text-foreground mt-1">{(yellowCards * 1) + (redCards * 3)} <span className="text-xs text-slate-400 font-medium ml-1">acumulados</span></p>
                        </div>
                      </TabsContent>

                      <TabsContent value="plantilla" className="mt-0 space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid gap-2">
                          {selectedTeam.players?.sort((a: any, b: any) => {
                             const aGoals = stats.filter(s => s.player_id === a.id && s.event_type === 'goal').length
                             const bGoals = stats.filter(s => s.player_id === b.id && s.event_type === 'goal').length
                             return bGoals - aGoals
                          }).map((player: any, idx: number) => {
                            const pGoals = stats.filter(s => s.player_id === player.id && s.event_type === 'goal').length
                            const pYellow = stats.filter(s => s.player_id === player.id && s.event_type === 'yellow_card').length
                            const pRed = stats.filter(s => s.player_id === player.id && s.event_type === 'red_card').length
                            
                            return (
                              <div key={player.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-white transition-colors">
                                 <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-400 flex-shrink-0">
                                      #{idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-sm text-foreground truncate">{player.first_name} {player.last_name}</p>
                                      <p className="text-xs text-slate-400">{player.position || 'Jugador'}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-4 flex-shrink-0">
                                    {pGoals > 0 && (
                                      <div className="flex flex-col items-center">
                                        <span className="text-base font-bold text-primary">{pGoals}</span>
                                        <span className="text-[9px] font-medium text-slate-400 uppercase">Goles</span>
                                      </div>
                                    )}
                                    <div className="flex gap-1">
                                      {pYellow > 0 && <div className="w-2 h-3.5 bg-yellow-400 rounded-sm" />}
                                      {pRed > 0 && <div className="w-2 h-3.5 bg-red-600 rounded-sm" />}
                                    </div>
                                 </div>
                              </div>
                            )
                          })}
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
