'use client'

import { useState } from 'react'
import { CalendarDays, Check, Clock, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatTime12h } from '@/lib/utils'
import { updateBusinessHours } from './actions'

type Hour = { id?: string; business_id?: string; day_of_week: number; open_time: string; close_time: string; is_closed: boolean }
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function normalizeHour(hour: Partial<Hour>, day: number): Hour { return { day_of_week: day, open_time: (hour.open_time || '08:00').slice(0, 5), close_time: (hour.close_time || '22:00').slice(0, 5), is_closed: Boolean(hour.is_closed) } }

export default function BusinessHoursManager({ businessId, initialHours }: { businessId: string; initialHours: Hour[] }) {
  const [hours, setHours] = useState<Hour[]>(() => Array.from({ length: 7 }, (_, day) => normalizeHour(initialHours.find((item) => item.day_of_week === day) || {}, day)))
  const [pending, setPending] = useState(false)

  const changeHour = (day: number, field: keyof Pick<Hour, 'open_time' | 'close_time' | 'is_closed'>, value: string | boolean) => setHours((current) => current.map((item) => item.day_of_week === day ? { ...item, [field]: value } : item))
  const copySchedule = (sourceDay: number) => { const source = hours[sourceDay]; setHours((current) => current.map((item) => item.day_of_week === sourceDay ? item : { ...item, open_time: source.open_time, close_time: source.close_time, is_closed: source.is_closed })); toast.success('Horario copiado a los demás días.') }
  const saveHours = async () => {
    const invalid = hours.find((item) => !item.is_closed && item.close_time <= item.open_time)
    if (invalid) return toast.error(`Revisa el horario del ${DAYS[invalid.day_of_week]}. El cierre debe ser posterior a la apertura.`)
    setPending(true); const result = await updateBusinessHours(businessId, hours); setPending(false)
    if (result.error) toast.error(result.error); else toast.success('Horarios actualizados correctamente')
  }

  return <Card className="border-slate-200 bg-white shadow-sm"><CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="flex items-center gap-2 text-lg text-slate-900"><Clock className="h-5 w-5 text-emerald-700" />Horarios de atención</CardTitle><CardDescription className="text-slate-500">Define cuándo pueden realizarse reservas en tu complejo.</CardDescription></CardHeader><CardContent className="space-y-3 pt-5"><div className="hidden grid-cols-[minmax(150px,1fr)_120px_1fr_100px] gap-4 px-4 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid"><span>Día</span><span>Estado</span><span>Horario</span><span /></div>{hours.slice(1).concat(hours[0]).map((item) => <div key={item.day_of_week} className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-[minmax(150px,1fr)_120px_1fr_100px] sm:items-center"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700">{DAYS[item.day_of_week].slice(0, 2)}</span><span className="font-semibold text-slate-800">{DAYS[item.day_of_week]}</span></div><div className="flex items-center gap-2"><Switch id={`day-${item.day_of_week}`} checked={!item.is_closed} onCheckedChange={(checked) => changeHour(item.day_of_week, 'is_closed', !checked)} /><Label htmlFor={`day-${item.day_of_week}`} className="text-sm text-slate-600">{item.is_closed ? 'Cerrado' : 'Abierto'}</Label></div>{item.is_closed ? <div className="text-sm italic text-slate-400">Sin reservas este día</div> : <div className="flex items-center gap-2"><div><Input aria-label={`Apertura ${DAYS[item.day_of_week]}`} type="time" value={item.open_time} onChange={(event) => changeHour(item.day_of_week, 'open_time', event.target.value)} className="w-32 border-slate-300" /><p className="mt-1 text-xs text-slate-500">{formatTime12h(item.open_time)}</p></div><span className="text-slate-400">a</span><div><Input aria-label={`Cierre ${DAYS[item.day_of_week]}`} type="time" value={item.close_time} onChange={(event) => changeHour(item.day_of_week, 'close_time', event.target.value)} className="w-32 border-slate-300" /><p className="mt-1 text-xs text-slate-500">{formatTime12h(item.close_time)}</p></div></div>}<Button type="button" variant="outline" onClick={() => copySchedule(item.day_of_week)} className="w-full border-slate-300 text-slate-600 sm:w-auto"><Copy className="mr-2 h-4 w-4" />Copiar</Button></div>)}<div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500"><CalendarDays className="mr-1 inline h-4 w-4" />Puedes copiar cualquier horario a los demás días.</p><Button type="button" onClick={saveHours} disabled={pending} className="bg-emerald-700 text-white hover:bg-emerald-800">{pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : <><Check className="mr-2 h-4 w-4" />Guardar horarios</>}</Button></div></CardContent></Card>
}
