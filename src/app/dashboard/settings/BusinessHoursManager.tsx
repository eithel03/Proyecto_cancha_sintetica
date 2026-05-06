'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clock, CalendarOff } from 'lucide-react'
import { updateBusinessHours } from './actions'
import { toast } from 'sonner'

const DAYS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
]

export default function BusinessHoursManager({ businessId, initialHours }: { businessId: string, initialHours: any[] }) {
  // Inicializar con valores por defecto si no hay nada en la BD
  const [hours, setHours] = useState(() => {
    const defaultHours = Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      open_time: '08:00',
      close_time: '22:00',
      is_closed: false
    }))

    if (initialHours && initialHours.length > 0) {
      initialHours.forEach(h => {
        defaultHours[h.day_of_week] = {
          ...h,
          open_time: h.open_time.substring(0, 5),
          close_time: h.close_time.substring(0, 5)
        }
      })
    }
    return defaultHours
  })

  const [pending, setPending] = useState(false)

  const handleToggle = (dayIndex: number) => {
    setHours(prev => prev.map(h => h.day_of_week === dayIndex ? { ...h, is_closed: !h.is_closed } : h))
  }

  const handleTimeChange = (dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
    setHours(prev => prev.map(h => h.day_of_week === dayIndex ? { ...h, [field]: value } : h))
  }

  const saveHours = async () => {
    setPending(true)
    const result = await updateBusinessHours(businessId, hours)
    setPending(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Horarios actualizados correctamente')
    }
  }

  return (
    <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Horarios de Atención
        </CardTitle>
        <CardDescription>Configura las horas en las que tu sintética está disponible para reservas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {DAYS.map((day, index) => (
            <div key={day} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${hours[index].is_closed ? 'bg-zinc-900/20 border-white/5 opacity-60' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-4 mb-2 sm:mb-0">
                <div className={`w-2 h-2 rounded-full ${hours[index].is_closed ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                <span className="font-bold w-24">{day}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
                {!hours[index].is_closed ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300 w-full sm:w-auto justify-center sm:justify-start">
                    <Input 
                      type="time" 
                      value={hours[index].open_time} 
                      onChange={(e) => handleTimeChange(index, 'open_time', e.target.value)}
                      className="w-24 sm:w-32 bg-zinc-900 border-white/10 h-10 sm:h-11 text-sm"
                    />
                    <span className="text-muted-foreground font-bold">-</span>
                    <Input 
                      type="time" 
                      value={hours[index].close_time} 
                      onChange={(e) => handleTimeChange(index, 'close_time', e.target.value)}
                      className="w-24 sm:w-32 bg-zinc-900 border-white/10 h-10 sm:h-11 text-sm"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-500 font-medium italic animate-in slide-in-from-right-4 py-2">
                    <CalendarOff className="w-4 h-4" /> Cerrado
                  </div>
                )}
                
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-white/5 sm:border-white/10 pt-3 sm:pt-0 sm:pl-6 sm:ml-2">
                  <Label htmlFor={`closed-${index}`} className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500 cursor-pointer">
                    {hours[index].is_closed ? 'CERRADO' : 'ABIERTO'}
                  </Label>
                  <Switch 
                    id={`closed-${index}`}
                    checked={!hours[index].is_closed} 
                    onCheckedChange={() => handleToggle(index)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={saveHours} className="w-full font-black text-lg py-6 shadow-xl shadow-primary/20" disabled={pending}>
          {pending ? 'Guardando cambios...' : 'Confirmar Horarios Semanales'}
        </Button>
      </CardContent>
    </Card>
  )
}
