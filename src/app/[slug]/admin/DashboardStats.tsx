'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Swords,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatTime12h } from '@/lib/utils'

type PeriodFilter = 'day' | 'week' | 'month'
type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | string
type ChallengeStatus = 'open' | 'accepted' | 'confirmed' | 'cancelled' | 'completed' | string
type RelatedName = { name: string | null } | { name: string | null }[] | null
type RelatedProfile = { full_name: string | null } | { full_name: string | null }[] | null

type ReservationRecord = {
  id: string
  status: ReservationStatus | null
  reservation_date: string
  start_time: string
  end_time: string
  customer_name: string
  created_at: string | null
  courts?: ({ name: string | null; description?: string | null } | { name: string | null; description?: string | null }[]) | null
}

type ChallengeRecord = {
  id: string
  status: ChallengeStatus | null
  challenge_date: string
  challenge_time: string
  customer_name: string | null
  notes: string | null
  created_at: string | null
  courts?: ({ name: string | null; description?: string | null } | { name: string | null; description?: string | null }[]) | null
  creator?: RelatedProfile
  opponent?: RelatedProfile
}

type CombinedActivity = {
  id: string
  type: 'reservation' | 'challenge'
  title: string
  status: string
  date: string
  time: string
  createdAt: string
}

interface DashboardStatsProps {
  reservations: ReservationRecord[]
  challenges: ChallengeRecord[]
  businessName: string
  today: string
}

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: 'day', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
]

const reservationLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

const challengeLabels: Record<string, string> = {
  open: 'Abierto',
  accepted: 'Aceptado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Completado',
}

export function DashboardStats({ reservations, challenges, businessName, today }: DashboardStatsProps) {
  const [period, setPeriod] = useState<PeriodFilter>('week')
  const params = useParams()
  const slug = params.slug as string

  const periodRange = useMemo(() => getPeriodRange(period), [period])

  const filteredReservations = useMemo(
    () => reservations.filter((reservation) => isDateInRange(reservation.reservation_date, periodRange)),
    [periodRange, reservations],
  )

  const filteredChallenges = useMemo(
    () => challenges.filter((challenge) => isDateInRange(challenge.challenge_date, periodRange)),
    [challenges, periodRange],
  )

  const reservationStats = useMemo(
    () => ({
      total: filteredReservations.length,
      confirmed: filteredReservations.filter((reservation) => reservation.status === 'confirmed').length,
      pending: filteredReservations.filter((reservation) => reservation.status === 'pending').length,
      cancelled: filteredReservations.filter((reservation) => reservation.status === 'cancelled').length,
    }),
    [filteredReservations],
  )

  const challengeStats = useMemo(
    () => ({
      total: filteredChallenges.length,
      open: filteredChallenges.filter((challenge) => challenge.status === 'open').length,
      accepted: filteredChallenges.filter((challenge) => challenge.status === 'accepted').length,
      confirmed: filteredChallenges.filter((challenge) => challenge.status === 'confirmed').length,
    }),
    [filteredChallenges],
  )

  const todayReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => reservation.reservation_date === today && reservation.status !== 'cancelled')
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .slice(0, 4),
    [reservations, today],
  )

  const recentActivity = useMemo(
    () =>
      [
        ...reservations.map((reservation): CombinedActivity => ({
          id: reservation.id,
          type: 'reservation',
          title: reservation.customer_name || 'Reserva sin nombre',
          status: reservation.status || 'pending',
          date: reservation.reservation_date,
          time: reservation.start_time,
          createdAt: reservation.created_at || `${reservation.reservation_date}T${reservation.start_time}`,
        })),
        ...challenges.map((challenge): CombinedActivity => ({
          id: challenge.id,
          type: 'challenge',
          title: getChallengeTitle(challenge),
          status: challenge.status || 'open',
          date: challenge.challenge_date,
          time: challenge.challenge_time,
          createdAt: challenge.created_at || `${challenge.challenge_date}T${challenge.challenge_time}`,
        })),
      ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [challenges, reservations],
  )

  const pendingReservations = reservations.filter((reservation) => reservation.status === 'pending').length
  const openChallenges = challenges.filter((challenge) => challenge.status === 'open' || challenge.status === 'accepted').length
  const hasAttention = pendingReservations > 0 || openChallenges > 0
  const periodLabel = period === 'day' ? 'hoy' : period === 'week' ? 'la semana' : 'el mes'

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{businessName}</h1>
          <p className="mt-1 text-base font-medium text-slate-600 sm:text-lg">Panel de control</p>
        </div>

        <div className="grid w-full grid-cols-3 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto sm:min-w-80">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={cn(
                'min-h-10 rounded-lg px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                period === option.value ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-900 hover:bg-slate-100',
              )}
              aria-pressed={period === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-label="Métricas principales">
        <MetricCard
          href={`/${slug}/admin/reservations`}
          title="Reservas"
          subtitle={`Total de ${periodLabel}.`}
          total={reservationStats.total}
          icon={Calendar}
          metrics={[
            { label: 'Confirmadas', value: reservationStats.confirmed, tone: 'green', icon: CheckCircle2 },
            { label: 'Pendientes', value: reservationStats.pending, tone: 'amber', icon: Clock },
            { label: 'Canceladas', value: reservationStats.cancelled, tone: 'red', icon: XCircle },
          ]}
        />

        <MetricCard
          href={`/${slug}/admin/retos`}
          title="Retos"
          subtitle={`Publicados de ${periodLabel}.`}
          total={challengeStats.total}
          icon={Zap}
          iconTone="purple"
          metrics={[
            { label: 'Abiertos', value: challengeStats.open, tone: 'blue' },
            { label: 'Aceptados', value: challengeStats.accepted, tone: 'amber' },
            { label: 'Confirmados', value: challengeStats.confirmed, tone: 'green' },
          ]}
        />
      </section>

      <Card className="rounded-xl border-amber-200 bg-amber-50/40 py-0 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
            <div className="flex min-w-0 flex-1 gap-4">
              <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-orange-500" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black uppercase text-orange-600">Requiere atención</h2>
                <p className="text-sm text-slate-600">Elementos que necesitan tu revisión.</p>

                {hasAttention ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {pendingReservations > 0 && (
                      <AttentionSummary
                        icon={Calendar}
                        title="Reservas pendientes"
                        value={pendingReservations}
                        description="Reservas esperando confirmación"
                        tone="orange"
                      />
                    )}
                    {openChallenges > 0 && (
                      <AttentionSummary
                        icon={Swords}
                        title="Retos abiertos"
                        value={openChallenges}
                        description="Pendientes de revisión o respuesta"
                        tone="blue"
                      />
                    )}
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-dashed border-amber-200 bg-white/70 p-4 text-sm font-medium text-slate-600">
                    No hay elementos que requieran atención.
                  </div>
                )}
              </div>
            </div>

            {hasAttention && (
              <Link
                href={`/${slug}/admin/reservations?status=pendientes`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-amber-500 px-5 text-sm font-black text-slate-950 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              >
                Ver elementos pendientes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1fr]">
        <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-base font-black uppercase text-slate-950">Disponibilidad de hoy</h2>
              <Link href={`/${slug}/admin/reservations`} className="inline-flex items-center gap-1 text-sm font-black text-emerald-700 hover:text-emerald-800">
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {todayReservations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {todayReservations.map((reservation) => (
                  <div key={reservation.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Calendar className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black text-slate-950">{reservation.customer_name}</p>
                      <p className="truncate text-sm text-slate-600">
                        {getCourtName(reservation.courts) || 'Cancha sin asignar'}
                        {getCourtDescription(reservation.courts) ? ` · ${getCourtDescription(reservation.courts)}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm font-black text-emerald-700">
                      <p>{formatTime12h(reservation.start_time)}</p>
                      <p>{formatTime12h(reservation.end_time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-5 text-sm font-medium text-slate-500">
                No hay reservas programadas para hoy.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 bg-white py-0 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-base font-black uppercase text-slate-950">Últimas reservas y retos</h2>
              <Link href={`/${slug}/admin/reservations`} className="inline-flex items-center gap-1 text-sm font-black text-emerald-700 hover:text-emerald-800">
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {recentActivity.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentActivity.map((item) => (
                  <ActivityRow key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-5 text-sm font-medium text-slate-500">
                No hay reservas ni retos registrados.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function MetricCard({
  href,
  title,
  subtitle,
  total,
  icon: Icon,
  iconTone = 'green',
  metrics,
}: {
  href: string
  title: string
  subtitle: string
  total: number
  icon: LucideIcon
  iconTone?: 'green' | 'purple'
  metrics: { label: string; value: number; tone: StatusTone; icon?: LucideIcon }[]
}) {
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
      <Card className="h-full rounded-xl border-slate-200 bg-white py-0 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex h-full min-h-64 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black uppercase text-slate-950">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </div>
            <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', iconTone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-100 text-purple-700')}>
              <Icon className="h-5 w-5" />
            </span>
          </div>

          <p className="mt-5 text-5xl font-black leading-none text-slate-950">{total}</p>

          <div className="mt-auto grid grid-cols-1 gap-3 pt-6 sm:grid-cols-3">
            {metrics.map((metric) => (
              <StatusMetric key={metric.label} {...metric} />
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

type StatusTone = 'green' | 'amber' | 'red' | 'blue' | 'orange'

const toneClasses: Record<StatusTone, { box: string; text: string; icon: string; badge: string }> = {
  green: {
    box: 'border-emerald-100 bg-emerald-50',
    text: 'text-emerald-700',
    icon: 'text-emerald-700',
    badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  amber: {
    box: 'border-amber-100 bg-amber-50',
    text: 'text-amber-700',
    icon: 'text-amber-700',
    badge: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  orange: {
    box: 'border-orange-100 bg-orange-50',
    text: 'text-orange-600',
    icon: 'text-orange-600',
    badge: 'border-orange-100 bg-orange-50 text-orange-600',
  },
  red: {
    box: 'border-rose-100 bg-rose-50',
    text: 'text-rose-600',
    icon: 'text-rose-600',
    badge: 'border-rose-100 bg-rose-50 text-rose-600',
  },
  blue: {
    box: 'border-blue-100 bg-blue-50',
    text: 'text-blue-700',
    icon: 'text-blue-700',
    badge: 'border-blue-100 bg-blue-50 text-blue-700',
  },
}

function StatusMetric({ label, value, tone, icon: Icon }: { label: string; value: number; tone: StatusTone; icon?: LucideIcon }) {
  const styles = toneClasses[tone]

  return (
    <div className={cn('min-h-24 rounded-lg border p-4', styles.box)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn('text-xs font-black uppercase', styles.text)}>{label}</p>
          <p className={cn('mt-3 text-3xl font-black leading-none', styles.text)}>{value}</p>
        </div>
        {Icon && <Icon className={cn('h-6 w-6 shrink-0', styles.icon)} />}
      </div>
    </div>
  )
}

function AttentionSummary({
  icon: Icon,
  title,
  value,
  description,
  tone,
}: {
  icon: LucideIcon
  title: string
  value: number
  description: string
  tone: StatusTone
}) {
  const styles = toneClasses[tone]

  return (
    <div className="flex items-center gap-4 border-slate-200 md:border-r md:pr-6 last:border-r-0">
      <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-lg', styles.box, styles.text)}>
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="text-3xl font-black leading-none text-slate-950">{value}</p>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
    </div>
  )
}

function ActivityRow({ item }: { item: CombinedActivity }) {
  const isReservation = item.type === 'reservation'
  const statusLabel = isReservation ? reservationLabels[item.status] || item.status : challengeLabels[item.status] || item.status

  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-center">
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', isReservation ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700')}>
        {isReservation ? <Calendar className="h-4 w-4" /> : <Swords className="h-4 w-4" />}
      </span>
      <p className="min-w-0 truncate text-sm font-semibold text-slate-950">{item.title}</p>
      <Badge variant="outline" className="w-fit border-slate-200 bg-slate-100 text-slate-700">
        {isReservation ? 'Reserva' : 'Reto'}
      </Badge>
      <Badge variant="outline" className={cn('w-fit', getStatusBadgeTone(item.status, item.type))}>
        {statusLabel}
      </Badge>
      <p className="col-span-2 text-sm text-slate-600 sm:col-span-1 sm:text-right">{formatActivityDate(item.date, item.time)}</p>
    </div>
  )
}

function getPeriodRange(period: PeriodFilter) {
  const today = getDatePartsInTimeZone(new Date(), 'America/Costa_Rica')
  const start = new Date(today.year, today.month - 1, today.day)
  const end = new Date(start)

  if (period === 'day') {
    end.setDate(start.getDate() + 1)
    return { start, end }
  }

  if (period === 'week') {
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    end.setDate(start.getDate() + 7)
    return { start, end }
  }

  start.setDate(1)
  end.setMonth(start.getMonth() + 1, 1)
  return { start, end }
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  }
}

function isDateInRange(date: string, range: { start: Date; end: Date }) {
  const value = new Date(`${date}T12:00:00`)
  return value >= range.start && value < range.end
}

function getRelatedName(value: RelatedName) {
  if (Array.isArray(value)) return value[0]?.name || null
  return value?.name || null
}

function getRelatedProfileName(value: RelatedProfile) {
  if (Array.isArray(value)) return value[0]?.full_name || null
  return value?.full_name || null
}

function getCourtName(court: ReservationRecord['courts'] | ChallengeRecord['courts']) {
  return getRelatedName(court || null)
}

function getCourtDescription(court: ReservationRecord['courts'] | ChallengeRecord['courts']) {
  const value = Array.isArray(court) ? court[0] : court
  return value?.description || null
}

function getChallengeTitle(challenge: ChallengeRecord) {
  const creator = getRelatedProfileName(challenge.creator || null)
  const opponent = getRelatedProfileName(challenge.opponent || null)

  if (creator && opponent) return `${creator} vs ${opponent}`
  return challenge.customer_name || challenge.notes || 'Reto publicado'
}

function getStatusBadgeTone(status: string, type: CombinedActivity['type']) {
  if (status === 'confirmed' || status === 'completed') return toneClasses.green.badge
  if (status === 'cancelled') return toneClasses.red.badge
  if (type === 'challenge' && status === 'open') return toneClasses.blue.badge
  return toneClasses.amber.badge
}

function formatActivityDate(date: string, time: string) {
  const today = new Date()
  const value = new Date(`${date}T12:00:00`)
  const isToday =
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth() &&
    value.getDate() === today.getDate()

  if (isToday) return `Hoy ${formatTime12h(time)}`

  const formatted = new Intl.DateTimeFormat('es-CR', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(`${date}T${time}`))

  return formatted.replace('.', '')
}
