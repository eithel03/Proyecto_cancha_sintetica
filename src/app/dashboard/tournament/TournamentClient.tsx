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
import { upsertTeam, deleteTeam, upsertPlayer, deletePlayer, upsertMatch, deleteMatch, addMatchEvent } from './actions'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

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
  
  // Estados para búsqueda y filtrado de jugadores
  const [playerSearch, setPlayerSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')

  // Estado para partidos (para manejar el temporizador visual)
  const [matches, setMatches] = useState(initialMatches)
  
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
    }, 10000) // Update UI every 10 seconds for more responsiveness

    return () => clearInterval(timer)
  }, [])

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
              setMatches(prev => [payload.new, ...prev])
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

  // Filtrado de jugadores
  const filteredPlayers = initialPlayers.filter(player => {
    const matchesSearch = `${player.first_name} ${player.last_name}`.toLowerCase().includes(playerSearch.toLowerCase())
    const matchesTeam = teamFilter === 'all' || player.team_id === teamFilter
    return matchesSearch && matchesTeam
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
  }

  async function handleDeleteTeam(id: string) {
    if (!confirm('¿Estás seguro de eliminar este equipo?')) return
    const res = await deleteTeam(id)
    if (res.error) return toast.error(res.error)
    toast.success('Equipo eliminado')
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

  async function handleDeletePlayer(id: string) {
    if (!confirm('¿Estás seguro de eliminar este jugador?')) return
    const res = await deletePlayer(id)
    if (res.error) return toast.error(res.error)
    toast.success('Jugador eliminado')
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

  async function handleDeleteMatch(id: string) {
    if (!confirm('¿Estás seguro de eliminar este partido?')) return
    const res = await deleteMatch(id)
    if (res.error) return toast.error(res.error)
    toast.success('Partido eliminado')
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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="teams" className="gap-2"><Users className="w-4 h-4" /> Equipos</TabsTrigger>
        <TabsTrigger value="players" className="gap-2"><UserPlus className="w-4 h-4" /> Jugadores</TabsTrigger>
        <TabsTrigger value="matches" className="gap-2"><Calendar className="w-4 h-4" /> Jornadas</TabsTrigger>
      </TabsList>

      {/* --- TAB EQUIPOS --- */}
      <TabsContent value="teams">
        <Card className="border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/60 bg-zinc-950/50">
            <div>
              <CardTitle>Equipos del Torneo</CardTitle>
              <CardDescription>Gestiona los equipos inscritos en tu campeonato.</CardDescription>
            </div>
            <Dialog open={isTeamDialogOpen} onOpenChange={(val) => { setIsTeamDialogOpen(val); if(!val) { setEditingTeam(null); setLogoUrl(''); } }}>
              <DialogTrigger render={<Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo Equipo</Button>} />
              <DialogContent>
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
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Logo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Capitán</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
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
                {initialTeams.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No hay equipos registrados.
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
                className="w-full sm:w-48"
              />
              <Select value={teamFilter} onValueChange={(val) => setTeamFilter(val || 'all')}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Todos los equipos">
                    {(val: any) => val === 'all' ? 'Todos los equipos' : initialTeams.find(t => t.id === val)?.name || 'Todos los equipos'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los equipos</SelectItem>
                  {initialTeams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isPlayerDialogOpen} onOpenChange={(val) => { setIsPlayerDialogOpen(val); if(!val) setEditingPlayer(null); }}>
                <DialogTrigger render={<Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo Jugador</Button>} />
                <DialogContent>
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
                            {initialTeams.map(t => (
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
            <div>
              <CardTitle>Jornadas / Partidos</CardTitle>
              <CardDescription>Programa encuentros y registra resultados.</CardDescription>
            </div>
            <Dialog open={isMatchDialogOpen} onOpenChange={(val) => { setIsMatchDialogOpen(val); if(!val) setEditingMatch(null); }}>
              <DialogTrigger render={<Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo Partido</Button>} />
              <DialogContent className="max-w-md">
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
                            {initialTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
                            {initialTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha / Hora</TableHead>
                  <TableHead>Encuentro</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      <div className="font-medium">{new Date(match.match_date).toLocaleDateString()}</div>
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
                          onClick={() => { setActiveMatchForEvent(match); setIsEventDialogOpen(true); }}
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
                {matches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hay partidos programados.
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
                  <Select name="event_type" defaultValue="goal" required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tipo de Evento">
                        {(val: any) => {
                          const typeMap: Record<string, string> = { goal: '⚽ Gol', assist: '👟 Asistencia', yellow_card: '🟨 Tarjeta Amarilla', red_card: '🟥 Tarjeta Roja' };
                          return typeMap[val] || 'Tipo de Evento';
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goal">⚽ Gol</SelectItem>
                      <SelectItem value="assist">👟 Asistencia</SelectItem>
                      <SelectItem value="yellow_card">🟨 Tarjeta Amarilla</SelectItem>
                      <SelectItem value="red_card">🟥 Tarjeta Roja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Equipo</Label>
                  <Select name="team_id" required>
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
                  <Label>Jugador</Label>
                  <Select name="player_id" required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona jugador">
                        {(val: any) => {
                          const p = initialPlayers.find(p => p.id === val);
                          return p ? `${p.first_name} ${p.last_name} (${p.tournament_teams?.name})` : 'Selecciona jugador';
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {initialPlayers
                        .filter(p => p.team_id === activeMatchForEvent.home_team_id || p.team_id === activeMatchForEvent.away_team_id)
                        .map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.tournament_teams?.name})</SelectItem>
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
    </Tabs>
  )
}
