'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Swords, Clock, TrendingUp, Filter, CalendarDays, CalendarRange } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type FilterType = 'day' | 'week' | 'month'

interface DashboardStatsProps {
  reservations: any[]
  challenges: any[]
}

export function DashboardStats({ reservations, challenges }: DashboardStatsProps) {
  const [filter, setFilter] = useState<FilterType>('week')
  const params = useParams()
  const slug = params.slug as string

  const stats = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Calcular inicio de semana (lunes)
    const startOfWeek = new Date(startOfToday)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let startDate: Date
    if (filter === 'day') startDate = startOfToday
    else if (filter === 'week') startDate = startOfWeek
    else startDate = startOfMonth

    const filteredReservations = reservations.filter(r => {
      const rDate = new Date(r.reservation_date + 'T12:00:00')
      return rDate >= startDate
    })

    const filteredChallenges = challenges.filter(c => {
      const cDate = new Date(c.challenge_date + 'T12:00:00')
      return cDate >= startDate
    })

    return {
      reservations: {
        total: filteredReservations.length,
        confirmed: filteredReservations.filter(r => r.status === 'confirmed').length,
        pending: filteredReservations.filter(r => r.status === 'pending').length
      },
      challenges: {
        total: filteredChallenges.length,
        open: filteredChallenges.filter(c => c.status === 'open').length,
        accepted: filteredChallenges.filter(c => c.status === 'accepted').length,
        confirmed: filteredChallenges.filter(c => c.status === 'confirmed').length
      }
    }
  }, [reservations, challenges, filter])

  const filterOptions: { id: FilterType; label: string; icon: any }[] = [
    { id: 'day', label: 'Hoy', icon: Clock },
    { id: 'week', label: 'Semana', icon: CalendarDays },
    { id: 'month', label: 'Mes', icon: CalendarRange },
  ]

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-1 py-1 bg-zinc-900/50 border border-white/5 rounded-2xl backdrop-blur-md">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                filter === opt.id 
                  ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card de Reservas */}
        <Link href={`/${slug}/admin/reservations`} className="block">
          <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-md overflow-hidden group relative h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                  </div>
                  Reservas
                </CardTitle>
                <TrendingUp className="w-5 h-5 text-emerald-500/30" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black italic tracking-tighter text-white drop-shadow-2xl">
                  {stats.reservations.total}
                </span>
                <span className="text-zinc-500 font-black uppercase italic tracking-widest text-xs">Total del {filter === 'day' ? 'día' : filter === 'week' ? 'periodo' : 'mes'}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 text-center">Confirmadas</p>
                  <p className="text-2xl font-black text-emerald-500 text-center">{stats.reservations.confirmed}</p>
                </div>
                <div className="p-4 rounded-3xl bg-zinc-900/50 border border-white/5 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Pendientes</p>
                  <p className="text-2xl font-black text-white text-center">{stats.reservations.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card de Retos */}
        <Link href={`/${slug}/admin/retos`} className="block">
          <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-md overflow-hidden group relative h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Swords className="w-5 h-5 text-blue-500" />
                  </div>
                  Retos
                </CardTitle>
                <TrendingUp className="w-5 h-5 text-blue-500/30" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black italic tracking-tighter text-white drop-shadow-2xl">
                  {stats.challenges.total}
                </span>
                <span className="text-zinc-500 font-black uppercase italic tracking-widest text-xs">Publicados</span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-1 text-center">
                  <p className="text-[8px] font-black uppercase tracking-tighter text-blue-500/60">Abiertos</p>
                  <p className="text-xl font-black text-blue-500">{stats.challenges.open}</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-1 text-center">
                  <p className="text-[8px] font-black uppercase tracking-tighter text-amber-500/60">Aceptados</p>
                  <p className="text-xl font-black text-amber-500">{stats.challenges.accepted}</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-1 text-center">
                  <p className="text-[8px] font-black uppercase tracking-tighter text-emerald-500/60">Confirm.</p>
                  <p className="text-xl font-black text-emerald-500">{stats.challenges.confirmed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
