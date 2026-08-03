'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Plus, Pencil, Trash2, Trophy, Users, Calendar, UserPlus, Shield, 
  Timer, Goal, Square, Zap, Loader2, Activity, X, Target, ShieldAlert, Clock, User
} from 'lucide-react'
import { upsertTeam, deleteTeam, upsertPlayer, deletePlayer, upsertMatch, deleteMatch, addMatchEvent, deleteFullTournament, autoStartMatches } from './actions'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { cn, formatTime12h } from '@/lib/utils'

export default function TournamentClient({ 
  businessId, 
  initialTeams, 
  initialPlayers, 
  initialMatches, 
  courts,
  stats = []
}: { 
  businessId: string, 
  initialTeams: any[], 
  initialPlayers: any[], 
  initialMatches: any[],
  courts: any[],
  stats?: any[]
}) {
  const [activeTab, setActiveTab] = useState('teams')
  const [selectedGender, setSelectedGender] = useState('masculino')
  
  const [playerSearch, setPlayerSearch] = useState('')
  const [teamSearch, setTeamSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [jerseySearch, setJerseySearch] = useState('')
  const [matchStatusFilter, setMatchStatusFilter] = useState('all')
  const [matchDateSort, setMatchDateSort] = useState('desc')
  const [matches, setMatches] = useState(initialMatches)

  // Sincronizar estado cuando cambian las props iniciales (por revalidatePath)
  useEffect(() => {
    setMatches(initialMatches)
  }, [initialMatches])
  
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false)
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false)
  
  const [editingTeam, setEditingTeam] = useState<any>(null)
  const [editingPlayer, setEditingPlayer] = useState<any>(null)
  const [editingMatch, setEditingMatch] = useState<any>(null)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [activeMatchForEvent, setActiveMatchForEvent] = useState<any>(null)
  const [eventPending, setEventPending] = useState(false)

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
  useEffect(() => {
    // Verificación inicial
    autoStartMatches(businessId)

    const timer = setInterval(() => {
      // 1. Actualizar minutos en vivo en la UI
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

      // 2. Verificar si algún partido debe iniciar automáticamente
      autoStartMatches(businessId)
    }, 30000) 

    return () => clearInterval(timer)
  }, [businessId])

  // Supabase Realtime subscription
  useEffect(() => {
    const setupRealtime = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const channelId = `tournament_matches_changes_${Math.random()}`
      const channel = supabase.channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tournament_matches', filter: `business_id=eq.${businessId}` },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setMatches((prev: any) => prev.map((m: any) => m.id === payload.new.id ? { ...m, ...payload.new } : m))
            } else if (payload.eventType === 'INSERT') {
              setMatches((prev: any) => {
                if (prev.some((m: any) => m.id === payload.new.id)) return prev
                return [payload.new, ...prev]
              })
            } else if (payload.eventType === 'DELETE') {
              setMatches((prev: any) => prev.filter((m: any) => m.id !== payload.old.id))
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    
    setupRealtime()
  }, [businessId])

  // Filtrado de jugadores por GÉNERO
  const filteredPlayers = initialPlayers.filter(player => {
    const matchesGender = (player.tournament_teams?.gender || 'masculino') === selectedGender
    const matchesSearch = `${player.first_name} ${player.last_name}`.toLowerCase().includes(playerSearch.toLowerCase())
    const matchesJersey = !jerseySearch || player.jersey_number?.toString().includes(jerseySearch)
    const matchesTeam = teamFilter === 'all' || player.team_id === teamFilter
    return matchesGender && matchesSearch && matchesJersey && matchesTeam
  })

  // Filtrado de equipos por GÉNERO
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

  // Filtrado de partidos por GÉNERO
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

  // --- HANDLERS EQUIPOS ---
  async function handleTeamSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.append('business_id', businessId)
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
        const res = await deleteTeam(id)
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
        const res = await deletePlayer(id)
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
        const res = await deleteMatch(id)
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
    setEventPending(true)
    const formData = new FormData(e.currentTarget)
    
    const eventData = {
      business_id: businessId,
      match_id: activeMatchForEvent.id,
      team_id: formData.get('team_id'),
      player_id: formData.get('player_id'),
      event_type: formData.get('event_type'),
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
    <div className="space-y-6">
      {/* Selector de Torneo (Género) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Trophy className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Torneo Activo</h2>
            <p className="text-lg font-black italic uppercase tracking-tighter text-white">
              {selectedGender === 'masculino' ? 'Masculino' : 'Femenino'}
            </p>
          </div>
        </div>
        
        <div className="flex p-1 bg-zinc-950 rounded-2xl border border-zinc-800">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedGender('masculino')}
            className={cn(
              "rounded-xl gap-2 font-bold px-4",
              selectedGender === 'masculino' ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Masculino
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedGender('femenino')}
            className={cn(
              "rounded-xl gap-2 font-bold px-4",
              selectedGender === 'femenino' ? "bg-pink-600 text-white hover:bg-pink-700 shadow-lg shadow-pink-900/20" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Femenino
          </Button>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDeleteFullTournament}
          className="rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 gap-2 h-10 px-4 font-black italic uppercase tracking-tighter"
        >
          <Trash2 className="w-4 h-4" /> Eliminar Torneo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v || 'teams')} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-zinc-900/50 p-1 border border-zinc-800/40 rounded-2xl h-12">
          <TabsTrigger value="teams" className="gap-2 rounded-xl data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all"><Users className="w-4 h-4" /> Equipos</TabsTrigger>
          <TabsTrigger value="players" className="gap-2 rounded-xl data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all"><UserPlus className="w-4 h-4" /> Jugadores</TabsTrigger>
          <TabsTrigger value="matches" className="gap-2 rounded-xl data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all"><Calendar className="w-4 h-4" /> Jornadas</TabsTrigger>
        </TabsList>

      {/* --- TAB EQUIPOS --- */}
      <TabsContent value="teams">
        <Card className="border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/60 bg-zinc-950/50">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Input 
                placeholder="Buscar equipo o capitán..." 
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full sm:w-64 bg-zinc-900/50 border-zinc-800"
              />
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
                      <Input id="name" name="name" defaultValue={editingTeam?.name} required placeholder="Ej: Los Galácticos" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="captain_name">Nombre del Capitán</Label>
                      <Input id="captain_name" name="captain_name" defaultValue={editingTeam?.captain_name} placeholder="Nombre completo" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="captain_phone">Teléfono del Capitán</Label>
                      <Input id="captain_phone" name="captain_phone" type="tel" inputMode="tel" defaultValue={editingTeam?.captain_phone} placeholder="Ej: 88888888 o 8888-8888" />
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
                            <img src={logoUrl || editingTeam?.logo_url} className="w-full h-full object-contain" alt="Logo preview" />
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
                                
                                const { data, error } = await supabase.storage
                                  .from('logos')
                                  .upload(filePath, file)
                                  
                                if (error) throw error
                                
                                const { data: { publicUrl } } = supabase.storage
                                  .from('logos')
                                  .getPublicUrl(filePath)
                                  
                                setLogoUrl(publicUrl)
                                toast.success('Logo cargado correctamente')
                              } catch (error: any) {
                                toast.error('Error al cargar imagen: ' + error.message)
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
            <Table>
              <TableHeader className="bg-zinc-900/30">
                <TableRow className="border-zinc-800/60">
                  <TableHead className="w-16 px-6 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Logo</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Nombre</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Capitán</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Teléfono</TableHead>
                  <TableHead className="text-right px-6 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow 
                    key={team.id} 
                    className="border-zinc-800/40 hover:bg-white/[0.04] transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedViewTeam(team)
                      setIsViewTeamModalOpen(true)
                    }}
                  >
                    <TableCell className="px-6">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full border flex items-center justify-center overflow-hidden">
                        {team.logo_url ? (
                          <img src={team.logo_url} className="w-full h-full object-contain" alt={team.name} />
                        ) : (
                          <Shield className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-white group-hover:text-primary transition-colors">{team.name}</TableCell>
                    <TableCell>{team.captain_name || '-'}</TableCell>
                    <TableCell>{team.captain_phone || '-'}</TableCell>
                    <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); setEditingTeam(team); setLogoUrl(team.logo_url || ''); setIsTeamDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTeams.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground bg-zinc-900/10">
                      <div className="flex flex-col items-center gap-3">
                        <Shield className="w-10 h-10 opacity-10" />
                        <p className="font-bold uppercase italic tracking-tighter text-lg">No se encontraron equipos</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* --- TAB JUGADORES --- */}
      <TabsContent value="players">
        <Card className="border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/60 bg-zinc-950/50">
            <div>
              <CardTitle>Jugadores</CardTitle>
              <CardDescription>Inscribe jugadores y asígnalos a sus respectivos equipos.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Input 
                placeholder="Buscar jugador..." 
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="w-full sm:w-48 bg-zinc-900/50 border-zinc-800"
              />
              <Input 
                placeholder="Dorsal #" 
                type="number"
                value={jerseySearch}
                onChange={(e) => setJerseySearch(e.target.value)}
                className="w-full sm:w-24 bg-zinc-900/50 border-zinc-800"
              />
              <Select value={teamFilter} onValueChange={(val) => setTeamFilter(val || 'all')}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Todos los equipos">
                    {(val: any) => val === 'all' ? 'Todos los equipos' : currentTeams.find(t => t.id === val)?.name || 'Todos los equipos'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los equipos</SelectItem>
                  {currentTeams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isPlayerDialogOpen} onOpenChange={(val) => { setIsPlayerDialogOpen(val); if(!val) setEditingPlayer(null); }}>
                <DialogTrigger render={<Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo Jugador</Button>} />
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
                              {(val: any) => initialTeams.find(t => t.id === val)?.name || 'Selecciona equipo'}
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
                          <Input id="jersey_number" name="jersey_number" type="number" defaultValue={editingPlayer?.jersey_number} />
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>Posición</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.first_name} {player.last_name}</TableCell>
                    <TableCell>{player.tournament_teams?.name}</TableCell>
                    <TableCell>{player.jersey_number || '-'}</TableCell>
                    <TableCell>{player.position || '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => { setEditingPlayer(player); setIsPlayerDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeletePlayer(player.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPlayers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se encontraron jugadores con esos filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* --- TAB JORNADAS --- */}
      <TabsContent value="matches">
        <Card className="border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/60 bg-zinc-950/50">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 w-full">
              <Select value={matchStatusFilter} onValueChange={(v) => setMatchStatusFilter(v || 'all')}>
                <SelectTrigger className="w-full sm:w-[190px] shrink-0 bg-zinc-900/50 border-zinc-800 h-10 text-xs font-bold uppercase tracking-widest">
                  <SelectValue placeholder="Estado">
                    {(val: any) => {
                      const statusMap: Record<string, string> = { 
                        all: 'Todos los estados', 
                        scheduled: 'Programado', 
                        live: 'En Vivo', 
                        halftime: 'Entretiempo', 
                        finished: 'Finalizado', 
                        cancelled: 'Cancelado' 
                      };
                      return statusMap[val] || 'Estado';
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
                <SelectTrigger className="w-full sm:w-[240px] shrink-0 bg-zinc-900/50 border-zinc-800 h-10 text-xs font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5" />
                    <SelectValue placeholder="Orden Fecha">
                      {(val: any) => val === 'desc' ? 'Más reciente primero' : 'Más antiguo primero'}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="desc" className="text-xs font-bold uppercase">Más reciente primero</SelectItem>
                  <SelectItem value="asc" className="text-xs font-bold uppercase">Más antiguo primero</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isMatchDialogOpen} onOpenChange={(val) => { setIsMatchDialogOpen(val); if(!val) { setEditingMatch(null); setMatchTime(''); } }}>
                <DialogTrigger render={<Button className="w-full sm:w-auto gap-2 shrink-0"><Plus className="w-4 h-4" /> Nuevo Partido</Button>} />
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
                              {(val: any) => initialTeams.find(t => t.id === val)?.name || 'Local'}
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
                              {(val: any) => initialTeams.find(t => t.id === val)?.name || 'Visitante'}
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
                        <Select name="match_time" defaultValue={editingMatch?.match_time} required onValueChange={setMatchTime}>
                          <SelectTrigger className="w-full bg-zinc-900 border-white/10 h-10">
                            <SelectValue placeholder="--:--" />
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
                            Identificado como: {formatTime12h(matchTime || editingMatch.match_time)}
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
                            {(val: any) => courts.find(c => c.id === val)?.name || 'Opcional'}
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
                                {(val: any) => {
                                  const statusMap: Record<string, string> = { scheduled: 'Programado', live: 'En Vivo', halftime: 'Entretiempo', finished: 'Finalizado', cancelled: 'Cancelado' };
                                  return statusMap[val] || 'Estado';
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
            <Table>
              <TableHeader className="bg-zinc-900/30">
                <TableRow className="border-zinc-800/60">
                  <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Fecha / Hora</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Encuentro</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic text-center">Resultado</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Estado</TableHead>
                  <TableHead className="text-right px-6 font-bold uppercase text-[10px] tracking-widest text-zinc-500 italic">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.map((match) => (
                  <TableRow key={match.id} className="border-zinc-800/40 hover:bg-white/[0.02] transition-colors group">
                    <TableCell className="px-6">
                      <div className="font-medium">
                        {match.match_date.split('-').reverse().join('/')}
                      </div>
                      <div className="text-xs text-muted-foreground font-bold">{formatTime12h(match.match_time)}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">{match.home?.name}</span> vs <span className="font-bold">{match.away?.name}</span>
                    </TableCell>
                    <TableCell>
                      {match.status === 'finished' || match.status === 'live' || match.status === 'halftime' ? (
                        <div className="flex flex-col items-center">
                          <Badge variant={match.status === 'live' ? 'destructive' : (match.status === 'halftime' ? 'outline' : 'secondary')} className="text-lg font-bold">
                            {match.home_score} - {match.away_score}
                          </Badge>
                          {match.status === 'live' && (
                            <span className="text-[10px] font-bold text-red-500 animate-pulse mt-1">
                              🔴 {match.current_minute}' min
                            </span>
                          )}
                          {match.status === 'halftime' && (
                            <span className="text-[10px] font-bold text-amber-500 mt-1">
                              HT (Entretiempo)
                            </span>
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={match.status === 'finished' ? 'default' : (match.status === 'live' ? 'destructive' : (match.status === 'halftime' ? 'outline' : (match.status === 'cancelled' ? 'destructive' : 'outline')))}>
                        {match.status === 'finished' ? 'Finalizado' : (match.status === 'live' ? 'EN VIVO' : (match.status === 'halftime' ? 'ENTRETIEMPO' : (match.status === 'cancelled' ? 'Cancelado' : 'Programado')))}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {match.status === 'live' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-500 border-red-200 bg-red-50 hover:bg-red-100"
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
                      <Button variant="outline" size="icon" onClick={() => { setEditingMatch(match); setIsMatchDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteMatch(match.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
          </CardContent>
        </Card>
      </TabsContent>

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
                        {(val: any) => {
                          const typeMap: Record<string, string> = { goal: '⚽ Gol', own_goal: '⚽❌ Autogol', assist: '👟 Asistencia', yellow_card: '🟨 Tarjeta Amarilla', red_card: '🟥 Tarjeta Roja' };
                          return typeMap[val] || 'Tipo de Evento';
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goal">⚽ Gol</SelectItem>
                      <SelectItem value="own_goal">⚽❌ Autogol</SelectItem>
                      <SelectItem value="assist">👟 Asistencia</SelectItem>
                      <SelectItem value="yellow_card">🟨 Tarjeta Amarilla</SelectItem>
                      <SelectItem value="red_card">🟥 Tarjeta Roja</SelectItem>
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
                        {(val: any) => val === activeMatchForEvent?.home_team_id ? `${activeMatchForEvent?.home?.name} (Local)` : (val === activeMatchForEvent?.away_team_id ? `${activeMatchForEvent?.away?.name} (Visitante)` : 'Selecciona equipo')}
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
                        {(val: any) => {
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
        onOpenChange={(open: any) => setConfirmConfig((prev: any) => ({ ...prev, isOpen: open }))}
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
              if (m.status === 'finished' || m.status === 'live' || m.status === 'halftime') {
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

            const yellowCards = stats.filter(s => s.team_id === selectedViewTeam.id && s.event_type === 'yellow_card').length
            const redCards = stats.filter(s => s.team_id === selectedViewTeam.id && s.event_type === 'red_card').length
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
                        {teamPlayers.length === 0 ? (
                          <div className="text-center py-20 bg-zinc-900/20 rounded-[32px] border border-dashed border-white/5">
                            <User className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500 font-black uppercase italic tracking-tighter text-lg">No hay jugadores registrados en este equipo</p>
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            {teamPlayers.sort((a: any, b: any) => {
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
