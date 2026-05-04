'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Trophy, Calendar, Users, BarChart3, User, Shield, Zap, X, ChevronLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function TournamentPublicClient({ matches: initialMatches, standings, teams, stats }: {
  matches: any[],
  standings: any[],
  teams: any[],
  stats: any[]
}) {
  const [matches, setMatches] = useState(initialMatches)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  
  // Temporizador para partidos en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setMatches(prevMatches => 
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
    }, 10000) // Update UI every 10 seconds

    return () => clearInterval(timer)
  }, [])

  // Supabase Realtime subscription
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
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setMatches(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
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
  
  // Filter live matches and halftime matches
  const liveMatches = matches.filter(m => m.status === 'live' || m.status === 'halftime')
  
  // Group matches by date for Jornada (excluding live ones if needed, or keep them)
  const matchesByDate = matches
    .filter(m => m.status !== 'live')
    .reduce((acc: any, match: any) => {
      const date = match.match_date
      if (!acc[date]) acc[date] = []
      acc[date].push(match)
      return acc
    }, {})

  const sortedDates = Object.keys(matchesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // Process stats for top scorers (excluding own goals)
  const scorers = stats
    .filter(e => e.event_type === 'goal' && (!e.player?.team_id || e.player.team_id === e.team_id))
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

  // Process assists
  const assists = stats
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

  // Process cards
  const cards = stats
    .filter(e => e.event_type === 'yellow_card' || e.event_type === 'red_card')
    .reduce((acc: any, event: any) => {
      const playerId = event.player_id
      if (!acc[playerId]) {
        acc[playerId] = { 
          name: `${event.player?.first_name} ${event.player?.last_name}`,
          team: event.team?.name,
          yellow: 0,
          red: 0 
        }
      }
      if (event.event_type === 'yellow_card') acc[playerId].yellow += (event.quantity || 1)
      if (event.event_type === 'red_card') acc[playerId].red += (event.quantity || 1)
      return acc
    }, {})
  
  const topCards = Object.values(cards).sort((a: any, b: any) => (b.red * 2 + b.yellow) - (a.red * 2 + a.yellow)).slice(0, 10)

  // Dynamically calculate standings from matches so it updates in real time
  const liveStandings = teams.map(team => {
    let pj = 0, g = 0, e = 0, p = 0, gf = 0, gc = 0
    matches.forEach(m => {
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
      pj,
      g,
      e,
      p,
      gf,
      gc,
      dg: gf - gc,
      pts: (g * 3) + (e * 1)
    }
  }).sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf)

  return (
    <Tabs defaultValue="jornada" className="w-full">
      <TabsList className="grid w-full grid-cols-4 h-16 sm:h-14 bg-white dark:bg-zinc-900 border rounded-xl p-1">
        <TabsTrigger value="jornada" className="rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-full">
          <Calendar className="w-4 h-4 sm:w-4 sm:h-4" /> 
          <span className="text-[10px] sm:text-sm leading-none">Jornada</span>
        </TabsTrigger>
        <TabsTrigger value="clasificacion" className="rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-full">
          <Trophy className="w-4 h-4 sm:w-4 sm:h-4" /> 
          <span className="text-[10px] sm:text-sm leading-none">Tabla</span>
        </TabsTrigger>
        <TabsTrigger value="estadisticas" className="rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-full">
          <BarChart3 className="w-4 h-4 sm:w-4 sm:h-4" /> 
          <span className="text-[10px] sm:text-sm leading-none">Stats</span>
        </TabsTrigger>
        <TabsTrigger value="equipos" className="rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-full">
          <Users className="w-4 h-4 sm:w-4 sm:h-4" /> 
          <span className="text-[10px] sm:text-sm leading-none">Equipos</span>
        </TabsTrigger>
      </TabsList>

      {/* --- JORNADA --- */}
      <TabsContent value="jornada" className="mt-6 space-y-8">
        <AnimatePresence mode="popLayout">
          <motion.div
            key="jornada-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
        {/* EN VIVO SECTION */}
        {liveMatches.length > 0 && (
          <div className="space-y-4 animate-pulse">
            <h3 className="text-lg font-bold flex items-center gap-2 px-2 text-red-500">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              EN VIVO AHORA
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {liveMatches.map((match: any) => (
                <Card 
                  key={match.id} 
                  className="overflow-hidden border-2 border-red-500/20 shadow-lg bg-red-50/5 dark:bg-red-950/5 cursor-pointer hover:border-red-500/50 transition-all"
                  onClick={() => { setSelectedMatch(match); setIsModalOpen(true); }}
                >
                  <CardContent className="p-0">
                    <div className="bg-red-500/10 p-2 text-[10px] uppercase font-bold tracking-wider text-red-600 dark:text-red-400 flex justify-between items-center">
                      <span>{match.court?.name || 'Cancha'}</span>
                      {match.status === 'live' ? (
                        <span className="flex items-center gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                          {match.current_minute || '0'}'
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                          HT (Entretiempo)
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex items-center justify-between gap-4">
                      {/* Local */}
                      <div className="flex-1 flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm border p-2">
                          {match.home?.logo_url ? <img src={match.home.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-6 h-6 text-muted-foreground" />}
                        </div>
                        <span className="text-sm font-bold leading-tight">{match.home?.name}</span>
                      </div>

                      {/* Marcador En Vivo */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl font-black text-red-600 dark:text-red-400">{match.home_score}</span>
                          <span className="text-zinc-300 font-light text-2xl">-</span>
                          <span className="text-4xl font-black text-red-600 dark:text-red-400">{match.away_score}</span>
                        </div>
                        <div className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${match.status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}>
                          {match.status === 'live' ? 'LIVE' : 'HT'}
                        </div>
                      </div>

                      {/* Visitante */}
                      <div className="flex-1 flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm border p-2">
                          {match.away?.logo_url ? <img src={match.away.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-6 h-6 text-muted-foreground" />}
                        </div>
                        <span className="text-sm font-bold leading-tight">{match.away?.name}</span>
                      </div>
                    </div>
                    {/* Eventos recientes */}
                    <div className="px-4 pb-4 space-y-1">
                      {stats
                        .filter(e => e.match_id === match.id && (e.event_type === 'goal' || e.event_type === 'red_card'))
                        .sort((a, b) => (b.minute || 0) - (a.minute || 0))
                        .slice(0, 3)
                        .map((event, idx) => (
                          <div key={idx} className="flex items-center justify-center gap-2 text-[11px] font-medium text-foreground/80">
                            <span>{event.event_type === 'goal' ? '⚽' : '🟥'}</span>
                            <span>{event.minute}'</span>
                            <span>{event.player?.first_name} {event.player?.last_name}</span>
                          </div>
                        ))
                      }
                      {stats.filter(e => e.match_id === match.id).length === 0 && (
                        <div className="text-[10px] text-muted-foreground italic text-center">
                          Partido en desarrollo...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {sortedDates.map(date => (
          <div key={date} className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 px-2">
              <span className="w-1 h-6 bg-primary rounded-full"></span>
              {new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {matchesByDate[date].map((match: any) => (
                <Card 
                  key={match.id} 
                  className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:ring-1 hover:ring-primary/50"
                  onClick={() => { setSelectedMatch(match); setIsModalOpen(true); }}
                >
                  <CardContent className="p-0">
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex justify-between items-center border-b dark:border-zinc-800">
                      <span>{match.court?.name || 'Cancha'}</span>
                      <span>{match.match_time}</span>
                    </div>
                    <div className="p-4 flex items-center justify-between gap-4">
                      {/* Local */}
                      <div className="flex-1 flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm border p-2">
                          {match.home?.logo_url ? <img src={match.home.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-6 h-6 text-muted-foreground" />}
                        </div>
                        <span className="text-sm font-bold leading-tight">{match.home?.name}</span>
                      </div>

                      {/* Marcador */}
                      <div className="flex flex-col items-center gap-1">
                        {match.status === 'finished' ? (
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-black">{match.home_score}</span>
                            <span className="text-zinc-300 font-light">-</span>
                            <span className="text-3xl font-black">{match.away_score}</span>
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">
                            VS
                          </div>
                        )}
                        <Badge variant="outline" className="text-[10px] uppercase tracking-tighter opacity-70">
                          {match.status === 'finished' ? 'Finalizado' : 'Programado'}
                        </Badge>
                      </div>

                      {/* Visitante */}
                      <div className="flex-1 flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm border p-2">
                          {match.away?.logo_url ? <img src={match.away.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-6 h-6 text-muted-foreground" />}
                        </div>
                        <span className="text-sm font-bold leading-tight">{match.away?.name}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
          {sortedDates.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">No hay partidos registrados aún.</div>
          )}
        </motion.div>
        </AnimatePresence>
      </TabsContent>

      {/* --- CLASIFICACION --- */}
      <TabsContent value="clasificacion" className="mt-6">
        <AnimatePresence mode="popLayout">
          <motion.div
            key="clasificacion-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-none shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="text-xs sm:text-sm">
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                <TableRow>
                  <TableHead className="w-8 sm:w-12 text-center px-1 sm:px-4">#</TableHead>
                  <TableHead className="px-1 sm:px-4">Equipo</TableHead>
                  <TableHead className="text-center px-1 sm:px-4">PJ</TableHead>
                  <TableHead className="text-center px-1 sm:px-4">G</TableHead>
                  <TableHead className="text-center px-1 sm:px-4">E</TableHead>
                  <TableHead className="text-center px-1 sm:px-4">P</TableHead>
                  <TableHead className="text-center px-1 sm:px-4">DG</TableHead>
                  <TableHead className="text-center font-bold text-primary px-1 sm:px-4">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveStandings.map((row, idx) => (
                  <TableRow key={row.team_id} className={idx < 3 ? 'bg-primary/5' : ''}>
                    <TableCell className="text-center font-bold px-1 sm:px-4">{idx + 1}</TableCell>
                    <TableCell className="font-medium px-1 sm:px-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white dark:bg-zinc-800 rounded-sm border p-0.5 flex-shrink-0 flex items-center justify-center">
                          {row.logo_url ? <img src={row.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />}
                        </div>
                        <span className="truncate max-w-[80px] sm:max-w-none">{row.team_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-1 sm:px-4">{row.pj}</TableCell>
                    <TableCell className="text-center px-1 sm:px-4">{row.g}</TableCell>
                    <TableCell className="text-center px-1 sm:px-4">{row.e}</TableCell>
                    <TableCell className="text-center px-1 sm:px-4">{row.p}</TableCell>
                    <TableCell className="text-center text-muted-foreground px-1 sm:px-4">{row.dg > 0 ? `+${row.dg}` : row.dg}</TableCell>
                    <TableCell className="text-center font-black text-primary text-sm sm:text-base px-1 sm:px-4">{row.pts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        </motion.div>
        </AnimatePresence>
      </TabsContent>

      {/* --- ESTADISTICAS --- */}
      <TabsContent value="estadisticas" className="mt-6 space-y-6">
        <AnimatePresence mode="popLayout">
          <motion.div
            key="estadisticas-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid gap-6 md:grid-cols-2">
          {/* Goleadores */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" /> Máximos Goleadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {topScorers.map((scorer: any, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="w-8 font-bold text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-bold">{scorer.name}</div>
                        <div className="text-xs text-muted-foreground">{scorer.team}</div>
                      </TableCell>
                      <TableCell className="text-right font-black text-lg">{scorer.goals}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Asistidores */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500 fill-blue-500" /> Máximos Asistidores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {topAssists.map((player: any, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="w-8 font-bold text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-bold">{player.name}</div>
                        <div className="text-xs text-muted-foreground">{player.team}</div>
                      </TableCell>
                      <TableCell className="text-right font-black text-lg">{player.assists}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tarjetas */}
          <Card className="border-none shadow-sm md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" /> Control Disciplinario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador / Equipo</TableHead>
                    <TableHead className="text-center">Amarillas</TableHead>
                    <TableHead className="text-center">Rojas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCards.map((player: any, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-bold">{player.name}</div>
                        <div className="text-xs text-muted-foreground">{player.team}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-block w-4 h-6 bg-yellow-400 rounded-sm mx-auto shadow-sm" title="Amarillas"></span>
                        <div className="font-bold mt-1">{player.yellow}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-block w-4 h-6 bg-red-600 rounded-sm mx-auto shadow-sm" title="Rojas"></span>
                        <div className="font-bold mt-1">{player.red}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        </motion.div>
        </AnimatePresence>
      </TabsContent>

      {/* --- EQUIPOS --- */}
      <TabsContent value="equipos" className="mt-6">
        <AnimatePresence mode="popLayout">
          <motion.div
            key="equipos-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, staggerChildren: 0.1 }}
            className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
          >
            {teams.map((team, idx) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <Card 
                  className="border-none shadow-sm text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer h-full"
                  onClick={() => { setSelectedTeam(team); setIsTeamModalOpen(true); }}
                >
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full mx-auto border p-3 flex items-center justify-center mb-4 shadow-sm">
                  {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-8 h-8 text-muted-foreground" />}
                </div>
                <h4 className="font-bold text-sm mb-1">{team.name}</h4>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <User className="w-3 h-3" /> {team.captain_name || 'Sin capitán'}
                </p>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.div>
        </AnimatePresence>
      </TabsContent>

      {/* DETALLES DEL PARTIDO (MODAL) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-white rounded-xl">
          <DialogTitle className="sr-only">Detalles del Partido</DialogTitle>
          {selectedMatch && (
            <div className="flex flex-col h-full max-h-[85vh]">
              {/* Header con Marcador */}
              <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 pt-10 flex flex-col items-center border-b border-zinc-800">
                <div className="absolute top-4 left-4 text-zinc-400 text-xs font-medium uppercase tracking-wider">
                  {selectedMatch.court?.name || 'Cancha'}
                </div>
                <div className="absolute top-4 right-10">
                  {selectedMatch.status === 'live' ? (
                    <div className="text-[10px] font-bold text-white bg-red-500 animate-pulse px-2 py-0.5 rounded-full flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div> {selectedMatch.current_minute || '0'}'
                    </div>
                  ) : selectedMatch.status === 'halftime' ? (
                    <div className="text-[10px] font-bold text-white bg-amber-500 px-2 py-0.5 rounded-full">
                      HT
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                      FT
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-4 sm:gap-6 w-full mt-4">
                  {/* Local */}
                  <div className="flex-1 flex flex-col items-center gap-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center p-1.5 shadow-lg relative overflow-hidden">
                      {selectedMatch.home?.logo_url ? <img src={selectedMatch.home.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-300" />}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-center leading-tight truncate w-24 sm:w-full">{selectedMatch.home?.name}</span>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-3">
                    <span className="text-4xl sm:text-5xl font-black">{selectedMatch.home_score}</span>
                    <span className="text-zinc-600 font-light text-2xl sm:text-3xl">-</span>
                    <span className="text-4xl sm:text-5xl font-black">{selectedMatch.away_score}</span>
                  </div>

                  {/* Visitante */}
                  <div className="flex-1 flex flex-col items-center gap-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center p-1.5 shadow-lg relative overflow-hidden">
                      {selectedMatch.away?.logo_url ? <img src={selectedMatch.away.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-300" />}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-center leading-tight truncate w-24 sm:w-full">{selectedMatch.away?.name}</span>
                  </div>
                </div>
              </div>

              {/* Eventos Key Events */}
              <div className="flex-1 overflow-y-auto p-4 bg-zinc-950">
                <h3 className="text-sm font-bold text-zinc-100 mb-6 px-2">Key events</h3>
                
                <div className="relative w-full py-4">
                  {/* Línea central */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-800 -translate-x-1/2 z-0"></div>

                  <div className="space-y-4 relative z-10">
                    {stats
                      .filter(e => e.match_id === selectedMatch.id)
                      .sort((a, b) => (b.minute || 0) - (a.minute || 0))
                      .map((event, idx) => {
                        const isHome = event.team_id === selectedMatch.home_team_id
                        const isOwnGoal = event.event_type === 'goal' && event.player?.team_id && event.player?.team_id !== event.team_id
                        
                        return (
                          <div key={idx} className="flex items-center w-full">
                            
                            {/* Lado Izquierdo (Local) */}
                            <div className={`flex-1 pr-3 md:pr-6 flex flex-col items-end text-right ${!isHome ? 'invisible' : ''}`}>
                              <div className="flex items-center justify-end gap-2 w-full">
                                <span className={`text-xs sm:text-sm font-semibold ${isOwnGoal ? 'text-red-500' : 'text-zinc-200'}`}>{event.player?.first_name} {event.player?.last_name}</span>
                                <span className="text-[10px] font-bold text-zinc-500">{event.minute}'</span>
                              </div>
                              {event.event_type === 'goal' && (
                                <span className="text-[10px] text-zinc-500 mt-0.5">
                                  {isOwnGoal ? '(Autogol)' : selectedMatch.home?.name}
                                </span>
                              )}
                              {event.event_type === 'assist' && (
                                <span className="text-[10px] text-zinc-500 mt-0.5">Asistencia</span>
                              )}
                            </div>

                            {/* Ícono central */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 border-2 border-zinc-800 shrink-0 shadow-sm z-20 mx-auto">
                              {event.event_type === 'goal' && <span className="text-sm">⚽</span>}
                              {event.event_type === 'yellow_card' && <div className="w-3 h-4 bg-yellow-400 rounded-sm"></div>}
                              {event.event_type === 'red_card' && <div className="w-3 h-4 bg-red-600 rounded-sm"></div>}
                              {event.event_type === 'assist' && <span className="text-xs">👟</span>}
                            </div>

                            {/* Lado Derecho (Visitante) */}
                            <div className={`flex-1 pl-3 md:pl-6 flex flex-col items-start text-left ${isHome ? 'invisible' : ''}`}>
                              <div className="flex items-center justify-start gap-2 w-full">
                                <span className="text-[10px] font-bold text-zinc-500">{event.minute}'</span>
                                <span className={`text-xs sm:text-sm font-semibold ${isOwnGoal ? 'text-red-500' : 'text-zinc-200'}`}>{event.player?.first_name} {event.player?.last_name}</span>
                              </div>
                              {event.event_type === 'goal' && (
                                <span className="text-[10px] text-zinc-500 mt-0.5">
                                  {isOwnGoal ? '(Autogol)' : selectedMatch.away?.name}
                                </span>
                              )}
                              {event.event_type === 'assist' && (
                                <span className="text-[10px] text-zinc-500 mt-0.5">Asistencia</span>
                              )}
                            </div>

                          </div>
                        )
                    })}
                    {stats.filter(e => e.match_id === selectedMatch.id).length === 0 && (
                      <div className="text-center py-10 text-zinc-500 text-xs italic bg-zinc-950">
                        No hay eventos clave registrados en este partido.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DETALLES DEL EQUIPO (MODAL) */}
      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-[#0a0a0a] border-zinc-800 text-white rounded-xl h-[85vh] flex flex-col">
          <DialogTitle className="sr-only">Detalles del Equipo</DialogTitle>
          {selectedTeam && (() => {
            // Calculate stats for this team
            const teamStandings = liveStandings.find(s => s.team_id === selectedTeam.id) || { pj: 0, g: 0, p: 0, gf: 0, gc: 0 };
            const teamMatches = matches.filter(m => m.home_team_id === selectedTeam.id || m.away_team_id === selectedTeam.id).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
            
            let yellowCards = 0;
            let redCards = 0;
            stats.filter(e => e.team_id === selectedTeam.id).forEach(e => {
              if (e.event_type === 'yellow_card') yellowCards += (e.quantity || 1);
              if (e.event_type === 'red_card') redCards += (e.quantity || 1);
            });

            return (
              <div className="flex flex-col h-full bg-[#0a0a0a]">
                {/* Header */}
                <div className="relative bg-[#111] p-4 pt-6 flex items-center justify-center border-b border-zinc-800">
                  <button onClick={() => setIsTeamModalOpen(false)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="flex flex-col items-center gap-2">
                     <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center p-2 relative overflow-hidden">
                        {selectedTeam.logo_url ? <img src={selectedTeam.logo_url} className="w-full h-full object-contain drop-shadow-md" /> : <Shield className="w-6 h-6 text-zinc-300" />}
                     </div>
                     <span className="font-bold text-sm tracking-wide">{selectedTeam.name}</span>
                  </div>
                </div>
                
                {/* Tabs for Team Details */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <Tabs defaultValue="partidos" className="w-full flex-1 flex flex-col">
                    <TabsList className="w-full flex justify-around bg-[#111] border-b border-zinc-800 rounded-none h-12 p-0">
                      <TabsTrigger value="partidos" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-400">Partidos</TabsTrigger>
                      <TabsTrigger value="estadisticas" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-400">Estadísticas</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0a]">
                      <TabsContent value="partidos" className="m-0 space-y-6">
                        {teamMatches.length > 0 ? teamMatches.map(match => {
                          const isFinished = match.status === 'finished';
                          const isLive = match.status === 'live' || match.status === 'halftime';
                          
                          return (
                            <div key={match.id} className="bg-[#161616] rounded-xl p-4 border border-zinc-800/50">
                               <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-3 pb-2 border-b border-zinc-800/50">
                                 <span className="flex items-center gap-1 font-medium">
                                    <Calendar className="w-3 h-3 text-red-500" /> 
                                    {new Date(match.match_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                 </span>
                                 <span className="uppercase tracking-wider">
                                    {match.court?.name || 'Cancha'}
                                 </span>
                               </div>
                               <div className="flex items-center">
                                 <div className="flex flex-col gap-3 flex-1">
                                    {/* Home Team */}
                                    <div className="flex items-center gap-3">
                                       <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                                         {match.home?.logo_url ? <img src={match.home?.logo_url} className="max-w-full max-h-full object-contain" /> : <Shield className="w-4 h-4 text-zinc-500" />}
                                       </div>
                                       <span className={`text-sm font-medium ${match.home_team_id === selectedTeam.id ? 'text-white' : 'text-zinc-300'}`}>
                                          {match.home?.name}
                                       </span>
                                       <span className={`ml-auto font-bold text-base ${(isFinished || isLive) ? 'text-white' : 'text-zinc-600'}`}>
                                          {(isFinished || isLive) ? match.home_score : '-'}
                                       </span>
                                    </div>
                                    {/* Away Team */}
                                    <div className="flex items-center gap-3">
                                       <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                                         {match.away?.logo_url ? <img src={match.away?.logo_url} className="max-w-full max-h-full object-contain" /> : <Shield className="w-4 h-4 text-zinc-500" />}
                                       </div>
                                       <span className={`text-sm font-medium ${match.away_team_id === selectedTeam.id ? 'text-white' : 'text-zinc-300'}`}>
                                          {match.away?.name}
                                       </span>
                                       <span className={`ml-auto font-bold text-base ${(isFinished || isLive) ? 'text-white' : 'text-zinc-600'}`}>
                                          {(isFinished || isLive) ? match.away_score : '-'}
                                       </span>
                                    </div>
                                 </div>
                                 
                                 {/* Status indicator on the right */}
                                 <div className={`ml-4 pl-4 border-l-2 flex items-center justify-center w-20 text-center ${isLive ? 'border-red-500' : isFinished ? 'border-emerald-500' : 'border-zinc-700'}`}>
                                    <span className="text-[10px] text-zinc-400 leading-tight">
                                      {isLive ? <span className="text-red-500 font-bold animate-pulse">EN VIVO<br/>{match.current_minute || ''}'</span> : 
                                       isFinished ? 'Final del partido' : 
                                       match.match_time}
                                    </span>
                                 </div>
                               </div>
                            </div>
                          )
                        }) : (
                          <div className="text-center py-10 text-zinc-500 text-sm">No hay partidos registrados.</div>
                        )}
                      </TabsContent>

                      <TabsContent value="estadisticas" className="m-0 space-y-8">
                         <div>
                            <h4 className="text-sm font-bold text-white mb-4">Generales</h4>
                            <div className="bg-[#161616] rounded-xl overflow-hidden border border-zinc-800/50">
                               <div className="flex justify-between items-center p-3.5 border-b border-zinc-800/50">
                                 <span className="text-sm text-zinc-300">Partidos</span>
                                 <span className="font-bold text-white text-base">{teamStandings.pj}</span>
                               </div>
                               <div className="flex justify-between items-center p-3.5 border-b border-zinc-800/50">
                                 <span className="text-sm text-zinc-300">Goles</span>
                                 <span className="font-bold text-white text-base">{teamStandings.gf}</span>
                               </div>
                               <div className="flex justify-between items-center p-3.5 border-b border-zinc-800/50">
                                 <span className="text-sm text-zinc-300">Goles en contra</span>
                                 <span className="font-bold text-white text-base">{teamStandings.gc}</span>
                               </div>
                               <div className="flex justify-between items-center p-3.5 border-b border-zinc-800/50">
                                 <span className="text-sm text-zinc-300">Victorias</span>
                                 <span className="font-bold text-white text-base">{teamStandings.g}</span>
                               </div>
                               <div className="flex justify-between items-center p-3.5">
                                 <span className="text-sm text-zinc-300">Derrotas</span>
                                 <span className="font-bold text-white text-base">{teamStandings.p}</span>
                               </div>
                            </div>
                         </div>

                         <div>
                            <h4 className="text-sm font-bold text-white mb-4">Disciplina</h4>
                            <div className="bg-[#161616] rounded-xl overflow-hidden border border-zinc-800/50">
                               <div className="flex justify-between items-center p-3.5 border-b border-zinc-800/50">
                                 <span className="text-sm text-zinc-300">Tarjetas Amarillas</span>
                                 <span className="font-bold text-white text-base">{yellowCards}</span>
                               </div>
                               <div className="flex justify-between items-center p-3.5">
                                 <span className="text-sm text-zinc-300">Tarjetas Rojas</span>
                                 <span className="font-bold text-white text-base">{redCards}</span>
                               </div>
                            </div>
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
    </Tabs>
  )
}
