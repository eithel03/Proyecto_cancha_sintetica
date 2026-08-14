'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Loader2,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Search,
  StickyNote,
  Table2,
  Trophy,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatTime12h } from '@/lib/utils'
import { createAdminReservation, exportReservationsCSV, getWeeklyReservations, updateReservationStatus, type WeeklyReservation } from './actions'

type Court = { id: string; name: string; description?: string | null }
type BusinessHour = { day_of_week: number; open_time: string; close_time: string; is_closed: boolean | null }
type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'finished' | string
type ReservationItem = WeeklyReservation & { status: ReservationStatus }
type ViewMode = 'calendar' | 'table'
type StatusFilter = 'todos' | 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'finished' | 'torneo'
type PeriodFilter = 'visible-week' | 'future' | 'past' | 'all'
type SortKey = 'date' | 'time' | 'client' | 'status' | 'court'
type SortDirection = 'asc' | 'desc'
type ManualDefaults = { reservation_date?: string; start_time?: string; court_id?: string }
type LayoutBlock = { reservation: ReservationItem; top: number; height: number; width: number; left: number }

const timeZone = 'America/Costa_Rica'
const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const mobileDayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const pixelsPerMinute = 1.2
const minBlockHeight = 88
const rowsPerPageOptions = [10, 20, 50]

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  completed: 'Completada',
  finished: 'Finalizada',
  scheduled: 'Programada',
}

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'completed', label: 'Completada' },
  { value: 'finished', label: 'Finalizada' },
  { value: 'torneo', label: 'Torneos' },
]

export default function ReservationsClient({
  initialReservations,
  courts,
  allCourts,
  businessId,
  businessHours,
  slug,
}: {
  initialReservations: ReservationItem[]
  courts: Court[]
  allCourts: Court[]
  businessId: string
  businessHours: BusinessHour[]
  slug: string
}) {
  const today = getTodayInTimeZone()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [reservations, setReservations] = useState<ReservationItem[]>(initialReservations)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today))
  const [weekReservations, setWeekReservations] = useState<ReservationItem[]>(() =>
    filterByDateRange(initialReservations, getWeekStart(today), addDays(getWeekStart(today), 6)),
  )
  const [query, setQuery] = useState('')
  const [courtFilter, setCourtFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('visible-week')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualPending, setManualPending] = useState(false)
  const [manualDefaults, setManualDefaults] = useState<ManualDefaults>({})
  const [selectedReservation, setSelectedReservation] = useState<ReservationItem | null>(null)
  const [weekLoading, setWeekLoading] = useState(false)
  const [activeMobileDate, setActiveMobileDate] = useState(() => toDateKey(getWeekStart(today)))

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const weekEnd = weekDays[6]
  const weekStartKey = toDateKey(weekStart)
  const weekEndKey = toDateKey(weekEnd)

  useEffect(() => {
    let active = true

    getWeeklyReservations(businessId, weekStartKey, weekEndKey).then((result) => {
      if (!active) return
      if (result.error) toast.error(result.error)
      const incoming = (result.reservations || []) as ReservationItem[]
      setWeekReservations(incoming)
      setReservations((current) => mergeReservations(current, incoming))
      setWeekLoading(false)
    })

    return () => {
      active = false
    }
  }, [businessId, weekEndKey, weekStartKey])

  const visibleWeekReservations = useMemo(
    () => applyFilters(weekReservations, query, courtFilter, statusFilter, courts),
    [courts, courtFilter, query, statusFilter, weekReservations],
  )

  const visibleTableReservations = useMemo(() => {
    const filtered = applyPeriodFilter(
      applyFilters(reservations, query, courtFilter, statusFilter, courts),
      periodFilter,
      weekStartKey,
      weekEndKey,
    )
    return sortReservations(filtered, sortKey, sortDirection)
  }, [courts, courtFilter, periodFilter, query, reservations, sortDirection, sortKey, statusFilter, weekEndKey, weekStartKey])

  const weeklyStatusCounts = useMemo(
    () => ({
      confirmed: visibleWeekReservations.filter((reservation) => reservation.status === 'confirmed').length,
      pending: visibleWeekReservations.filter((reservation) => reservation.status === 'pending').length,
      cancelled: visibleWeekReservations.filter((reservation) => reservation.status === 'cancelled').length,
    }),
    [visibleWeekReservations],
  )

  const scheduleRange = useMemo(() => getScheduleRange(businessHours, weekDays, visibleWeekReservations), [businessHours, visibleWeekReservations, weekDays])
  const hourSlots = useMemo(() => buildHourSlots(scheduleRange.startMinutes, scheduleRange.endMinutes), [scheduleRange])
  const calendarHeight = Math.max((scheduleRange.endMinutes - scheduleRange.startMinutes) * pixelsPerMinute, 360)
  const paginatedReservations = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return visibleTableReservations.slice(start, start + rowsPerPage)
  }, [currentPage, rowsPerPage, visibleTableReservations])
  const totalPages = Math.max(1, Math.ceil(visibleTableReservations.length / rowsPerPage))
  const activeFilterCount = [query.trim(), courtFilter !== 'todas', statusFilter !== 'todos'].filter(Boolean).length

  const changeWeek = (direction: -1 | 1) => {
    setWeekLoading(true)
    const nextWeek = addDays(weekStart, direction * 7)
    const selectedDayIndex = Math.max(0, weekDays.findIndex((day) => toDateKey(day) === activeMobileDate))
    setWeekStart(nextWeek)
    setActiveMobileDate(toDateKey(addDays(nextWeek, selectedDayIndex)))
    setPeriodFilter('visible-week')
  }


  const openManualReservation = (defaults: ManualDefaults = {}) => {
    setManualDefaults(defaults)
    setManualOpen(true)
  }

  const clearFilters = () => {
    setQuery('')
    setCourtFilter('todas')
    setStatusFilter('todos')
    setPeriodFilter('visible-week')
    setSortKey('date')
    setSortDirection('asc')
    setCurrentPage(1)
  }

  async function handleStatusChange(id: string, status: string) {
    const destructive = status === 'cancelled'
    if (destructive && !window.confirm('¿Deseas cancelar esta reservación?')) return

    const result = await updateReservationStatus(id, status, slug)
    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(`Reserva marcada como ${getStatusLabel(status)}`)
    setReservations((current) => current.map((reservation) => reservation.id === id ? { ...reservation, status } : reservation))
    setWeekReservations((current) => current.map((reservation) => reservation.id === id ? { ...reservation, status } : reservation))
    setSelectedReservation((current) => current && current.id === id ? { ...current, status } : current)
  }

  async function handleManualReservation(formData: FormData) {
    const startTime = formData.get('start_time') as string
    const courtId = formData.get('court_id') as string
    const customerName = formData.get('customer_name') as string
    const customerPhone = formData.get('customer_phone') as string
    const reservationDate = formData.get('reservation_date') as string

    if (!startTime || !courtId || !customerName || !customerPhone || !reservationDate) {
      toast.error('Completa todos los campos obligatorios (cliente, teléfono, cancha, fecha y hora)')
      return
    }

    setManualPending(true)
    const endTime = addOneHour(startTime)

    const result = await createAdminReservation({
      business_id: businessId,
      court_id: courtId,
      customer_name: customerName,
      customer_phone: customerPhone,
      reservation_date: reservationDate,
      start_time: normalizeTimeForInput(startTime),
      end_time: normalizeTimeForInput(endTime),
      notes: formData.get('notes') as string,
      slug,
    })

    setManualPending(false)
    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(`Reserva creada para las ${formatDisplayTime(startTime)}`)
    setManualOpen(false)
    const weeklyResult = await getWeeklyReservations(businessId, weekStartKey, weekEndKey)
    const incoming = (weeklyResult.reservations || []) as ReservationItem[]
    setWeekReservations(incoming)
    setReservations((current) => mergeReservations(current, incoming))
  }

  async function handleExportCSV() {
    const result = await exportReservationsCSV(businessId)
    if (result.error) {
      toast.error(result.error)
      return
    }
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reservas-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Archivo CSV descargado')
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="-mx-4 -mt-4 bg-emerald-950 px-4 py-6 shadow-sm md:-mx-6 md:-mt-6 md:px-6 lg:-mx-9 lg:-mt-9 lg:px-9">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="min-w-0 truncate text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">Reservaciones</h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              className="h-11 rounded-lg border-white/20 bg-white/10 px-4 font-bold text-white hover:bg-white/20 sm:w-auto sm:px-5"
              onClick={handleExportCSV}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger
              render={
                <Button
                  className="h-11 w-full rounded-lg bg-amber-400 px-4 font-black text-emerald-950 shadow-sm hover:bg-amber-300 sm:w-auto sm:px-5"
                  onClick={() => openManualReservation()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva reserva
                </Button>
              }
            />
            <ManualReservationDialog
              courts={courts}
              allCourts={allCourts}
              businessHours={businessHours}
              pending={manualPending}
              defaults={manualDefaults}
              onSubmit={handleManualReservation}
              slug={slug}
            />
          </Dialog>
          </div>
        </div>
      </div>

      <Card className="min-w-0 rounded-xl border-slate-200 bg-white py-0 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid w-full grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-[430px]">
            <ViewTab active={viewMode === 'calendar'} icon={Calendar} label="Calendario" onClick={() => setViewMode('calendar')} />
            <ViewTab active={viewMode === 'table'} icon={Table2} label="Tabla" onClick={() => setViewMode('table')} />
          </div>

          <div className="mt-5 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              {viewMode === 'calendar' && (
                <>
                  <IconButton label="Semana anterior" onClick={() => changeWeek(-1)} icon={ChevronLeft} />
                  <IconButton label="Semana siguiente" onClick={() => changeWeek(1)} icon={ChevronRight} />
                  <div className="inline-flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-sm font-black text-slate-950 sm:flex-none sm:text-base">
                    <Calendar className="h-5 w-5 shrink-0 text-slate-700" />
                    <span className="min-w-0 truncate">{formatWeekRange(weekStart, weekEnd)}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
              {viewMode === 'calendar' && <StatusSummary counts={weeklyStatusCounts} />}
              <button
                type="button"
                onClick={() => setFiltersVisible((current) => !current)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                aria-expanded={filtersVisible}
              >
                <Filter className="h-4 w-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-xs text-white">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={cn('h-4 w-4 transition-transform', filtersVisible && 'rotate-180')} />
              </button>
            </div>
          </div>

          {filtersVisible && (
            <FiltersPanel
              query={query}
              courtFilter={courtFilter}
              statusFilter={statusFilter}
              courts={courts}
              onQueryChange={(value) => {
                setQuery(value)
                setCurrentPage(1)
              }}
              onCourtChange={(value) => {
                setCourtFilter(value)
                setCurrentPage(1)
              }}
              onStatusChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}
              onClear={clearFilters}
            />
          )}

          {viewMode === 'calendar' ? (
            <WeeklyCalendar
              weekDays={weekDays}
              reservations={visibleWeekReservations}
              hourSlots={hourSlots}
              scheduleRange={scheduleRange}
              calendarHeight={calendarHeight}
              loading={weekLoading}
              activeMobileDate={activeMobileDate}
              onActiveMobileDateChange={setActiveMobileDate}
              onReservationClick={setSelectedReservation}
              onEmptySlotClick={openManualReservation}
            />
          ) : (
            <ReservationsTable
              reservations={paginatedReservations}
              totalCount={visibleTableReservations.length}
              currentPage={currentPage}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={(value) => {
                setRowsPerPage(value)
                setCurrentPage(1)
              }}
              onSortChange={(key) => {
                setSortKey(key)
                setSortDirection((current) => sortKey === key && current === 'asc' ? 'desc' : 'asc')
                setCurrentPage(1)
              }}
              onReservationClick={setSelectedReservation}
              onStatusChange={handleStatusChange}
              slug={slug}
            />
          )}
        </CardContent>
      </Card>

      <ReservationDetailDialog
        reservation={selectedReservation}
        onOpenChange={(open) => {
          if (!open) setSelectedReservation(null)
        }}
        onStatusChange={handleStatusChange}
        slug={slug}
      />
    </div>
  )
}

function ViewTab({ active, icon: Icon, label, onClick }: { active: boolean; icon: ElementType; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
        active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-700 hover:bg-white/70',
      )}
      aria-pressed={active}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function IconButton({ label, onClick, icon: Icon }: { label: string; onClick: () => void; icon: ElementType }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-950 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      aria-label={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

function StatusSummary({ counts }: { counts: { confirmed: number; pending: number; cancelled: number } }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusCounter value={counts.confirmed} label="Confirmada" className="bg-emerald-700 text-white" />
      <StatusCounter value={counts.pending} label="Pendiente" className="bg-amber-500 text-white" />
      <StatusCounter value={counts.cancelled} label="Cancelada" className="bg-rose-500 text-white" />
    </div>
  )
}

function StatusCounter({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
      <span className={cn('flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-base font-black shadow-sm', className)}>{value}</span>
      {label}
    </div>
  )
}

function FiltersPanel({
  query,
  courtFilter,
  statusFilter,
  courts,
  onQueryChange,
  onCourtChange,
  onStatusChange,
  onClear,
}: {
  query: string
  courtFilter: string
  statusFilter: StatusFilter
  courts: Court[]
  onQueryChange: (value: string) => void
  onCourtChange: (value: string) => void
  onStatusChange: (value: StatusFilter) => void
  onClear: () => void
}) {
  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
        <Filter className="h-4 w-4 text-emerald-700" />
        Filtros de reservaciones
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_200px_auto] xl:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="reservation-search" className="text-xs font-black uppercase text-slate-600">Buscar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="reservation-search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Cliente, teléfono, equipo o torneo"
              className="h-10 border-slate-200 bg-white pl-10 text-slate-950"
            />
          </div>
        </div>
        <FilterSelect label="Cancha" value={courtFilter} selectedLabel={getCourtFilterLabel(courtFilter, courts)} onValueChange={(value) => onCourtChange(value || 'todas')} placeholder="Todas las canchas">
          <SelectItem value="todas">Todas las canchas</SelectItem>
          {courts.map((court) => <SelectItem key={court.id} value={court.id}>{court.name}</SelectItem>)}
        </FilterSelect>
        <FilterSelect label="Estado" value={statusFilter} selectedLabel={getStatusFilterLabel(statusFilter)} onValueChange={(value) => onStatusChange((value || 'todos') as StatusFilter)} placeholder="Todos los estados">
          {statusFilterOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </FilterSelect>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 md:col-span-2 xl:col-span-1"
        >
          <RotateCcw className="h-4 w-4" />
          Limpiar filtros
        </button>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  selectedLabel,
  onValueChange,
  placeholder,
  children,
}: {
  label: string
  value: string
  selectedLabel: string
  onValueChange: (value: string | null) => void
  placeholder: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-black uppercase text-slate-600">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 border-slate-200 bg-white text-slate-950">
          <span className="truncate text-left">{selectedLabel || placeholder}</span>
        </SelectTrigger>
        <SelectContent className="bg-white text-slate-950">{children}</SelectContent>
      </Select>
    </div>
  )
}

function WeeklyCalendar({
  weekDays,
  reservations,
  hourSlots,
  scheduleRange,
  calendarHeight,
  loading,
  activeMobileDate,
  onActiveMobileDateChange,
  onReservationClick,
  onEmptySlotClick,
}: {
  weekDays: Date[]
  reservations: ReservationItem[]
  hourSlots: number[]
  scheduleRange: { startMinutes: number; endMinutes: number }
  calendarHeight: number
  loading: boolean
  activeMobileDate: string
  onActiveMobileDateChange: (date: string) => void
  onReservationClick: (reservation: ReservationItem) => void
  onEmptySlotClick: (defaults: ManualDefaults) => void
}) {
  const layoutByDay = useMemo(() => {
    const map = new Map<string, LayoutBlock[]>()
    weekDays.forEach((day) => {
      const dateKey = toDateKey(day)
      map.set(dateKey, layoutDayReservations(reservations.filter((reservation) => reservation.reservation_date === dateKey), scheduleRange.startMinutes))
    })
    return map
  }, [reservations, scheduleRange.startMinutes, weekDays])
  const reservationCountByDate = useMemo(() => {
    const map = new Map<string, number>()
    weekDays.forEach((day) => map.set(toDateKey(day), 0))
    reservations.forEach((reservation) => {
      map.set(reservation.reservation_date, (map.get(reservation.reservation_date) || 0) + 1)
    })
    return map
  }, [reservations, weekDays])
  const weekReservationCount = reservations.length

  const mobileReservations = reservations
    .filter((reservation) => reservation.reservation_date === activeMobileDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  const activeMobileBlocks = layoutByDay.get(activeMobileDate) || []
  const activeMobileDay = weekDays.find((day) => toDateKey(day) === activeMobileDate) || weekDays[0]

  return (
    <div className="mt-5 min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:hidden">
        <p className="text-xs font-black uppercase text-slate-600">Actividad de la semana</p>
        <Badge variant="outline" className={cn('font-black', weekReservationCount > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500')}>
          {weekReservationCount > 0 ? `${weekReservationCount} ${weekReservationCount === 1 ? 'reserva' : 'reservas'}` : 'Sin reservas'}
        </Badge>
      </div>
      <div className="mb-3 grid grid-cols-7 gap-1 md:hidden">
        {weekDays.map((day, index) => {
          const key = toDateKey(day)
          const active = activeMobileDate === key
          const count = reservationCountByDate.get(key) || 0
          return (
            <button
              key={key}
              type="button"
              onClick={() => onActiveMobileDateChange(key)}
              className={cn(
                'relative min-w-0 rounded-md border px-0.5 py-2 text-center font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                active ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50',
                count > 0 && !active && 'border-emerald-200 bg-emerald-50/70',
              )}
              aria-label={`Mostrar ${dayNames[index]} ${day.getDate()} de ${formatMonthName(day)}. ${count > 0 ? `${count} ${count === 1 ? 'reserva' : 'reservas'}` : 'Sin reservas'}.`}
              aria-pressed={active}
            >
              <span className="block truncate text-[9px] leading-none min-[380px]:text-[10px] sm:text-xs">{mobileDayNames[index]}</span>
              <span className="mt-1 block text-xs leading-none min-[380px]:text-sm sm:text-base">{day.getDate()}</span>
              {count > 0 && (
                <span className={cn('mx-auto mt-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] leading-none', active ? 'bg-white text-emerald-700' : 'bg-emerald-700 text-white')}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white md:hidden">
        <div className="grid grid-cols-[58px_minmax(0,1fr)] border-b border-slate-200 bg-white">
          <div className="flex items-center justify-center border-r border-slate-200 py-3 text-[11px] font-black text-slate-700">Hora</div>
          <div className="min-w-0 py-3 text-center">
            <p className="text-xs font-black uppercase text-slate-950">{formatDayName(activeMobileDay)}</p>
            <p className="mt-1 text-xl font-black leading-none text-slate-950">{activeMobileDay.getDate()}</p>
            <p className="mt-1 text-xs font-medium text-slate-600">{formatMonthName(activeMobileDay)}</p>
          </div>
        </div>

        <div className="relative grid grid-cols-[58px_minmax(0,1fr)] bg-white" style={{ height: calendarHeight }}>
          {hourSlots.map((minutes) => (
            <div key={minutes} className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ top: (minutes - scheduleRange.startMinutes) * pixelsPerMinute }} />
          ))}
          <div className="relative border-r border-slate-200">
            {hourSlots.map((minutes) => (
              <div key={minutes} className="absolute left-0 right-0 -translate-y-2 text-center text-[10px] font-semibold text-slate-900" style={{ top: (minutes - scheduleRange.startMinutes) * pixelsPerMinute }}>
                {formatDisplayTime(minutes)}
              </div>
            ))}
          </div>
          <div className="relative">
            {hourSlots.map((minutes) => (
              <button
                key={`${activeMobileDate}-${minutes}`}
                type="button"
                aria-label={`Crear reserva ${activeMobileDate} ${formatDisplayTime(minutes)}`}
                onClick={() => onEmptySlotClick({ reservation_date: activeMobileDate, start_time: formatMinutesAsInput(minutes) })}
                className="absolute left-0 right-0 h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
                style={{ top: (minutes - scheduleRange.startMinutes) * pixelsPerMinute }}
              />
            ))}
            {activeMobileBlocks.map((block) => (
              <button
                key={block.reservation.id}
                type="button"
                onClick={() => onReservationClick(block.reservation)}
                className={cn('absolute overflow-hidden rounded-lg border p-2 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700', reservationBlockClasses(block.reservation.status, block.reservation.is_tournament).mobile)}
                style={{ top: block.top, height: block.height, left: `${block.left}%`, width: `${block.width}%` }}
              >
                <ReservationBlockContent reservation={block.reservation} mobile />
              </button>
            ))}
            {mobileReservations.length === 0 && (
              <div className="pointer-events-none absolute inset-x-3 top-8 rounded-lg border border-dashed border-slate-200 bg-white/90 p-4 text-center text-sm font-medium text-slate-500">
                No hay reservas para este día.
              </div>
            )}
          </div>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando semana
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="hidden min-w-0 rounded-xl border border-slate-200 md:block md:overflow-x-auto xl:overflow-hidden">
        <div className="min-w-[980px] xl:w-full xl:min-w-0">
          <div className="grid grid-cols-[68px_repeat(7,minmax(130px,1fr))] border-b border-slate-200 bg-white xl:grid-cols-[68px_repeat(7,minmax(0,1fr))]">
            <div className="flex items-center justify-center border-r border-slate-200 py-4 text-xs font-black text-slate-950">Hora</div>
            {weekDays.map((day, index) => (
              <div key={toDateKey(day)} className="min-w-0 border-r border-slate-200 py-3 text-center last:border-r-0">
                <p className="truncate px-1 text-[11px] font-black uppercase text-slate-950">{dayNames[index]}</p>
                <p className="mt-1 text-2xl font-medium leading-none text-slate-950">{String(day.getDate()).padStart(2, '0')}</p>
                <p className="mt-1 truncate px-1 text-xs text-slate-700">{formatMonthName(day)}</p>
                {(reservationCountByDate.get(toDateKey(day)) || 0) > 0 && (
                  <span className="mt-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-[10px] font-black text-white">
                    {reservationCountByDate.get(toDateKey(day))}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="relative grid grid-cols-[68px_repeat(7,minmax(130px,1fr))] bg-white xl:grid-cols-[68px_repeat(7,minmax(0,1fr))]" style={{ height: calendarHeight }}>
            {hourSlots.map((minutes) => (
              <div key={minutes} className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ top: (minutes - scheduleRange.startMinutes) * pixelsPerMinute }} />
            ))}
            <div className="relative border-r border-slate-200">
              {hourSlots.map((minutes) => (
                <div key={minutes} className="absolute left-0 right-0 -translate-y-2 text-center text-[11px] font-semibold text-slate-950" style={{ top: (minutes - scheduleRange.startMinutes) * pixelsPerMinute }}>
                  {formatDisplayTime(minutes)}
                </div>
              ))}
            </div>
            {weekDays.map((day) => {
              const dateKey = toDateKey(day)
              const blocks = layoutByDay.get(dateKey) || []
              return (
                <div key={dateKey} className="relative border-r border-slate-200 last:border-r-0">
                  {hourSlots.map((minutes) => (
                    <button key={`${dateKey}-${minutes}`} type="button" aria-label={`Crear reserva ${dateKey} ${formatDisplayTime(minutes)}`} onClick={() => onEmptySlotClick({ reservation_date: dateKey, start_time: formatMinutesAsInput(minutes) })} className="absolute left-0 right-0 h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600" style={{ top: (minutes - scheduleRange.startMinutes) * pixelsPerMinute }} />
                  ))}
                  {blocks.map((block) => (
                    <button
                      key={block.reservation.id}
                      type="button"
                      onClick={() => onReservationClick(block.reservation)}
                      className={cn('absolute overflow-hidden rounded-md border p-2 text-left shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700', reservationBlockClasses(block.reservation.status, block.reservation.is_tournament).desktop)}
                      style={{ top: block.top, height: block.height, left: `${block.left}%`, width: `${block.width}%` }}
                    >
                      <ReservationBlockContent reservation={block.reservation} compact />
                    </button>
                  ))}
                </div>
              )
            })}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando semana
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReservationBlockContent({ reservation, compact = false, mobile = false }: { reservation: ReservationItem; compact?: boolean; mobile?: boolean }) {
  const courtDescription = reservation.courts?.description
  return (
    <div className={cn('min-w-0', mobile ? 'space-y-1' : 'space-y-0.5')}>
      <p className={cn('font-black leading-tight', mobile ? 'line-clamp-2 text-sm' : compact ? 'line-clamp-2 text-[11px]' : 'line-clamp-2 text-xs sm:text-sm')}>
        {getReservationTitle(reservation)}
      </p>
      <p className={cn('leading-tight', mobile ? 'line-clamp-2 text-xs' : compact ? 'line-clamp-2 text-[10px]' : 'line-clamp-2 text-[11px] sm:text-xs')}>
        {reservation.courts?.name || 'Cancha sin asignar'}
        {!compact && courtDescription ? ` · ${courtDescription}` : ''}
      </p>
      <p className={cn('whitespace-nowrap font-semibold leading-tight', mobile ? 'text-xs' : compact ? 'text-[10px]' : 'text-[11px] sm:text-xs')}>
        {formatTimeRange(reservation.start_time, reservation.end_time)}
      </p>
      <span className="sr-only">Estado: {getStatusLabel(reservation.status)}</span>
    </div>
  )
}

function ReservationsTable({
  reservations,
  totalCount,
  currentPage,
  totalPages,
  rowsPerPage,
  sortKey,
  sortDirection,
  onPageChange,
  onRowsPerPageChange,
  onSortChange,
  onReservationClick,
  onStatusChange,
  slug,
}: {
  reservations: ReservationItem[]
  totalCount: number
  currentPage: number
  totalPages: number
  rowsPerPage: number
  sortKey: SortKey
  sortDirection: SortDirection
  onPageChange: (page: number) => void
  onRowsPerPageChange: (value: number) => void
  onSortChange: (key: SortKey) => void
  onReservationClick: (reservation: ReservationItem) => void
  onStatusChange: (id: string, status: string) => void
  slug: string
}) {
  const startResult = totalCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1
  const endResult = Math.min(currentPage * rowsPerPage, totalCount)
  const resultText = totalCount === 0 ? 'No se encontraron reservaciones' : `${totalCount} ${totalCount === 1 ? 'reservación' : 'reservaciones'}`

  return (
    <div className="mt-5 min-w-0">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-lg font-black text-slate-950">{resultText}</p>
          <p className="text-sm font-medium text-slate-500">Mostrando las reservaciones correspondientes a los filtros seleccionados.</p>
        </div>
        {totalCount > 0 && <p className="text-sm font-bold text-slate-600">Mostrando {startResult}–{endResult} de {totalCount}</p>}
      </div>

      {reservations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-base font-black text-slate-950">No se encontraron reservaciones.</p>
          <p className="mt-2 text-sm font-medium text-slate-500">No existen reservaciones que coincidan con los filtros seleccionados.</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Ordenar por</p>
            <div className="flex flex-wrap gap-2">
              <SortableHeader label="Cliente" sortKeyName="client" activeKey={sortKey} direction={sortDirection} onSortChange={onSortChange} />
              <SortableHeader label="Cancha" sortKeyName="court" activeKey={sortKey} direction={sortDirection} onSortChange={onSortChange} />
              <SortableHeader label="Fecha" sortKeyName="date" activeKey={sortKey} direction={sortDirection} onSortChange={onSortChange} />
              <SortableHeader label="Hora" sortKeyName="time" activeKey={sortKey} direction={sortDirection} onSortChange={onSortChange} />
              <SortableHeader label="Estado" sortKeyName="status" activeKey={sortKey} direction={sortDirection} onSortChange={onSortChange} />
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            {reservations.map((reservation) => (
              <ReservationTableRow key={reservation.id} reservation={reservation} onView={onReservationClick} onStatusChange={onStatusChange} slug={slug} />
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Select value={String(rowsPerPage)} onValueChange={(value) => onRowsPerPageChange(Number(value))} items={rowsPerPageOptions.map((option) => ({ value: String(option), label: `${option} por página` }))}>
            <SelectTrigger className="h-9 w-full border-slate-200 bg-white text-slate-950 sm:w-36">
              <SelectValue placeholder="10 por página" />
            </SelectTrigger>
            <SelectContent className="bg-white text-slate-950">
              {rowsPerPageOptions.map((option) => <SelectItem key={option} value={String(option)}>{option} por página</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={currentPage === 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>Anterior</Button>
          <span className="text-sm font-bold text-slate-600">Página {currentPage} de {totalPages}</span>
          <Button variant="outline" disabled={currentPage === totalPages} onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}>Siguiente</Button>
        </div>
      )}
    </div>
  )
}

function SortableHeader({
  label,
  sortKeyName,
  activeKey,
  direction,
  onSortChange,
}: {
  label: string
  sortKeyName: SortKey
  activeKey: SortKey
  direction: SortDirection
  onSortChange: (key: SortKey) => void
}) {
  const active = activeKey === sortKeyName
  return (
    <button type="button" onClick={() => onSortChange(sortKeyName)} className={cn('inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-left text-xs font-black uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600', active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-200 hover:text-emerald-700')} aria-label={`Ordenar por ${label}`}>
      {label}
      {active ? <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', direction === 'asc' && 'rotate-180')} /> : <ChevronDown className="h-3.5 w-3.5 opacity-30" />}
    </button>
  )
}

function ReservationTableRow({ reservation, onView, onStatusChange, slug }: { reservation: ReservationItem; onView: (reservation: ReservationItem) => void; onStatusChange: (id: string, status: string) => void; slug: string }) {
  const hasActions = reservation.is_tournament || reservation.status === 'pending' || reservation.status === 'confirmed'

  return (
    <div role="button" tabIndex={0} onClick={() => onView(reservation)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onView(reservation) }} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
      <div className={cn('grid gap-0', hasActions && 'xl:grid-cols-[minmax(0,1fr)_220px]')}>
        <div className="grid min-w-0 gap-4 p-4 md:grid-cols-[minmax(230px,1.05fr)_minmax(280px,1fr)_auto] md:items-center lg:p-5">
          <ClientCell reservation={reservation} />
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoLine icon={Calendar} value={formatReadableDate(reservation.reservation_date)} />
            <InfoLine icon={Clock} value={formatTimeRange(reservation.start_time, reservation.end_time)} strong />
            <PhoneContactLine reservation={reservation} />
            <InfoLine icon={Mail} value={reservation.customer_email || '—'} />
          </div>
          <div className="flex items-center gap-2 md:justify-self-end">
            <StatusBadge status={reservation.status} />
          </div>
        </div>
        {hasActions && <ReservationActionPanel reservation={reservation} onStatusChange={onStatusChange} slug={slug} />}
      </div>
    </div>
  )
}

function ClientCell({ reservation }: { reservation: ReservationItem }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-black uppercase text-emerald-700">
        {getReservationTitle(reservation).charAt(0) || 'R'}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-base font-black leading-tight text-slate-950" title={getReservationTitle(reservation)}>{getReservationTitle(reservation)}</p>
        <p className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-emerald-700">
          {reservation.courts?.name || 'Sin cancha'}
          {reservation.courts?.description ? ` (${reservation.courts.description})` : ''}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {reservation.is_tournament ? <Badge className="bg-purple-100 text-purple-700">Torneo</Badge> : <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Portal público</Badge>}
        </div>
      </div>
    </div>
  )
}

function InfoLine({ icon: Icon, value, strong = false }: { icon: ElementType; value: string; strong?: boolean }) {
  return (
    <p className={cn('flex min-w-0 items-center gap-2 text-sm text-slate-700', strong && 'font-black text-slate-900')}>
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      <span className="min-w-0 truncate" title={value}>{value}</span>
    </p>
  )
}

function PhoneContactLine({ reservation }: { reservation: ReservationItem }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
      <Phone className="h-4 w-4 shrink-0 text-slate-500" />
      <span className="min-w-0 truncate" title={formatPhone(reservation)}>{formatPhone(reservation)}</span>
      <WhatsAppContactIcon reservation={reservation} />
    </div>
  )
}

function ReservationActionPanel({ reservation, onStatusChange, slug }: { reservation: ReservationItem; onStatusChange: (id: string, status: string) => void; slug: string }) {
  const router = useRouter()
  const cancelReservation = () => {
    onStatusChange(reservation.id, 'cancelled')
  }

  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:flex-wrap xl:flex-col xl:items-stretch xl:justify-center xl:border-l xl:border-t-0">
      {reservation.is_tournament ? (
        <Button type="button" size="sm" onClick={(event) => { event.stopPropagation(); router.push(`/${slug}/admin/tournament`) }} className="h-10 flex-1 justify-center rounded-lg bg-purple-600 font-black text-white hover:bg-purple-700 xl:w-full" aria-label="Abrir torneo">
          <Trophy className="mr-2 h-4 w-4" />
          Torneo
        </Button>
      ) : (
        <>
          {reservation.status === 'pending' && (
            <>
              <Button type="button" size="sm" onClick={(event) => { event.stopPropagation(); onStatusChange(reservation.id, 'confirmed') }} className="h-10 flex-1 justify-center rounded-lg bg-emerald-600 font-black text-white hover:bg-emerald-700 xl:w-full" aria-label={`Confirmar ${getReservationTitle(reservation)}`}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); cancelReservation() }} className="h-10 flex-1 justify-center rounded-lg font-black text-rose-700 hover:bg-rose-50 hover:text-rose-800 xl:w-full" aria-label={`Cancelar ${getReservationTitle(reservation)}`}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </>
          )}
          {reservation.status === 'confirmed' && (
            <Button type="button" variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); cancelReservation() }} className="h-10 flex-1 justify-center rounded-lg font-black text-rose-700 hover:bg-rose-50 hover:text-rose-800 xl:w-full" aria-label={`Cancelar ${getReservationTitle(reservation)}`}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function WhatsAppContactIcon({ reservation }: { reservation: ReservationItem }) {
  const whatsapp = getWhatsAppLink(reservation, reservation.status === 'confirmed' ? 'confirm' : 'general')
  if (!whatsapp) return null

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        window.open(whatsapp, '_blank', 'noopener,noreferrer')
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      aria-label={`Contactar por WhatsApp a ${getReservationTitle(reservation)}`}
      title="Contactar por WhatsApp"
    >
      <WhatsAppLogo className="h-5 w-5" />
    </button>
  )
}

function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.03 3.2A12.74 12.74 0 0 0 5.17 22.6L3.6 28.8l6.34-1.52A12.75 12.75 0 1 0 16.03 3.2Zm0 22.26a9.48 9.48 0 0 1-4.83-1.32l-.35-.21-3.76.9.92-3.65-.23-.38a9.5 9.5 0 1 1 8.25 4.66Zm5.47-7.11c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  )
}

function ReservationDetailDialog({ reservation, onOpenChange, onStatusChange, slug }: { reservation: ReservationItem | null; onOpenChange: (open: boolean) => void; onStatusChange: (id: string, status: string) => void; slug: string }) {
  return (
    <Dialog open={Boolean(reservation)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl overflow-y-auto rounded-xl border-slate-200 bg-white text-slate-950">
        {reservation && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{getReservationTitle(reservation)}</DialogTitle>
              <DialogDescription>Detalle completo de la reservación.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={reservation.status} />
                {reservation.is_tournament && <Badge className="bg-purple-100 text-purple-700">Torneo</Badge>}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem icon={Calendar} label="Fecha" value={formatReadableDate(reservation.reservation_date, true)} />
                <DetailItem icon={Clock} label="Horario" value={formatTimeRange(reservation.start_time, reservation.end_time)} />
                <DetailItem icon={Trophy} label="Cancha" value={reservation.courts?.name || 'Sin cancha'} />
                <PhoneDetailItem reservation={reservation} />
                {reservation.customer_email && <DetailItem icon={Mail} label="Correo" value={reservation.customer_email} />}
              </div>
              {reservation.courts?.description && <InfoBox label="Modalidad" value={reservation.courts.description} />}
              {reservation.notes && <InfoBox label="Notas" value={reservation.notes} icon={StickyNote} />}
              <ReservationActionPanel reservation={reservation} onStatusChange={onStatusChange} slug={slug} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailItem({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500"><Icon className="h-4 w-4" />{label}</p>
      <p className="mt-2 font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function PhoneDetailItem({ reservation }: { reservation: ReservationItem }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500"><Phone className="h-4 w-4" />Teléfono</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate font-semibold text-slate-950" title={formatPhone(reservation)}>{formatPhone(reservation)}</p>
        <WhatsAppContactIcon reservation={reservation} />
      </div>
    </div>
  )
}

function InfoBox({ label, value, icon: Icon }: { label: string; value: string; icon?: ElementType }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">{Icon && <Icon className="h-4 w-4" />}{label}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">{value}</p>
    </div>
  )
}

function ManualReservationDialog({ courts, allCourts, businessHours, pending, defaults, onSubmit, slug }: { courts: Court[]; allCourts: Court[]; businessHours: BusinessHour[]; pending: boolean; defaults: ManualDefaults; onSubmit: (formData: FormData) => void; slug: string }) {
  const router = useRouter()
  const hasNoActiveCourts = courts.length === 0
  const hasNoCourtsAtAll = allCourts.length === 0

  return (
    <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto rounded-xl border-slate-200 bg-white text-slate-950">
      <DialogHeader>
        <DialogTitle>Nueva reserva</DialogTitle>
        <DialogDescription>Registra una reserva confirmada desde el panel administrativo.</DialogDescription>
      </DialogHeader>
      {hasNoCourtsAtAll ? (
        <div className="space-y-4 py-6 text-center">
          <p className="text-sm text-slate-500">No hay canchas registradas. Primero crea una cancha en la sección de Canchas.</p>
          <Button type="button" variant="outline" onClick={() => router.push(`/${slug}/admin/courts`)} className="gap-2">
            Ir a Canchas
          </Button>
        </div>
      ) : hasNoActiveCourts ? (
        <div className="space-y-4 py-6 text-center">
          <p className="text-sm text-slate-500">No hay canchas activas. Activa al menos una cancha para crear reservas.</p>
          <p className="text-xs text-slate-400">Hay {allCourts.length} cancha(s) inactiva(s). Puedes activarlas desde la sección de Canchas.</p>
        </div>
      ) : (
      <form action={onSubmit} className="space-y-4">
        <Field label="Cliente"><Input id="customer_name" name="customer_name" required placeholder="Nombre del cliente" /></Field>
        <Field label="Teléfono"><Input id="customer_phone" name="customer_phone" required placeholder="8888-8888" /></Field>
        <Field label="Cancha">
          <Select name="court_id" required defaultValue={defaults.court_id}>
            <SelectTrigger id="court_id" className="w-full border-slate-200 bg-white text-slate-950">
              <SelectValue>{value => courts.find((court) => court.id === value)?.name || 'Seleccionar cancha'}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white text-slate-950">{courts.map((court) => <SelectItem key={court.id} value={court.id}>{court.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha"><Input id="reservation_date" name="reservation_date" type="date" required defaultValue={defaults.reservation_date || getTodayKey()} /></Field>
          <Field label="Hora"><TimeSelect name="start_time" defaultValue={defaults.start_time} /></Field>
        </div>
        <Field label="Notas"><Textarea id="notes" name="notes" placeholder="Notas internas opcionales..." /></Field>
        <p className="text-xs font-medium leading-relaxed text-slate-500">Horarios configurados: {businessHours.filter((hour) => !hour.is_closed).length} días activos.</p>
        <Button type="submit" className="h-11 w-full rounded-lg bg-emerald-700 font-black hover:bg-emerald-800" disabled={pending}>
          {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : 'Crear reserva'}
        </Button>
      </form>
      )}
    </DialogContent>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

function TimeSelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <Select name={name} required defaultValue={defaultValue}>
      <SelectTrigger className="w-full border-slate-200 bg-white text-slate-950">
        <SelectValue>{value => value ? formatDisplayTime(value) : 'Seleccionar hora'}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-64 bg-white text-slate-950">
        {buildTimeOptions().map((minutes) => <SelectItem key={minutes} value={formatMinutesAsInput(minutes)}>{formatDisplayTime(minutes)}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const styles: Record<string, string> = {
    confirmed: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    completed: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    pending: 'border-amber-100 bg-amber-50 text-amber-700',
    cancelled: 'border-rose-100 bg-rose-50 text-rose-700',
    finished: 'border-blue-100 bg-blue-50 text-blue-700',
  }
  return <Badge variant="outline" className={cn('w-fit font-black', styles[status] || 'border-slate-200 bg-slate-50 text-slate-700')}>{getStatusLabel(status)}</Badge>
}

function applyFilters(reservations: ReservationItem[], query: string, courtFilter: string, statusFilter: StatusFilter, courts: Court[]) {
  let result = reservations
  const normalizedQuery = query.trim().toLowerCase()
  if (statusFilter !== 'todos') result = statusFilter === 'torneo' ? result.filter((r) => r.is_tournament) : result.filter((r) => r.status === statusFilter && !r.is_tournament)
  if (courtFilter !== 'todas') {
    const courtName = courts.find((court) => court.id === courtFilter)?.name
    result = result.filter((r) => r.court_id === courtFilter || r.courts?.name === courtName)
  }
  if (normalizedQuery) {
    result = result.filter((r) => [getReservationTitle(r), r.customer_phone, r.customer?.phone, r.customer_email, r.courts?.name, r.courts?.description, r.notes].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery))
  }
  return result
}

function applyPeriodFilter(reservations: ReservationItem[], period: PeriodFilter, weekStartKey: string, weekEndKey: string) {
  const todayKey = getTodayKey()
  if (period === 'visible-week') return reservations.filter((r) => r.reservation_date >= weekStartKey && r.reservation_date <= weekEndKey)
  if (period === 'future') return reservations.filter((r) => r.reservation_date >= todayKey)
  if (period === 'past') return reservations.filter((r) => r.reservation_date < todayKey)
  return reservations
}

function sortReservations(reservations: ReservationItem[], key: SortKey, direction: SortDirection) {
  const factor = direction === 'asc' ? 1 : -1
  return [...reservations].sort((a, b) => {
    const value = compareByKey(a, b, key)
    return value * factor
  })
}

function compareByKey(a: ReservationItem, b: ReservationItem, key: SortKey) {
  if (key === 'client') return getReservationTitle(a).localeCompare(getReservationTitle(b), 'es')
  if (key === 'status') return getStatusLabel(a.status).localeCompare(getStatusLabel(b.status), 'es')
  if (key === 'court') return (a.courts?.name || '').localeCompare(b.courts?.name || '', 'es')
  if (key === 'time') return timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  return `${a.reservation_date}T${a.start_time}`.localeCompare(`${b.reservation_date}T${b.start_time}`)
}

function layoutDayReservations(reservations: ReservationItem[], startMinutes: number): LayoutBlock[] {
  const sorted = [...reservations].sort((a, b) => a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time))
  const laneEnds: number[] = []
  const laneAssignments = new Map<string, number>()
  sorted.forEach((reservation) => {
    const start = timeToMinutes(reservation.start_time)
    const end = timeToMinutes(reservation.end_time)
    const lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    const assignedLane = lane === -1 ? laneEnds.length : lane
    laneEnds[assignedLane] = end
    laneAssignments.set(reservation.id, assignedLane)
  })
  const laneCount = Math.max(1, laneEnds.length)
  return sorted.map((reservation) => {
    const start = timeToMinutes(reservation.start_time)
    const end = getSafeEndMinutes(reservation.start_time, reservation.end_time)
    const lane = laneAssignments.get(reservation.id) || 0
    const laneWidth = 100 / laneCount
    return { reservation, top: Math.max(0, (start - startMinutes) * pixelsPerMinute), height: Math.max(minBlockHeight, (end - start) * pixelsPerMinute - 8), width: laneWidth - 2, left: lane * laneWidth + 1 }
  })
}

function getScheduleRange(hours: BusinessHour[], weekDays: Date[], reservations: ReservationItem[]) {
  const dayIndexes = weekDays.map((day) => day.getDay())
  const activeHours = hours.filter((hour) => dayIndexes.includes(hour.day_of_week) && !hour.is_closed)
  const reservationStarts = reservations.map((r) => timeToMinutes(r.start_time))
  const reservationEnds = reservations.map((r) => getSafeEndMinutes(r.start_time, r.end_time))
  if (activeHours.length === 0 && reservationStarts.length === 0) return { startMinutes: 16 * 60, endMinutes: 22 * 60 }
  const starts = [...activeHours.map((hour) => timeToMinutes(hour.open_time)), ...reservationStarts]
  const ends = [...activeHours.map((hour) => timeToMinutes(hour.close_time)), ...reservationEnds]
  return { startMinutes: roundDownToHour(Math.min(...starts)), endMinutes: roundUpToHour(Math.max(...ends)) }
}

function buildHourSlots(startMinutes: number, endMinutes: number) {
  const slots: number[] = []
  for (let current = startMinutes; current <= endMinutes; current += 60) slots.push(current)
  return slots
}

function reservationBlockClasses(status: string, isTournament?: boolean) {
  if (isTournament) return { desktop: 'border-purple-700 bg-purple-700 text-white', mobile: 'border-purple-200 bg-purple-50 text-purple-900' }
  if (status === 'pending') return { desktop: 'border-amber-500 bg-amber-400 text-slate-950', mobile: 'border-amber-200 bg-amber-50 text-amber-950' }
  if (status === 'cancelled') return { desktop: 'border-rose-500 bg-rose-500 text-white bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.18)_0,rgba(255,255,255,0.18)_6px,transparent_6px,transparent_12px)]', mobile: 'border-rose-200 bg-rose-50 text-rose-950' }
  return { desktop: 'border-emerald-800 bg-emerald-700 text-white', mobile: 'border-emerald-200 bg-emerald-50 text-emerald-950' }
}

function mergeReservations(current: ReservationItem[], incoming: ReservationItem[]) {
  const map = new Map<string, ReservationItem>()
  current.forEach((reservation) => map.set(reservation.id, reservation))
  incoming.forEach((reservation) => map.set(reservation.id, reservation))
  return Array.from(map.values())
}

function filterByDateRange(reservations: ReservationItem[], start: Date, end: Date) {
  const startKey = toDateKey(start)
  const endKey = toDateKey(end)
  return reservations.filter((reservation) => reservation.reservation_date >= startKey && reservation.reservation_date <= endKey)
}

function getTodayInTimeZone() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  return new Date(Number(parts.find((part) => part.type === 'year')?.value), Number(parts.find((part) => part.type === 'month')?.value) - 1, Number(parts.find((part) => part.type === 'day')?.value))
}

function getWeekStart(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  start.setDate(start.getDate() - day + (day === 0 ? -6 : 1))
  start.setHours(0, 0, 0, 0)
  return start
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getTodayKey() {
  return toDateKey(getTodayInTimeZone())
}

function formatWeekRange(start: Date, end: Date) {
  const month = new Intl.DateTimeFormat('es-CR', { month: 'long' }).format(end)
  return `${start.getDate()} – ${end.getDate()} de ${month} de ${end.getFullYear()}`
}

function formatDayName(date: Date) {
  return new Intl.DateTimeFormat('es-CR', { weekday: 'short' }).format(date).replace('.', '')
}

function formatMonthName(date: Date) {
  return new Intl.DateTimeFormat('es-CR', { month: 'long' }).format(date)
}

function formatReadableDate(date: string, long = false) {
  return new Intl.DateTimeFormat('es-CR', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)).replace('.', '')
}

function timeToMinutes(time: string | number | Date) {
  if (typeof time === 'number') return time
  if (time instanceof Date) return time.getHours() * 60 + time.getMinutes()
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + (minute || 0)
}

function getSafeEndMinutes(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  return end <= start ? end + 24 * 60 : end
}

function formatDisplayTime(value: string | number | Date) {
  return formatTime12h(typeof value === 'number' ? formatMinutesAsInput(value) : value instanceof Date ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}` : value)
}

function formatTimeRange(startTime: string, endTime: string) {
  return `${formatDisplayTime(startTime)} – ${formatDisplayTime(endTime)}`
}

function formatMinutesAsInput(minutes: number) {
  return `${String(Math.floor((minutes % (24 * 60)) / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function normalizeTimeForInput(time: string) {
  return time.length === 5 ? `${time}:00` : time
}

function addOneHour(time: string) {
  return formatMinutesAsInput(timeToMinutes(time) + 60)
}

function roundDownToHour(minutes: number) {
  return Math.floor(minutes / 60) * 60
}

function roundUpToHour(minutes: number) {
  return Math.ceil(minutes / 60) * 60
}

function buildTimeOptions() {
  return Array.from({ length: 48 }, (_, index) => index * 30)
}

function getReservationTitle(reservation: ReservationItem) {
  return reservation.is_tournament ? reservation.customer_name.replace(/^TORNEO:\s*/i, '') : reservation.customer_name
}

function getStatusLabel(status: string) {
  return statusLabels[status] || status
}

function getStatusFilterLabel(value: StatusFilter) {
  return statusFilterOptions.find((option) => option.value === value)?.label || 'Todos los estados'
}

function getCourtFilterLabel(value: string, courts: Court[]) {
  if (value === 'todas') return 'Todas las canchas'
  return courts.find((court) => court.id === value)?.name || 'Todas las canchas'
}

function formatPhone(reservation: ReservationItem) {
  const phone = reservation.customer?.phone || reservation.customer_phone
  return phone && phone !== 'N/A' ? phone : '—'
}

function getWhatsAppLink(reservation: ReservationItem, type: 'general' | 'confirm' | 'cancel') {
  const rawPhone = reservation.customer?.phone || reservation.customer_phone || ''
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '')
  if (!cleanPhone || rawPhone === 'N/A') return null
  const finalPhone = cleanPhone.length === 8 ? `506${cleanPhone}` : cleanPhone
  const message = type === 'confirm'
    ? `Hola ${reservation.customer_name}, tu reserva para ${reservation.courts?.name} el día ${reservation.reservation_date} a las ${formatDisplayTime(reservation.start_time)} ha sido confirmada.`
    : type === 'cancel'
      ? `Hola ${reservation.customer_name}, tu reserva para el día ${reservation.reservation_date} ha sido cancelada.`
      : `Hola ${reservation.customer_name}, te contacto sobre tu reserva para el ${reservation.reservation_date}.`
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
}
