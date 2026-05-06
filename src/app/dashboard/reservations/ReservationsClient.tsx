'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateReservationStatus } from './actions'
import { toast } from 'sonner'
import { MessageCircle, CheckCircle, XCircle, Clock, Calendar, Phone, Mail, StickyNote } from 'lucide-react'

export default function ReservationsClient({ initialReservations }: { initialReservations: any[] }) {

  async function handleStatusChange(id: string, status: string) {
    const result = await updateReservationStatus(id, status)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Reserva marcada como ${status}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmed': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Confirmada</Badge>
      case 'pending': return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600">Pendiente</Badge>
      case 'cancelled': return <Badge variant="destructive">Cancelada</Badge>
      case 'completed': return <Badge className="bg-blue-500 hover:bg-blue-600">Completada</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getWhatsAppLink = (res: any, type: 'general' | 'confirm' | 'cancel') => {
    let cleanPhone = res.customer_phone.replace(/[^0-9]/g, '')
    if (!cleanPhone || cleanPhone === 'Sin teléfono') return null
    
    // Si tiene 8 dígitos (formato CR), agregar el 506
    const finalPhone = cleanPhone.length === 8 ? `506${cleanPhone}` : cleanPhone
    
    let message = ''
    if (type === 'confirm') {
      message = `Hola ${res.customer_name}, ¡buenas noticias! Tu reserva para ${res.courts?.name} el día ${res.reservation_date} a las ${res.start_time} ha sido CONFIRMADA. ⚽ ¡Te esperamos!`
    } else if (type === 'cancel') {
      message = `Hola ${res.customer_name}, lamentamos informarte que tu reserva para el día ${res.reservation_date} ha sido CANCELADA. Por favor contáctanos para reprogramar.`
    } else {
      message = `Hola ${res.customer_name}, te contacto desde la cancha sobre tu reserva para el ${res.reservation_date}.`
    }
    
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Reservas</h2>
        <p className="text-muted-foreground">Gestiona y confirma las solicitudes de tus clientes.</p>
      </div>

      {initialReservations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            No hay reservas registradas por el momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {initialReservations.map((res) => (
            <Card key={res.id} className="overflow-hidden border-zinc-200 dark:border-zinc-800 bg-[#0a0a0a]/50 backdrop-blur-xl">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Info Section */}
                  <div className="flex-1 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${res.is_tournament ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                          {res.customer_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-none">{res.customer_name}</h3>
                          <p className={`text-sm font-medium mt-1 ${res.is_tournament ? 'text-red-500' : 'text-emerald-500'}`}>
                            {res.courts?.name} {res.is_tournament && '(Torneo)'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {res.is_tournament && <Badge className="bg-red-600">TORNEO</Badge>}
                        {getStatusBadge(res.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-zinc-100" />
                        <span className="font-medium text-zinc-100">{res.reservation_date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4 text-zinc-100" />
                        <span className="font-medium text-zinc-100">{res.start_time.substring(0, 5)} - {res.end_time.substring(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4 text-zinc-100" />
                        <span className="font-medium text-zinc-100">{res.customer?.phone || res.customer_phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4 text-zinc-100" />
                        <span className="font-medium text-zinc-100 truncate max-w-[150px]">{res.customer_email || 'No disponible'}</span>
                      </div>
                    </div>

                    {res.notes && (
                      <div className="flex gap-2 p-3 bg-zinc-900/50 rounded-xl border border-white/5 text-sm">
                        <StickyNote className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="text-zinc-400 italic">"{res.notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Section */}
                  <div className="bg-zinc-900/30 p-6 flex flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-white/5 min-w-[200px]">
                    {res.is_tournament ? (
                      <div className="text-center py-4">
                        <Badge variant="outline" className="border-red-500/30 text-red-500/60 uppercase text-[10px] tracking-widest">Gestionado en Torneo</Badge>
                      </div>
                    ) : (
                      <>
                        {/* El botón de WhatsApp solo se muestra cuando la reserva NO está pendiente (ya fue confirmada) */}
                        {res.status !== 'pending' && (res.customer?.phone || res.customer_phone) !== 'Sin teléfono' && (
                          <a 
                            href={getWhatsAppLink({ ...res, customer_phone: res.customer?.phone || res.customer_phone }, res.status === 'confirmed' ? 'confirm' : 'general') || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full"
                          >
                            <Button variant="outline" className="w-full border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500">
                              <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                            </Button>
                          </a>
                        )}
                        
                        {res.status === 'pending' && (
                          <>
                            <Button 
                              onClick={() => handleStatusChange(res.id, 'confirmed')} 
                              className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Confirmar
                            </Button>
                            <Button 
                              onClick={() => handleStatusChange(res.id, 'cancelled')} 
                              variant="ghost" 
                              className="w-full text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Cancelar
                            </Button>
                          </>
                        )}
                        
                        {res.status === 'confirmed' && (
                          <Button 
                            onClick={() => handleStatusChange(res.id, 'completed')} 
                            className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Completar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
