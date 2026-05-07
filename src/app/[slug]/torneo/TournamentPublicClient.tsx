'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Trophy, Calendar, Users, BarChart3, User, Shield, Zap, X, ChevronLeft, Activity, Target, ShieldAlert, Clock, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { autoStartMatches } from '@/app/dashboard/tournament/actions'

export default function TournamentPublicClient({ businessId, matches: initialMatches, standings: initialStandings, teams: initialTeams, stats }: {
  businessId: string,
  matches: any[],
  standings: any[],
  teams: any[],
  stats: any[]
}) {
  const [matches, setMatches] = useState(initialMatches)
  const [selectedGender, setSelectedGender] = useState('masculino')
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  
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

  // AUTO-INICIO DE PARTIDOS
  useEffect(() => {
    // Verificación inicial
    autoStartMatches(businessId)
    
    // Verificación periódica cada minuto
    const interval = setInterval(() => {
      autoStartMatches(businessId)
    }, 60000)

    return () => clearInterval(interval)
  }, [businessId])

  // FILTROS POR GÉNERO
  const filteredMatches = matches.filter(m => (m.gender || 'masculino') === selectedGender)
  const filteredStandings = initialStandings.filter(s => (s.gender || 'masculino') === selectedGender)
  const filteredTeams = initialTeams.filter(t => (t.gender || 'masculino') === selectedGender)
  const filteredStats = (stats || []).filter(s => (s.team?.gender || 'masculino') === selectedGender)

  const liveMatches = filteredMatches.filter(m => m.status === 'live' || m.status === 'halftime')
  
  const matchesByDate = filteredMatches
    .filter(m => m.status !== 'live' && m.status !== 'halftime')
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

  const cards = filteredStats
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

  // Nota: liveStandings ahora debe usar filteredTeams y filteredMatches
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

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-1000">
      {/* Selector de Rama (Género) para el público */}
      <div className="max-w-md mx-auto p-1.5 bg-zinc-900/50 border border-white/5 rounded-3xl flex gap-1 shadow-2xl backdrop-blur-xl">
        <button 
          onClick={() => setSelectedGender('masculino')}
          className={`flex-1 py-3 px-6 rounded-2xl font-black italic uppercase tracking-wider text-xs transition-all duration-500 flex items-center justify-center gap-2 ${
            selectedGender === 'masculino' 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.02]' 
            : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Trophy className="w-4 h-4" /> Masculino
        </button>
        <button 
          onClick={() => setSelectedGender('femenino')}
          className={`flex-1 py-3 px-6 rounded-2xl font-black italic uppercase tracking-wider text-xs transition-all duration-500 flex items-center justify-center gap-2 ${
            selectedGender === 'femenino' 
            ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20 scale-[1.02]' 
            : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Trophy className="w-4 h-4" /> Femenino
        </button>
      </div>
      <Tabs defaultValue="jornada" className="w-full">
        <div className="sticky top-16 sm:top-20 z-30 py-4 bg-zinc-950/80 backdrop-blur-md mb-4 sm:mb-8 px-2">
          <TabsList className="flex w-full max-w-3xl mx-auto h-14 sm:h-16 bg-zinc-900/50 border border-white/5 rounded-[20px] sm:rounded-[24px] p-1 sm:p-1.5 gap-1 sm:gap-1.5 shadow-2xl overflow-x-auto no-scrollbar">
            {[
              { id: 'jornada', label: 'FECHA', icon: Calendar },
              { id: 'clasificacion', label: 'TABLA', icon: Trophy },
              { id: 'estadisticas', label: 'STATS', icon: BarChart3 },
              { id: 'equipos', label: 'EQUIPOS', icon: Users },
            ].map(tab => (
              <TabsTrigger 
                key={tab.id}
                value={tab.id} 
                data-value={tab.id}
                className="flex-1 min-w-[75px] sm:min-w-0 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-xs tracking-[0.05em] sm:tracking-[0.1em] data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 transition-all uppercase italic whitespace-nowrap px-2"
              >
                <tab.icon className="w-3 h-3 mr-1.5 hidden xs:block md:block" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="jornada" className="space-y-8 sm:space-y-12">
          {liveMatches.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 sm:gap-4 px-2">
                <div className="w-2 sm:w-3 h-8 sm:h-10 bg-red-600 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.6)]" />
                <h3 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase text-white">En Vivo</h3>
              </div>
              <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
                {liveMatches.map((match: any) => (
                  <Card 
                    key={match.id} 
                    className="overflow-hidden border-red-500/30 bg-red-500/[0.03] backdrop-blur-md cursor-pointer hover:border-red-500/60 transition-all rounded-[32px] sm:rounded-[40px] group shadow-2xl shadow-red-950/20"
                    onClick={() => { setSelectedMatch(match); setIsModalOpen(true); }}
                  >
                    <CardContent className="p-0">
                      <div className="bg-red-600/20 px-6 sm:px-8 py-3 sm:py-4 flex justify-between items-center border-b border-red-500/10">
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                          <MapPin className="w-3 h-3" /> {match.court?.name}
                        </span>
                        <div className="flex items-center gap-2 sm:gap-3 text-white font-black italic">
                          <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-white"></span>
                          </span>
                          <span className="text-xs sm:text-sm tracking-widest">{match.status === 'live' ? `${match.current_minute || '0'}'` : 'MITAD'}</span>
                        </div>
                      </div>
                      <div className="p-6 sm:p-10 flex items-center justify-between gap-2 sm:gap-4">
                        <div className="text-center flex-1 space-y-3 sm:space-y-4">
                          <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto bg-white rounded-[20px] sm:rounded-[28px] p-2 sm:p-3 shadow-2xl rotate-[-4deg] group-hover:rotate-0 transition-all duration-500">
                            {match.home?.logo_url ? <img src={match.home.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-zinc-300" />}
                          </div>
                          <p className="font-black text-[10px] sm:text-sm uppercase tracking-tight text-white leading-tight">{match.home?.name}</p>
                        </div>
                        <div className="px-2 sm:px-4 flex flex-col items-center">
                          <div className="flex items-baseline gap-2 sm:gap-4">
                            <span className="text-4xl sm:text-7xl font-black italic text-white leading-none drop-shadow-xl">{match.home_score}</span>
                            <span className="text-xl sm:text-3xl font-black text-red-500/40">:</span>
                            <span className="text-4xl sm:text-7xl font-black italic text-white leading-none drop-shadow-xl">{match.away_score}</span>
                          </div>
                        </div>
                        <div className="text-center flex-1 space-y-3 sm:space-y-4">
                          <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto bg-white rounded-[20px] sm:rounded-[28px] p-2 sm:p-3 shadow-2xl rotate-[4deg] group-hover:rotate-0 transition-all duration-500">
                            {match.away?.logo_url ? <img src={match.away.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-zinc-300" />}
                          </div>
                          <p className="font-black text-[10px] sm:text-sm uppercase tracking-tight text-white leading-tight">{match.away?.name}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {sortedDates.map(date => (
            <div key={date} className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-3 sm:gap-4 px-2">
                <div className="w-2 sm:w-3 h-8 sm:h-10 bg-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.6)]" />
                <h3 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white">
                  {new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                {matchesByDate[date].map((match: any) => (
                  <Card 
                    key={match.id} 
                    className="border-white/5 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all cursor-pointer rounded-[24px] sm:rounded-[32px] group relative overflow-hidden"
                    onClick={() => { setSelectedMatch(match); setIsModalOpen(true); }}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-5 sm:p-8">
                      <div className="flex items-center justify-between gap-2 sm:gap-6">
                        <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-lg sm:rounded-2xl p-1.5 shadow-lg border border-white/10 group-hover:scale-110 transition-transform flex-shrink-0">
                            {match.home?.logo_url ? <img src={match.home.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-zinc-200" />}
                          </div>
                          <span className="font-black text-[10px] sm:text-base uppercase tracking-tight text-zinc-300 group-hover:text-white transition-colors">{match.home?.name}</span>
                        </div>
                        
                        <div className="flex flex-col items-center px-2 sm:px-6 border-x border-white/5 min-w-[60px] sm:min-w-[100px]">
                          {match.status === 'finished' ? (
                            <span className="text-xl sm:text-3xl font-black italic text-primary drop-shadow-sm">{match.home_score} - {match.away_score}</span>
                          ) : (
                            <span className="text-[10px] sm:text-sm font-black text-zinc-700 italic uppercase tracking-widest">VS</span>
                          )}
                          <span className="text-[8px] sm:text-[10px] font-black text-zinc-500 uppercase mt-1 sm:mt-2 flex items-center gap-1 whitespace-nowrap">
                             <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {match.match_time.substring(0, 5)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-5 flex-1 justify-end min-w-0">
                          <span className="font-black text-[10px] sm:text-base uppercase tracking-tight text-right text-zinc-300 group-hover:text-white transition-colors">{match.away?.name}</span>
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-lg sm:rounded-2xl p-1.5 shadow-lg border border-white/10 group-hover:scale-110 transition-transform flex-shrink-0">
                            {match.away?.logo_url ? <img src={match.away.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-zinc-200" />}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="clasificacion">
          <Card className="border-white/5 bg-zinc-950/40 backdrop-blur-3xl rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="hover:bg-transparent border-white/5 h-12 sm:h-16">
                    <TableHead className="w-12 sm:w-20 text-center font-black text-zinc-400 uppercase text-[9px] sm:text-[11px] tracking-widest italic">#</TableHead>
                    <TableHead className="font-black text-zinc-400 uppercase text-[9px] sm:text-[11px] tracking-widest italic">Equipo</TableHead>
                    <TableHead className="text-center font-black text-zinc-400 uppercase text-[9px] sm:text-[11px] tracking-widest italic">PJ</TableHead>
                    <TableHead className="text-center font-black text-zinc-400 uppercase text-[9px] sm:text-[11px] tracking-widest italic hidden sm:table-cell">G</TableHead>
                    <TableHead className="text-center font-black text-zinc-400 uppercase text-[9px] sm:text-[11px] tracking-widest italic hidden sm:table-cell">E</TableHead>
                    <TableHead className="text-center font-black text-zinc-400 uppercase text-[9px] sm:text-[11px] tracking-widest italic hidden sm:table-cell">P</TableHead>
                    <TableHead className="text-center font-black text-zinc-400 uppercase text-[9px] sm:text-[11px] tracking-widest italic">DG</TableHead>
                    <TableHead className="text-center font-black text-primary uppercase text-[9px] sm:text-[11px] tracking-widest italic">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveStandings.map((row, idx) => (
                    <TableRow key={row.team_id} className="border-white/5 hover:bg-white/[0.03] transition-all group h-16 sm:h-20">
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl font-black italic text-sm sm:text-lg ${idx === 0 ? 'bg-primary text-black shadow-lg shadow-primary/30' : 'text-zinc-500'}`}>
                          {idx + 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 sm:gap-5">
                          <div className="w-6 h-6 sm:w-12 sm:h-12 bg-white rounded-md sm:rounded-2xl p-1 sm:p-2 shadow-xl border border-white/10 group-hover:scale-110 transition-transform flex-shrink-0">
                            {row.logo_url ? <img src={row.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-zinc-200" />}
                          </div>
                          <span className="font-black uppercase tracking-tight text-white text-[10px] sm:text-lg truncate max-w-[80px] sm:max-w-none">{row.team_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-zinc-300 text-xs sm:text-sm">{row.pj}</TableCell>
                      <TableCell className="text-center text-emerald-500/80 font-bold text-xs sm:text-sm hidden sm:table-cell">{row.g}</TableCell>
                      <TableCell className="text-center text-zinc-400 font-bold text-xs sm:text-sm hidden sm:table-cell">{row.e}</TableCell>
                      <TableCell className="text-center text-red-500/80 font-bold text-xs sm:text-sm hidden sm:table-cell">{row.p}</TableCell>
                      <TableCell className="text-center text-zinc-400 font-black italic text-xs sm:text-sm">{row.dg > 0 ? `+${row.dg}` : row.dg}</TableCell>
                      <TableCell className="text-center">
                         <span className="text-lg sm:text-2xl font-black italic text-primary drop-shadow-md">{row.pts}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="estadisticas" className="space-y-8 sm:space-y-12">
          <div className="grid gap-6 sm:gap-10 md:grid-cols-2">
            <Card className="border-white/5 bg-zinc-900/30 rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 p-6 sm:p-8">
                <CardTitle className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 sm:gap-4 text-white">
                  <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl"><Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /></div> Goleadores
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {topScorers.map((scorer: any, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 sm:p-8 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-all group">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <span className="text-2xl sm:text-4xl font-black italic text-zinc-900 group-hover:text-primary/20 transition-colors">{idx + 1}</span>
                      <div>
                        <p className="font-black uppercase tracking-tight text-white text-sm sm:text-lg">{scorer.name}</p>
                        <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-1">{scorer.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-4xl font-black italic text-primary drop-shadow-lg">{scorer.goals}</span>
                      <p className="text-[8px] sm:text-[9px] font-black uppercase text-zinc-700 tracking-[0.3em] mt-1">GOLES</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-zinc-900/30 rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 p-6 sm:p-8">
                <CardTitle className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 sm:gap-4 text-white">
                   <div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl sm:rounded-2xl"><Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" /></div> Asistencias
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {topAssists.map((player: any, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 sm:p-8 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-all group">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <span className="text-2xl sm:text-4xl font-black italic text-zinc-900 group-hover:text-blue-500/20 transition-colors">{idx + 1}</span>
                      <div>
                        <p className="font-black uppercase tracking-tight text-white text-sm sm:text-lg">{player.name}</p>
                        <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-1">{player.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-4xl font-black italic text-blue-500 drop-shadow-lg">{player.assists}</span>
                      <p className="text-[8px] sm:text-[9px] font-black uppercase text-zinc-700 tracking-[0.3em] mt-1">PASES</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipos">
          <div className="grid gap-4 sm:gap-8 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredTeams.map((team, idx) => (
              <motion.div
                key={team.id}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => { setSelectedTeam(team); setIsTeamModalOpen(true); }}
                className="cursor-pointer"
              >
                <Card className="border-white/5 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all rounded-[24px] sm:rounded-[40px] text-center p-6 sm:p-8 h-full flex flex-col items-center group shadow-xl">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl sm:rounded-[32px] p-2 sm:p-4 shadow-2xl mb-4 sm:mb-6 group-hover:shadow-primary/10 transition-all">
                    {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-zinc-300" />}
                  </div>
                  <h4 className="font-black uppercase tracking-tighter text-white text-sm sm:text-lg mb-2 sm:mb-3 leading-tight">{team.name}</h4>
                  <div className="mt-auto inline-flex items-center gap-1 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-white/5 text-[8px] sm:text-[10px] font-black uppercase text-zinc-500 tracking-widest border border-white/5">
                    <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" /> {team.captain_name || 'Sin capitán'}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Match Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-zinc-950 border-white/10 text-white rounded-[40px] shadow-2xl">
          {selectedMatch && (
            <div className="flex flex-col h-[85vh]">
              <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 p-12 flex flex-col items-center border-b border-white/5">
                <div className="absolute top-6 left-8 flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
                  <MapPin className="w-3 h-3 text-primary" /> {selectedMatch.court?.name}
                </div>
                
                <div className="flex items-center justify-between w-full mt-6">
                  <div className="flex-1 flex flex-col items-center gap-4 text-center">
                    <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center p-4 shadow-2xl">
                      {selectedMatch.home?.logo_url ? <img src={selectedMatch.home.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-12 h-12 text-zinc-200" />}
                    </div>
                    <span className="font-black uppercase italic tracking-tighter text-lg">{selectedMatch.home?.name}</span>
                  </div>

                  <div className="flex flex-col items-center px-10">
                    <div className="flex items-baseline gap-4">
                      <span className="text-7xl font-black italic text-white drop-shadow-2xl">{selectedMatch.home_score}</span>
                      <span className="text-3xl font-black text-zinc-800">:</span>
                      <span className="text-7xl font-black italic text-white drop-shadow-2xl">{selectedMatch.away_score}</span>
                    </div>
                    {selectedMatch.status === 'live' && (
                       <Badge className="bg-red-600 text-white font-black px-4 py-1 mt-4 animate-pulse uppercase tracking-widest italic">{selectedMatch.current_minute}' LIVE</Badge>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-4 text-center">
                    <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center p-4 shadow-2xl">
                      {selectedMatch.away?.logo_url ? <img src={selectedMatch.away.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-12 h-12 text-zinc-200" />}
                    </div>
                    <span className="font-black uppercase italic tracking-tighter text-lg">{selectedMatch.away?.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-12 bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600 mb-10 text-center">Timeline</h3>
                
                <div className="relative space-y-8">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -translate-x-1/2" />

                  {stats
                    .filter(e => e.match_id === selectedMatch.id)
                    .sort((a, b) => (b.minute || 0) - (a.minute || 0))
                    .map((event, idx) => {
                      const isHome = event.team_id === selectedMatch.home_team_id
                      return (
                        <div key={idx} className={`flex items-center w-full ${isHome ? 'flex-row' : 'flex-row-reverse'}`}>
                          <div className={`flex-1 ${isHome ? 'text-right pr-10' : 'text-left pl-10'} space-y-1`}>
                            <p className={cn(
                              "font-black uppercase italic tracking-tight",
                              event.event_type === 'own_goal' ? "text-red-500" : "text-white"
                            )}>
                              {event.player?.first_name} {event.player?.last_name}
                            </p>
                            <p className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              event.event_type === 'own_goal' ? "text-red-600" : "text-zinc-600"
                            )}>
                               {event.event_type === 'goal' ? 'GOAL' : 
                                event.event_type === 'own_goal' ? 'AUTOGOL' : 
                                event.event_type === 'assist' ? 'ASISTENCIA' : 
                                event.event_type.replace('_', ' ')}
                            </p>
                          </div>
                          
                          <div className="relative z-10 w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-xl">
                            {event.event_type === 'goal' && <span className="text-lg">⚽</span>}
                            {event.event_type === 'own_goal' && <span className="text-lg">⚽❌</span>}
                            {event.event_type === 'assist' && <span className="text-lg">👟</span>}
                            {event.event_type === 'yellow_card' && <div className="w-3 h-5 bg-yellow-400 rounded-sm shadow-lg shadow-yellow-500/20" />}
                            {event.event_type === 'red_card' && <div className="w-3 h-5 bg-red-600 rounded-sm shadow-lg shadow-red-500/20" />}
                            <span className="absolute -top-2 -right-2 bg-primary text-black text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-lg">{event.minute}'</span>
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
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-zinc-950 border-white/10 text-white rounded-[40px] shadow-2xl">
          {selectedTeam && (() => {
            // Calculate Team Stats
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
                <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 sm:p-12 flex flex-col items-center border-b border-white/5">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-[32px] sm:rounded-[40px] flex items-center justify-center p-4 sm:p-6 shadow-2xl mb-6">
                    {selectedTeam.logo_url ? <img src={selectedTeam.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-200" />}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white mb-2 text-center">{selectedTeam.name}</h2>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" /> Capitán: {selectedTeam.captain_name || 'Sin capitán'}
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
                            const isHome = m.home_team_id === selectedTeam.id
                            const opp = isHome ? m.away : m.home
                            return (
                              <div key={m.id} className="bg-zinc-900/40 border border-white/5 p-5 sm:p-6 rounded-[24px] flex items-center justify-between gap-6 group hover:bg-zinc-900/80 transition-all">
                                <div className="flex flex-col gap-2">
                                   <div className="flex items-center gap-2">
                                     <span className="bg-white/5 px-2 py-0.5 rounded text-[8px] font-black text-zinc-500 uppercase">
                                       {new Date(m.match_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                     </span>
                                     <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{m.match_time.substring(0,5)}</span>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-white rounded-xl p-1.5 shadow-xl border border-white/10 group-hover:scale-110 transition-transform">
                                        {opp?.logo_url ? <img src={opp.logo_url} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-zinc-200" />}
                                      </div>
                                      <span className="text-sm sm:text-lg font-black uppercase text-zinc-100 italic tracking-tight">vs {opp?.name}</span>
                                   </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                   {m.status === 'finished' ? (
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
                        <div className="grid gap-3">
                          {selectedTeam.players?.sort((a: any, b: any) => {
                             const aGoals = stats.filter(s => s.player_id === a.id && s.event_type === 'goal').length
                             const bGoals = stats.filter(s => s.player_id === b.id && s.event_type === 'goal').length
                             return bGoals - aGoals
                          }).map((player: any, idx: number) => {
                            const pGoals = stats.filter(s => s.player_id === player.id && s.event_type === 'goal').length
                            const pYellow = stats.filter(s => s.player_id === player.id && s.event_type === 'yellow_card').length
                            const pRed = stats.filter(s => s.player_id === player.id && s.event_type === 'red_card').length
                            
                            return (
                              <div key={player.id} className="flex items-center justify-between p-5 rounded-[20px] bg-zinc-900/40 border border-white/5 hover:bg-zinc-900/80 transition-all group">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-black italic text-zinc-600 group-hover:text-primary/50 transition-colors">
                                      #{idx + 1}
                                    </div>
                                    <div>
                                      <p className="font-black uppercase tracking-tight text-white text-sm sm:text-base italic">{player.first_name} {player.last_name}</p>
                                      <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{player.position || 'Jugador'}</span>
                                      </div>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-6">
                                    {pGoals > 0 && (
                                      <div className="flex flex-col items-center">
                                        <span className="text-xl font-black italic text-primary">{pGoals}</span>
                                        <span className="text-[7px] font-black text-zinc-700 uppercase">Goles</span>
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
