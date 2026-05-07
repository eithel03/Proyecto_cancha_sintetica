'use client'

import { useState, useEffect } from 'react'
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
  Timer, Goal, Square, Zap, Loader2 
} from 'lucide-react'
import { upsertTeam, deleteTeam, upsertPlayer, deletePlayer, upsertMatch, deleteMatch, addMatchEvent, deleteFullTournament, autoStartMatches } from './actions'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { cn } from '@/lib/utils'

export default function TournamentClient({ 
  businessId, 
  initialTeams, 
  initialPlayers, 
  initialMatches, 
  courts 
}: { 
  businessId: string, 
  initialTeams: any[], 
  initialPlayers: any[], 
  initialMatches: any[],
  courts: any[]
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

  const [isUploading, setIsUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [selectedEventType, setSelectedEventType] = useState('goal')
  const [selectedTeamIdForEvent, setSelectedTeamIdForEvent] = useState('')

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
              setMatches(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
            } else if (payload.eventType === 'INSERT') {
              setMatches(prev => {
                if (prev.some(m => m.id === payload.new.id)) return prev
                return [payload.new, ...prev]
              })
            } else if (payload.eventType === 'DELETE') {
              setMatches(prev => prev.filter(m => m.id !== payload.old.id))
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-zinc-900/50 p-1 border border-zinc-800/40 rounded-2xl h-12">
          <TabsTrigger value="teams" className="gap-2 rounded-xl data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all"><Users className="w-4 h-4" /> Equipos</TabsTrigger>
          <TabsTrigger value="players" className="gap-2 rounded-xl data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all"><UserPlus className="w-4 h-4" /> Jugadores</TabsTrigger>
          <TabsTrigger value="matches" className="gap-2 rounded-xl data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all"><Calendar className="w-4 h-4" /> Jornadas</TabsTrigger>
        </TabsList>

      {/* --- TAB EQUIPOS --- */}
      <TabsContent value="teams">
        <Card className="border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/60 bg-zinc-950/50">
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
                      <Input id="captain_phone" name="captain_phone" defaultValue={editingTeam?.captain_phone} placeholder="Ej: 8888-9999" />
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
                  <TableRow key={team.id} className="border-zinc-800/40 hover:bg-white/[0.02] transition-colors group">
                    <TableCell className="px-6">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full border flex items-center justify-center overflow-hidden">
                        {team.logo_url ? (
                          <img src={team.logo_url} className="w-full h-full object-contain" alt={team.name} />
                        ) : (
                          <Shield className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.captain_name || '-'}</TableCell>
                    <TableCell>{team.captain_phone || '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => { setEditingTeam(team); setLogoUrl(team.logo_url || ''); setIsTeamDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTeam(team.id)}>
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
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/60 bg-zinc-950/50">
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
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Select value={matchStatusFilter} onValueChange={setMatchStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 bg-zinc-900/50 border-zinc-800 h-10 text-xs font-bold uppercase tracking-widest">
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

              <Select value={matchDateSort} onValueChange={setMatchDateSort}>
                <SelectTrigger className="w-full sm:w-48 bg-zinc-900/50 border-zinc-800 h-10 text-xs font-bold uppercase tracking-widest">
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

              <Dialog open={isMatchDialogOpen} onOpenChange={(val) => { setIsMatchDialogOpen(val); if(!val) setEditingMatch(null); }}>
                <DialogTrigger render={<Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> Nuevo Partido</Button>} />
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
                        <Input id="match_time" name="match_time" type="time" defaultValue={editingMatch?.match_time} required />
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
                        <div className="space-y-1">
                          <Label className="text-[10px]">Estado</Label>
                          <Select name="status" defaultValue={editingMatch?.status || 'scheduled'}>
                            <SelectTrigger className="w-full">
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
                      <div className="text-xs text-muted-foreground">{match.match_time}</div>
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
                      setSelectedEventType(val);
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
                    onValueChange={setSelectedTeamIdForEvent}
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
        onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        variant={confirmConfig.variant}
      />
      </Tabs>
    </div>
  )
}
