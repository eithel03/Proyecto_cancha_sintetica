'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  Shield,
  Swords,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cancelChallenge, confirmChallenge, deleteChallenge, deleteOldChallenges } from '@/app/[slug]/retos/actions'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresInsertPayload, RealtimePostgresUpdatePayload } from '@supabase/supabase-js'
import { cn, formatTime12h } from '@/lib/utils'

type ChallengeStatus = 'open' | 'accepted' | 'confirmed' | 'cancelled' | 'completed' | 'expired' | string
type FilterId = 'all' | 'open' | 'accepted' | 'confirmed' | 'history'
type DateFilter = 'all' | 'future' | 'past'
type SortOption = 'attention' | 'upcoming' | 'recent' | 'oldest' | 'creator' | 'status'

type ProfileInfo = {
  full_name: string | null
  phone: string | null
} | null

type CourtInfo = {
  id: string | null
  name: string | null
  description?: string | null
} | null

type CourtFilterOption = {
  id: string
  name: string | null
  description?: string | null
  is_active?: boolean | null
}

type Challenge = {
  id: string
  business_id?: string | null
  court_id?: string | null
  status: ChallengeStatus
  challenge_date: string
  challenge_time: string
  customer_name: string | null
  customer_phone: string | null
  notes: string | null
  gender: string | null
  men_count: number | null
  women_count: number | null
  courts?: CourtInfo
  creator?: ProfileInfo
  opponent?: ProfileInfo
}

type ConfirmConfig = {
  isOpen: boolean
  title: string
  description: string
  onConfirm: () => void
  variant?: 'danger' | 'primary'
}

const historicalStatuses = ['cancelled', 'completed', 'expired']
const rowsPerPage = 10
const timeZone = 'America/Costa_Rica'

const statusLabels: Record<string, string> = {
  open: 'Abierto',
  accepted: 'Aceptado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Completado',
  expired: 'Expirado',
}

const statusStyles: Record<string, string> = {
  open: 'border-blue-100 bg-blue-50 text-blue-700',
  accepted: 'border-amber-100 bg-amber-50 text-amber-700',
  confirmed: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  cancelled: 'border-rose-100 bg-rose-50 text-rose-700',
  completed: 'border-slate-200 bg-slate-100 text-slate-700',
  expired: 'border-slate-200 bg-slate-100 text-slate-600',
}

const summaryStyles: Record<FilterId, string> = {
  all: 'border-slate-200 bg-white text-slate-950',
  open: 'border-blue-100 bg-blue-50 text-blue-700',
  accepted: 'border-amber-100 bg-amber-50 text-amber-700',
  confirmed: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  history: 'border-slate-200 bg-slate-100 text-slate-700',
}

export default function AdminChallengesClient({
  initialChallenges,
  courts,
  businessId,
  slug,
}: {
  initialChallenges: Challenge[]
  courts: CourtFilterOption[]
  businessId: string
  slug: string
}) {
  const router = useRouter()
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges)
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [courtFilter, setCourtFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOption, setSortOption] = useState<SortOption>('attention')
  const [page, setPage] = useState(1)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => undefined,
  })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`admin-challenges-${businessId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenges', filter: `business_id=eq.${businessId}` },
        (payload: RealtimePostgresInsertPayload<Partial<Challenge>>) => {
          const incoming = payload.new as Partial<Challenge>
          toast.success(`Nuevo reto publicado: ${incoming.customer_name || 'Sin nombre'}`)
          router.refresh()
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'challenges', filter: `business_id=eq.${businessId}` },
        (payload: RealtimePostgresUpdatePayload<Partial<Challenge>>) => {
          const updated = payload.new as Partial<Challenge>
          setChallenges((prev) => prev.map((challenge) => challenge.id === updated.id ? { ...challenge, ...updated } : challenge))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [businessId, router])

  // Sincronizar estado cuando el servidor re-renderiza (router.refresh / revalidatePath)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChallenges(initialChallenges)
  }, [initialChallenges])

  const counts = useMemo(() => getCounts(challenges), [challenges])
  const categories = useMemo(() => getCategoryOptions(challenges), [challenges])
  const activeExtraFilterCount = [courtFilter !== 'all', categoryFilter !== 'all', dateFilter !== 'all', statusFilter !== 'all'].filter(Boolean).length

  const filteredChallenges = useMemo(() => {
    const filtered = applyFilters(challenges, {
      activeFilter,
      searchTerm,
      courtFilter,
      categoryFilter,
      dateFilter,
      statusFilter,
    })
    return sortChallenges(filtered, sortOption)
  }, [activeFilter, categoryFilter, challenges, courtFilter, dateFilter, searchTerm, sortOption, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredChallenges.length / rowsPerPage))
  const paginatedChallenges = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    return filteredChallenges.slice(start, start + rowsPerPage)
  }, [filteredChallenges, page])
  const startResult = filteredChallenges.length === 0 ? 0 : (page - 1) * rowsPerPage + 1
  const endResult = Math.min(page * rowsPerPage, filteredChallenges.length)

  const filters: Array<{ id: FilterId; label: string; count: number }> = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'open', label: 'Abiertos', count: counts.open },
    { id: 'accepted', label: 'Aceptados', count: counts.accepted },
    { id: 'confirmed', label: 'Confirmados', count: counts.confirmed },
    { id: 'history', label: 'Historial', count: counts.history },
  ]

  const showConfirm = (
    title: string,
    description: string,
    onConfirm: () => void,
    variant: 'danger' | 'primary' = 'primary',
  ) => {
    setConfirmConfig({ isOpen: true, title, description, onConfirm, variant })
  }

  async function handleConfirm(challenge: Challenge) {
    showConfirm(
      challenge.status === 'open' ? 'Confirmar reto directo' : 'Confirmar reto',
      challenge.status === 'open'
        ? 'Se confirmará el reto sin un proceso de aceptación de rival. Se creará una reserva automática si el horario está disponible.'
        : 'Se creará una reserva automática y el reto quedará confirmado.',
      async () => {
        setPendingId(challenge.id)
        const result = await confirmChallenge(challenge.id)
        setPendingId(null)

        if (result.error) {
          toast.error(result.error, { duration: 5000 })
          return
        }

        toast.success('Reto confirmado con éxito.')
        setChallenges((prev) => prev.map((item) => item.id === challenge.id ? { ...item, status: 'confirmed' } : item))
        setSelectedChallenge((current) => current?.id === challenge.id ? { ...current, status: 'confirmed' } : current)
      },
    )
  }

  async function handleCancel(challenge: Challenge, destructiveLabel = 'Cancelar reto') {
    showConfirm(
      destructiveLabel,
      challenge.status === 'confirmed'
        ? 'Este reto ya fue confirmado. Se cancelará lógicamente el reto, pero revisa la reserva asociada si necesitas cancelar también el espacio.'
        : 'Esta acción cambiará el reto a cancelado y dejará de estar disponible para jugadores.',
      async () => {
        setPendingId(challenge.id)
        const result = await cancelChallenge(challenge.id)
        setPendingId(null)

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Reto cancelado.')
        setChallenges((prev) => prev.map((item) => item.id === challenge.id ? { ...item, status: 'cancelled' } : item))
        setSelectedChallenge((current) => current?.id === challenge.id ? { ...current, status: 'cancelled' } : current)
      },
      'danger',
    )
  }

  function handleDelete(challenge: Challenge) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Costa_Rica' })
    const isPast = challenge.challenge_date < today
    const label = challenge.status === 'cancelled' ? 'Eliminar reto cancelado' : 'Eliminar reto pasado'

    showConfirm(
      label,
      isPast
        ? `Este reto fue el ${challenge.challenge_date} y ya pasó. Se eliminará permanentemente.`
        : 'Este reto está cancelado. Se eliminará permanentemente.',
      async () => {
        setPendingId(challenge.id)
        const result = await deleteChallenge(challenge.id)
        setPendingId(null)

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Reto eliminado.')
        setChallenges((prev) => prev.filter((item) => item.id !== challenge.id))
        setSelectedChallenge((current) => current?.id === challenge.id ? null : current)
      },
      'danger',
    )
  }

  function handleDeleteOld() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Costa_Rica' })
    const cancelled = challenges.filter(c => c.status === 'cancelled').length
    const pastConfirmed = challenges.filter(c => c.status === 'confirmed' && c.challenge_date < today).length
    const total = cancelled + pastConfirmed

    if (total === 0) {
      toast.info('No hay retos cancelados ni pasados para eliminar.')
      return
    }

    showConfirm(
      `Eliminar ${total} reto${total !== 1 ? 's' : ''}`,
      `Se eliminarán ${cancelled} cancelado${cancelled !== 1 ? 's' : ''} y ${pastConfirmed} confirmado${pastConfirmed !== 1 ? 's' : ''} con fecha pasada. Esta acción no se puede deshacer.`,
      async () => {
        setPendingId('bulk')
        const result = await deleteOldChallenges(businessId)
        setPendingId(null)

        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success(`${result.count} reto${result.count !== 1 ? 's' : ''} eliminado${result.count !== 1 ? 's' : ''}.`)
        setChallenges((prev) => prev.filter(c => {
          if (c.status === 'cancelled') return false
          if (c.status === 'confirmed' && c.challenge_date < today) return false
          return true
        }))
      },
      'danger',
    )
  }

  const clearFilters = () => {
    setSearchTerm('')
    setActiveFilter('all')
    setCourtFilter('all')
    setCategoryFilter('all')
    setDateFilter('all')
    setStatusFilter('all')
    setSortOption('attention')
    setPage(1)
  }

  const updateActiveFilter = (value: FilterId) => {
    setActiveFilter(value)
    setPage(1)
  }

  const updateSearchTerm = (value: string) => {
    setSearchTerm(value)
    setPage(1)
  }

  const updateCourtFilter = (value: string) => {
    setCourtFilter(value)
    setPage(1)
  }

  const updateCategoryFilter = (value: string) => {
    setCategoryFilter(value)
    setPage(1)
  }

  const updateDateFilter = (value: DateFilter) => {
    setDateFilter(value)
    setPage(1)
  }

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const updateSortOption = (value: SortOption) => {
    setSortOption(value)
    setPage(1)
  }

  return (
    <>
      <div className="min-w-0 space-y-5">
        <div className="-mx-4 -mt-4 bg-emerald-950 px-4 py-6 shadow-sm md:-mx-6 md:-mt-6 md:px-6 lg:-mx-9 lg:-mt-9 lg:px-9">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">Retos</h1>
            <Button
              type="button"
              onClick={handleDeleteOld}
              disabled={pendingId === 'bulk'}
              className="shrink-0 rounded-lg bg-rose-600 px-4 text-xs font-black text-white hover:bg-rose-700 sm:text-sm"
            >
              {pendingId === 'bulk' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Limpiar historial
            </Button>
          </div>
        </div>

        <SummaryCounters counts={counts} />

        <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="inline-flex min-w-max rounded-lg border border-slate-200 bg-white p-1">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => updateActiveFilter(filter.id)}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                    activeFilter === filter.id ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  {filter.label}
                  <span className={cn('rounded-full px-2 py-0.5 text-xs', activeFilter === filter.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="relative block min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <span className="sr-only">Buscar retos</span>
            <Input
              value={searchTerm}
              onChange={(event) => updateSearchTerm(event.target.value)}
              placeholder="Buscar por retador, rival o teléfono..."
              className="h-10 rounded-lg border-slate-200 bg-white pl-10 text-slate-950"
            />
          </label>
        </section>

        <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 lg:w-auto"
            aria-expanded={filtersOpen}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeExtraFilterCount > 0 && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">{activeExtraFilterCount}</span>}
            <ChevronDown className={cn('h-4 w-4 transition-transform', filtersOpen && 'rotate-180')} />
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm font-bold text-slate-600">Ordenar por</span>
            <Select value={sortOption} onValueChange={(value) => updateSortOption(value as SortOption)}>
              <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-slate-950 sm:w-56">
                <SelectValue>{getSortLabel(sortOption)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white text-slate-950">
                <SelectItem value="attention">Pendientes de atención</SelectItem>
                <SelectItem value="upcoming">Más próximos</SelectItem>
                <SelectItem value="recent">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguos</SelectItem>
                <SelectItem value="creator">Nombre del retador</SelectItem>
                <SelectItem value="status">Estado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {filtersOpen && (
          <AdvancedFilters
            courts={courts}
            categories={categories}
            courtFilter={courtFilter}
            categoryFilter={categoryFilter}
            dateFilter={dateFilter}
            statusFilter={statusFilter}
            onCourtChange={updateCourtFilter}
            onCategoryChange={updateCategoryFilter}
            onDateChange={updateDateFilter}
            onStatusChange={updateStatusFilter}
            onClear={clearFilters}
          />
        )}

        <section className="min-w-0">
          {paginatedChallenges.length === 0 ? (
            <EmptyChallenges activeFilter={activeFilter} hasFilters={Boolean(searchTerm.trim() || activeExtraFilterCount > 0 || activeFilter !== 'all')} onClear={clearFilters} />
          ) : (
            <>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-slate-600">Mostrando {startResult}-{endResult} de {filteredChallenges.length} retos</p>
              </div>
              <div className="space-y-3">
                {paginatedChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    slug={slug}
                    pending={pendingId === challenge.id}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    onDelete={handleDelete}
                    onDetail={setSelectedChallenge}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button variant="outline" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
                  <span className="text-sm font-bold text-slate-600">Página {page} de {totalPages}</span>
                  <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Siguiente</Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <ChallengeDetailDialog
        challenge={selectedChallenge}
        slug={slug}
        onOpenChange={(open) => {
          if (!open) setSelectedChallenge(null)
        }}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onDelete={handleDelete}
        pending={selectedChallenge ? pendingId === selectedChallenge.id : false}
      />

      <ConfirmationDialog
        isOpen={confirmConfig.isOpen}
        onOpenChange={(open) => setConfirmConfig((prev) => ({ ...prev, isOpen: open }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        variant={confirmConfig.variant}
      />
    </>
  )
}

function SummaryCounters({ counts }: { counts: Record<FilterId, number> }) {
  const items: Array<{ id: FilterId; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'open', label: 'Abiertos' },
    { id: 'accepted', label: 'Aceptados' },
    { id: 'confirmed', label: 'Confirmados' },
    { id: 'history', label: 'Historial' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.id} className={cn('rounded-lg border px-3 py-2 shadow-sm', summaryStyles[item.id])}>
          <p className="text-xs font-black uppercase opacity-75">{item.label}</p>
          <p className="mt-1 text-2xl font-black">{counts[item.id]}</p>
        </div>
      ))}
    </div>
  )
}

function AdvancedFilters({
  courts,
  categories,
  courtFilter,
  categoryFilter,
  dateFilter,
  statusFilter,
  onCourtChange,
  onCategoryChange,
  onDateChange,
  onStatusChange,
  onClear,
}: {
  courts: CourtFilterOption[]
  categories: string[]
  courtFilter: string
  categoryFilter: string
  dateFilter: DateFilter
  statusFilter: string
  onCourtChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onDateChange: (value: DateFilter) => void
  onStatusChange: (value: string) => void
  onClear: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[220px_200px_180px_180px_auto] xl:items-end">
        <FilterSelect label="Cancha" value={courtFilter} displayValue={getCourtFilterLabel(courtFilter, courts)} onValueChange={(value) => onCourtChange(value || 'all')}>
          <SelectItem value="all">Todas las canchas</SelectItem>
          {courts.map((court) => <SelectItem key={court.id} value={court.id}>{court.name}</SelectItem>)}
        </FilterSelect>
        <FilterSelect label="Categoría" value={categoryFilter} displayValue={categoryFilter === 'all' ? 'Todas las categorías' : getGenderLabel(categoryFilter)} onValueChange={(value) => onCategoryChange(value || 'all')}>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {categories.map((category) => <SelectItem key={category} value={category}>{getGenderLabel(category)}</SelectItem>)}
        </FilterSelect>
        <FilterSelect label="Fecha" value={dateFilter} displayValue={getDateFilterLabel(dateFilter)} onValueChange={(value) => onDateChange((value || 'all') as DateFilter)}>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="future">Próximos</SelectItem>
          <SelectItem value="past">Anteriores</SelectItem>
        </FilterSelect>
        <FilterSelect label="Estado" value={statusFilter} displayValue={statusFilter === 'all' ? 'Todos' : getStatusLabel(statusFilter)} onValueChange={(value) => onStatusChange(value || 'all')}>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="open">Abierto</SelectItem>
          <SelectItem value="accepted">Aceptado</SelectItem>
          <SelectItem value="confirmed">Confirmado</SelectItem>
          <SelectItem value="cancelled">Cancelado</SelectItem>
          <SelectItem value="completed">Finalizado</SelectItem>
          <SelectItem value="expired">Expirado</SelectItem>
        </FilterSelect>
        <Button type="button" variant="outline" onClick={onClear} className="h-10 rounded-lg border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-100 md:col-span-2 xl:col-span-1">
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpiar filtros
        </Button>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, displayValue, onValueChange, children }: { label: string; value: string; displayValue: string; onValueChange: (value: string | null) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-black uppercase text-slate-600">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 border-slate-200 bg-white text-slate-950">
          <SelectValue>{displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white text-slate-950">{children}</SelectContent>
      </Select>
    </div>
  )
}

function ChallengeCard({
  challenge,
  slug,
  pending,
  onConfirm,
  onCancel,
  onDelete,
  onDetail,
}: {
  challenge: Challenge
  slug: string
  pending: boolean
  onConfirm: (challenge: Challenge) => void
  onCancel: (challenge: Challenge, label?: string) => void
  onDelete: (challenge: Challenge) => void
  onDetail: (challenge: Challenge) => void
}) {
  const creatorPhone = challenge.creator?.phone || challenge.customer_phone
  const opponentName = getOpponentName(challenge)

  return (
    <Card className={cn('min-w-0 overflow-hidden rounded-xl border-slate-200 bg-white py-0 shadow-sm transition-colors hover:border-emerald-200', historicalStatuses.includes(challenge.status) && 'opacity-90')}>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1fr)_minmax(280px,1fr)_220px]">
          <div className="border-b border-slate-100 p-4 xl:border-b-0 xl:border-r">
            <StatusBadge status={challenge.status} className="mb-3 xl:hidden" />
            <Participant name={getCreatorName(challenge)} role="Retador" phone={creatorPhone} whatsapp={getWhatsAppLink(challenge)} />
          </div>

          <div className="border-b border-slate-100 p-4 xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-center gap-3">
              <MiniAvatar name={getCreatorName(challenge)} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">VS</span>
              {opponentName ? <MiniAvatar name={opponentName} /> : <WaitingOpponentInline />}
            </div>
            <p className="mt-3 text-center text-sm font-black text-slate-950">
              {opponentName ? `${getCreatorName(challenge)} vs ${opponentName}` : 'Esperando oponente'}
            </p>
            {!opponentName && <div className="mt-2 flex justify-center"><StatusBadge status="open" /></div>}
          </div>

          <div className="grid gap-2 border-b border-slate-100 p-4 text-sm text-slate-700 sm:grid-cols-2 xl:border-b-0 xl:border-r">
            <InfoLine icon={MapPin} value={`${challenge.courts?.name || 'Cancha sin nombre'}${challenge.courts?.description ? ` · ${challenge.courts.description}` : ''}`} />
            <InfoLine icon={Calendar} value={formatDate(challenge.challenge_date)} />
            <InfoLine icon={Clock} value={formatDisplayTime(challenge.challenge_time)} strong />
            <InfoLine icon={Shield} value={`${getGenderLabel(challenge.gender)} · ${getPlayerCount(challenge)} jugadores`} />
            {challenge.notes && <p className="line-clamp-2 sm:col-span-2 text-sm font-medium text-slate-500">{challenge.notes}</p>}
          </div>

          <div className="flex flex-col justify-center gap-2 p-4">
            <StatusBadge status={challenge.status} className="hidden xl:flex" />
            <ChallengePrimaryActions challenge={challenge} slug={slug} pending={pending} onConfirm={onConfirm} onCancel={onCancel} onDelete={onDelete} onDetail={onDetail} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Participant({ name, role, phone, whatsapp }: { name: string; role: string; phone?: string | null; whatsapp?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3 xl:block xl:text-center">
      <MiniAvatar name={name} />
      <div className="min-w-0 xl:mt-2">
        <p className="line-clamp-2 font-black leading-tight text-slate-950">{name}</p>
        <p className="mt-1 text-xs font-black uppercase text-slate-500">{role}</p>
        <div className="mt-1 flex items-center gap-2 xl:justify-center">
          <p className="text-sm font-semibold text-slate-600">{formatPhone(phone)}</p>
          {whatsapp && (
            <button
              type="button"
              onClick={() => window.open(whatsapp, '_blank', 'noopener,noreferrer')}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#25D366] transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label={`Contactar por WhatsApp a ${name}`}
              title="Contactar por WhatsApp"
            >
              <WhatsAppLogo className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-black uppercase text-emerald-700">
      {getInitial(name)}
    </span>
  )
}

function WaitingOpponentInline() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-500">
      <Swords className="h-4 w-4" />
    </span>
  )
}

function InfoLine({ icon: Icon, value, strong = false }: { icon: ElementType; value: string; strong?: boolean }) {
  return (
    <p className={cn('flex min-w-0 items-center gap-2', strong && 'font-black text-slate-950')}>
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      <span className="min-w-0 truncate" title={value}>{value}</span>
    </p>
  )
}

function ChallengePrimaryActions({
  challenge,
  slug,
  pending,
  onConfirm,
  onCancel,
  onDelete,
  onDetail,
}: {
  challenge: Challenge
  slug: string
  pending: boolean
  onConfirm: (challenge: Challenge) => void
  onCancel: (challenge: Challenge, label?: string) => void
  onDelete: (challenge: Challenge) => void
  onDetail: (challenge: Challenge) => void
}) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Costa_Rica' })
  const isPastConfirmed = challenge.status === 'confirmed' && challenge.challenge_date < today
  const canDelete = challenge.status === 'cancelled' || isPastConfirmed

  return (
    <div className="mt-2 flex flex-col gap-2">
      {challenge.status === 'accepted' && (
        <Button type="button" onClick={() => onConfirm(challenge)} disabled={pending} className="h-10 rounded-lg bg-emerald-700 font-black text-white hover:bg-emerald-800" aria-label={`Confirmar reto de ${getCreatorName(challenge)}`}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Confirmar
        </Button>
      )}
      {challenge.status === 'open' && (
        <Button type="button" onClick={() => onConfirm(challenge)} disabled={pending} className="h-10 rounded-lg bg-blue-600 font-black text-white hover:bg-blue-700" aria-label={`Confirmar directo reto de ${getCreatorName(challenge)}`}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Confirmar directo
        </Button>
      )}
      {challenge.status === 'confirmed' && !isPastConfirmed && (
        <Link href={`/${slug}/admin/reservations`} className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
          <Calendar className="mr-2 h-4 h-4" />
          Ver reserva
        </Link>
      )}
      <div className={canDelete ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2'}>
        <Button type="button" variant="outline" onClick={() => onDetail(challenge)} className="h-10 rounded-lg border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-100" aria-label={`Ver detalle de ${getCreatorName(challenge)}`}>
          <Eye className="mr-2 h-4 w-4" />
          Detalle
        </Button>
        {(challenge.status === 'accepted' || (challenge.status === 'confirmed' && !isPastConfirmed)) && (
          <Button type="button" variant="outline" onClick={() => onCancel(challenge)} disabled={pending} className="h-10 rounded-lg border-rose-100 bg-white font-black text-rose-700 hover:bg-rose-50" aria-label={`Cancelar reto de ${getCreatorName(challenge)}`}>
            <XCircle className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        )}
        {challenge.status === 'open' && (
          <Button type="button" variant="outline" onClick={() => onCancel(challenge, 'Eliminar reto')} disabled={pending} className="h-10 rounded-lg border-rose-100 bg-white font-black text-rose-700 hover:bg-rose-50" aria-label={`Eliminar reto de ${getCreatorName(challenge)}`}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        )}
        {canDelete && (
          <Button type="button" variant="outline" onClick={() => onDelete(challenge)} disabled={pending} className="h-10 rounded-lg border-rose-200 bg-rose-50 font-black text-rose-700 hover:bg-rose-100" aria-label={`Eliminar reto de ${getCreatorName(challenge)}`}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        )}
      </div>
    </div>
  )
}

/* function ChallengeMenu({
  challenge,
  slug,
  onConfirm,
  onCancel,
  onDetail,
}: {
  challenge: Challenge
  slug: string
  onConfirm: (challenge: Challenge) => void
  onCancel: (challenge: Challenge, label?: string) => void
  onDetail: (challenge: Challenge) => void
}) {
  const whatsapp = getWhatsAppLink(challenge)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label={`Más acciones de ${getCreatorName(challenge)}`}>
        <MoreVertical className="h-4 w-4" />
        Más acciones
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48 bg-white text-slate-950">
        <DropdownMenuItem onClick={() => onDetail(challenge)} className="gap-2">
          <Eye className="h-4 w-4" />
          Ver detalle
        </DropdownMenuItem>
        {challenge.status === 'open' && (
          <DropdownMenuItem onClick={() => onConfirm(challenge)} className="gap-2 text-blue-700">
            <CheckCircle2 className="h-4 w-4" />
            Confirmar directo
          </DropdownMenuItem>
        )}
        {challenge.status === 'accepted' && (
          <DropdownMenuItem onClick={() => onConfirm(challenge)} className="gap-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Confirmar
          </DropdownMenuItem>
        )}
        {challenge.status === 'confirmed' && (
          <DropdownMenuItem onClick={() => window.location.assign(`/${slug}/admin/reservations`)} className="gap-2 text-emerald-700">
            <Calendar className="h-4 w-4" />
            Ver reserva
          </DropdownMenuItem>
        )}
        {whatsapp && (
          <DropdownMenuItem onClick={() => window.open(whatsapp, '_blank', 'noopener,noreferrer')} className="gap-2 text-emerald-700">
            <WhatsAppLogo className="h-4 w-4" />
            Contactar
          </DropdownMenuItem>
        )}
        {(challenge.status === 'accepted' || challenge.status === 'confirmed') && (
          <DropdownMenuItem onClick={() => onCancel(challenge)} className="gap-2 text-rose-700">
            <XCircle className="h-4 w-4" />
            Cancelar
          </DropdownMenuItem>
        )}
        {challenge.status === 'open' && (
          <DropdownMenuItem onClick={() => onCancel(challenge, 'Eliminar reto')} className="gap-2 text-rose-700">
            <Trash2 className="h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

} */

function ChallengeDetailDialog({
  challenge,
  slug,
  onOpenChange,
  onConfirm,
  onCancel,
  onDelete,
  pending,
}: {
  challenge: Challenge | null
  slug: string
  onOpenChange: (open: boolean) => void
  onConfirm: (challenge: Challenge) => void
  onCancel: (challenge: Challenge, label?: string) => void
  onDelete: (challenge: Challenge) => void
  pending: boolean
}) {
  return (
    <Dialog open={Boolean(challenge)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl overflow-y-auto rounded-xl border-slate-200 bg-white text-slate-950">
        {challenge && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{getCreatorName(challenge)} vs {getOpponentName(challenge) || 'Esperando oponente'}</DialogTitle>
              <DialogDescription>Detalle administrativo del reto.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <StatusBadge status={challenge.status} />
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem icon={Users} label="Retador" value={getCreatorName(challenge)} />
                <DetailItem icon={Swords} label="Rival" value={getOpponentName(challenge) || 'Esperando oponente'} />
                <DetailItem icon={MapPin} label="Cancha" value={challenge.courts?.name || 'Cancha sin nombre'} />
                <DetailItem icon={Calendar} label="Fecha" value={formatDate(challenge.challenge_date, true)} />
                <DetailItem icon={Clock} label="Hora" value={formatDisplayTime(challenge.challenge_time)} />
                <DetailItem icon={Shield} label="Categoría" value={`${getGenderLabel(challenge.gender)} · ${getPlayerCount(challenge)} jugadores`} />
                <DetailItem icon={Phone} label="Teléfono" value={formatPhone(challenge.creator?.phone || challenge.customer_phone)} />
              </div>
              {challenge.notes && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">{challenge.notes}</div>}
              <ChallengePrimaryActions challenge={challenge} slug={slug} pending={pending} onConfirm={onConfirm} onCancel={onCancel} onDelete={onDelete} onDetail={() => undefined} />
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

function StatusBadge({ status, className }: { status: ChallengeStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn('w-fit font-black', statusStyles[status] || 'border-slate-200 bg-slate-50 text-slate-700', className)}>
      {getStatusLabel(status)}
    </Badge>
  )
}

function EmptyChallenges({ activeFilter, hasFilters, onClear }: { activeFilter: FilterId; hasFilters: boolean; onClear: () => void }) {
  const emptyText: Record<FilterId, string> = {
    all: 'No hay retos registrados.',
    open: 'No hay retos esperando oponente.',
    accepted: 'No hay retos aceptados esperando confirmación.',
    confirmed: 'No hay retos confirmados en este momento.',
    history: 'No hay retos históricos para mostrar.',
  }

  return (
    <Card className="rounded-xl border-dashed border-slate-200 bg-white py-0">
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Swords className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-950">{hasFilters ? 'No se encontraron retos que coincidan con los filtros seleccionados.' : emptyText[activeFilter]}</h3>
        {hasFilters && (
          <Button type="button" variant="outline" onClick={onClear} className="mt-5 rounded-lg border-slate-200 font-black">
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function getCounts(challenges: Challenge[]): Record<FilterId, number> {
  return {
    all: challenges.length,
    open: challenges.filter((challenge) => challenge.status === 'open').length,
    accepted: challenges.filter((challenge) => challenge.status === 'accepted').length,
    confirmed: challenges.filter((challenge) => challenge.status === 'confirmed').length,
    history: challenges.filter((challenge) => historicalStatuses.includes(challenge.status)).length,
  }
}

function applyFilters(
  challenges: Challenge[],
  filters: {
    activeFilter: FilterId
    searchTerm: string
    courtFilter: string
    categoryFilter: string
    dateFilter: DateFilter
    statusFilter: string
  },
) {
  const term = filters.searchTerm.trim().toLowerCase()
  const todayKey = getTodayKey()

  return challenges.filter((challenge) => {
    const matchesTab =
      filters.activeFilter === 'all' ||
      challenge.status === filters.activeFilter ||
      (filters.activeFilter === 'history' && historicalStatuses.includes(challenge.status))
    if (!matchesTab) return false

    if (filters.courtFilter !== 'all' && challenge.court_id !== filters.courtFilter) return false
    if (filters.categoryFilter !== 'all' && normalizeCategory(challenge.gender) !== filters.categoryFilter) return false
    if (filters.statusFilter !== 'all' && challenge.status !== filters.statusFilter) return false
    if (filters.dateFilter === 'future' && challenge.challenge_date < todayKey) return false
    if (filters.dateFilter === 'past' && challenge.challenge_date >= todayKey) return false

    if (!term) return true
    const searchable = [
      getCreatorName(challenge),
      getOpponentName(challenge),
      challenge.customer_phone,
      challenge.creator?.phone,
      challenge.opponent?.phone,
      challenge.courts?.name,
      challenge.courts?.description,
      challenge.notes,
      getGenderLabel(challenge.gender),
    ].filter(Boolean).join(' ').toLowerCase()

    return searchable.includes(term)
  })
}

function sortChallenges(challenges: Challenge[], sortOption: SortOption) {
  return [...challenges].sort((a, b) => {
    if (sortOption === 'creator') return getCreatorName(a).localeCompare(getCreatorName(b), 'es')
    if (sortOption === 'status') return getStatusLabel(a.status).localeCompare(getStatusLabel(b.status), 'es')
    if (sortOption === 'recent') return getDateTimeValue(b) - getDateTimeValue(a)
    if (sortOption === 'oldest') return getDateTimeValue(a) - getDateTimeValue(b)
    if (sortOption === 'upcoming') return getDateTimeValue(a) - getDateTimeValue(b)

    const priority = getAttentionPriority(a) - getAttentionPriority(b)
    if (priority !== 0) return priority
    return getDateTimeValue(a) - getDateTimeValue(b)
  })
}

function getAttentionPriority(challenge: Challenge) {
  if (challenge.status === 'accepted') return 0
  if (challenge.status === 'open') return 1
  if (challenge.status === 'confirmed') return 2
  return 3
}

function getDateTimeValue(challenge: Challenge) {
  return new Date(`${challenge.challenge_date}T${challenge.challenge_time || '00:00:00'}`).getTime()
}

function getCategoryOptions(challenges: Challenge[]) {
  const values = new Set(challenges.map((challenge) => normalizeCategory(challenge.gender)).filter(Boolean))
  return Array.from(values)
}

function getCreatorName(challenge: Challenge) {
  return challenge.creator?.full_name || challenge.customer_name || 'Retador'
}

function getOpponentName(challenge: Challenge) {
  return challenge.opponent?.full_name || ''
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'J'
}

function getPlayerCount(challenge: Challenge) {
  return (challenge.men_count || 0) + (challenge.women_count || 0)
}

function normalizeCategory(gender: string | null) {
  return (gender || 'sin-categoria').trim().toLowerCase()
}

function getCourtFilterLabel(value: string, courts: CourtFilterOption[]) {
  if (value === 'all') return 'Todas las canchas'
  return courts.find((court) => court.id === value)?.name || 'Todas las canchas'
}

function getDateFilterLabel(value: DateFilter) {
  if (value === 'future') return 'Próximos'
  if (value === 'past') return 'Anteriores'
  return 'Todas'
}

function getSortLabel(value: SortOption) {
  const labels: Record<SortOption, string> = {
    attention: 'Pendientes de atención',
    upcoming: 'Más próximos',
    recent: 'Más recientes',
    oldest: 'Más antiguos',
    creator: 'Nombre del retador',
    status: 'Estado',
  }
  return labels[value] || labels.attention
}

function getGenderLabel(gender: string | null) {
  const normalized = normalizeCategory(gender)
  if (['masculino', 'male', 'men', 'hombres'].includes(normalized)) return 'Masculino'
  if (['femenino', 'female', 'women', 'mujeres'].includes(normalized)) return 'Femenino'
  if (['mixto', 'mixed'].includes(normalized)) return 'Mixto'
  if (normalized === 'sin-categoria') return 'Sin categoría'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function getStatusLabel(status: string) {
  return statusLabels[status] || status
}

function formatPhone(phone?: string | null) {
  return phone && phone !== 'Sin teléfono' && phone !== 'N/A' ? phone : '—'
}

function getWhatsAppLink(challenge: Challenge) {
  const rawPhone = challenge.opponent?.phone || challenge.creator?.phone || challenge.customer_phone || ''
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '')
  if (!cleanPhone || rawPhone === 'Sin teléfono' || rawPhone === 'N/A') return null
  const finalPhone = cleanPhone.length === 8 ? `506${cleanPhone}` : cleanPhone
  const message = `Hola, te contacto por el reto programado en ${challenge.courts?.name || 'la cancha'} para el ${formatDate(challenge.challenge_date, true)} a las ${formatDisplayTime(challenge.challenge_time)}.`
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
}

function formatDisplayTime(value: string) {
  return formatTime12h(value)
}

function formatDate(value: string, long = false) {
  if (!value) return 'Fecha pendiente'
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('es-CR', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone } : { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(date).replace('.', '')
}

function getTodayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`
}

function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.03 3.2A12.74 12.74 0 0 0 5.17 22.6L3.6 28.8l6.34-1.52A12.75 12.75 0 1 0 16.03 3.2Zm0 22.26a9.48 9.48 0 0 1-4.83-1.32l-.35-.21-3.76.9.92-3.65-.23-.38a9.5 9.5 0 1 1 8.25 4.66Zm5.47-7.11c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  )
}
