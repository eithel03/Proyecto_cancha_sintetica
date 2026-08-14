'use client'

import { useMemo, useState } from 'react'
import Image, { type ImageLoaderProps } from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  Grid2X2,
  ImageIcon,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Table2,
  Trash2,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { cn } from '@/lib/utils'
import { createCourt, createPricingRule, deleteCourt, deletePricingRule, updateCourt, updateCourtStatus } from './actions'

type Court = {
  id: string
  business_id: string
  name: string
  description: string | null
  price_per_hour?: number | null
  price_per_person: number | null
  capacity: number | null
  image_url: string | null
  is_active: boolean | null
  created_at?: string | null
}

type PricingRule = {
  id: string
  court_id: string
  day_of_week: number
  start_time: string
  end_time: string
  price: number
}

type ViewMode = 'cards' | 'table'
type StatusFilter = 'all' | 'active' | 'inactive'

const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const shortDayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const passthroughImageLoader = ({ src }: ImageLoaderProps) => src

export default function CourtsClient({
  initialCourts,
  businessId,
}: {
  initialCourts: Court[]
  businessId: string
}) {
  const params = useParams()
  const slug = params.slug as string
  const [courts, setCourts] = useState<Court[]>(initialCourts)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [editingCourt, setEditingCourt] = useState<Court | null>(null)
  const [detailCourt, setDetailCourt] = useState<Court | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [pricingCourt, setPricingCourt] = useState<Court | null>(null)
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [selectedCapacity, setSelectedCapacity] = useState('5')
  const [selectedStatus, setSelectedStatus] = useState('true')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean
    title: string
    description: string
    onConfirm: () => void
    variant?: 'danger' | 'primary'
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => undefined,
  })

  const filteredCourts = useMemo(() => filterCourts(courts, query, statusFilter), [courts, query, statusFilter])
  const hasFilters = query.trim() || statusFilter !== 'all'

  const resetCourtDialog = () => {
    setEditingCourt(null)
    setImageUrl('')
    setSelectedCapacity('5')
    setSelectedStatus('true')
  }

  const openCreateDialog = () => {
    resetCourtDialog()
    setOpen(true)
  }

  const openEditDialog = (court: Court) => {
    setEditingCourt(court)
    setImageUrl(court.image_url || '')
    setSelectedCapacity(court.capacity?.toString() || '5')
    setSelectedStatus(court.is_active === false ? 'false' : 'true')
    setOpen(true)
  }

  const clearFilters = () => {
    setQuery('')
    setStatusFilter('all')
  }

  const showConfirm = (
    title: string,
    description: string,
    onConfirm: () => void,
    variant: 'danger' | 'primary' = 'primary',
  ) => {
    setConfirmConfig({ isOpen: true, title, description, onConfirm, variant })
  }

  async function onSubmit(formData: FormData) {
    const name = String(formData.get('name') || '').trim()
    const price = Number(formData.get('price_per_person') || 0)

    if (!name) {
      toast.error('El nombre de la cancha es obligatorio')
      return
    }
    if (price < 0) {
      toast.error('El precio no puede ser negativo')
      return
    }

    setPending(true)
    formData.append('business_id', businessId)
    formData.append('slug', slug)
    formData.append('capacity', selectedCapacity)
    formData.append('image_url', imageUrl || editingCourt?.image_url || '')
    formData.append('is_active', selectedStatus)

    const result = editingCourt
      ? await updateCourt(appendCourtId(formData, editingCourt.id))
      : await createCourt(formData)

    setPending(false)

    if (result.error || !result.data) {
      toast.error(result.error || 'No se pudo guardar la cancha')
      return
    }

    const savedCourt = result.data as Court
    setCourts((current) =>
      editingCourt
        ? current.map((court) => court.id === savedCourt.id ? savedCourt : court)
        : [savedCourt, ...current],
    )
    toast.success(editingCourt ? 'Cancha actualizada' : 'Cancha creada exitosamente')
    setOpen(false)
    resetCourtDialog()
  }

  async function handleStatusChange(court: Court, isActive: boolean) {
    showConfirm(
      isActive ? 'Activar cancha' : 'Desactivar cancha',
      isActive
        ? `¿Deseas activar ${court.name}? Volverá a estar disponible para reservas.`
        : `¿Deseas desactivar ${court.name}? Ya no estará disponible para nuevas reservas.`,
      async () => {
        const result = await updateCourtStatus(court.id, isActive, slug)
        if (result.error || !result.data) {
          toast.error(result.error || 'No se pudo actualizar el estado')
          return
        }
        const updatedCourt = result.data as Court
        setCourts((current) => current.map((item) => item.id === updatedCourt.id ? updatedCourt : item))
        setDetailCourt((current) => current?.id === updatedCourt.id ? updatedCourt : current)
        toast.success(isActive ? 'Cancha activada' : 'Cancha desactivada')
      },
      isActive ? 'primary' : 'danger',
    )
  }

  async function handleDelete(court: Court) {
    showConfirm(
      'Eliminar cancha',
      `¿Deseas eliminar ${court.name}? Si tiene reservas vinculadas, el sistema impedirá la eliminación.`,
      async () => {
        const result = await deleteCourt(court.id, slug)
        if (result.error) {
          toast.error(result.error)
        } else {
          setCourts((current) => current.filter((item) => item.id !== court.id))
          toast.success('Cancha eliminada')
        }
      },
      'danger',
    )
  }

  const loadPricingRules = async (court: Court) => {
    setPricingCourt(court)
    setLoadingPricing(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('court_pricing_rules')
      .select('*')
      .eq('court_id', court.id)
      .order('day_of_week')
      .order('start_time')

    if (error) {
      toast.error('No se pudieron cargar las tarifas: ' + error.message)
      setPricingRules([])
    } else {
      setPricingRules((data || []) as PricingRule[])
    }
    setLoadingPricing(false)
  }

  const addPricingRule = async (formData: FormData) => {
    if (!pricingCourt) return

    setPending(true)
    const result = await createPricingRule({
      court_id: pricingCourt.id,
      day_of_week: Number(formData.get('day_of_week')),
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      price: Number(formData.get('price')),
    })

    if (result.success && result.data) {
      setPricingRules((current) => [...current, result.data as PricingRule].sort(sortPricingRules))
      toast.success('Regla de precio añadida')
    } else {
      toast.error(result.error)
    }
    setPending(false)
  }

  const handleDeletePricingRule = async (id: string) => {
    const result = await deletePricingRule(id)
    if (result.success) {
      setPricingRules((current) => current.filter((rule) => rule.id !== id))
      toast.success('Regla eliminada')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <ConfirmationDialog
        isOpen={confirmConfig.isOpen}
        onOpenChange={(val) => setConfirmConfig({ ...confirmConfig, isOpen: val })}
        title={confirmConfig.title}
        description={confirmConfig.description}
        onConfirm={confirmConfig.onConfirm}
        variant={confirmConfig.variant}
      />

      <div className="min-w-0 space-y-5">
        <div className="-mx-4 -mt-4 bg-emerald-950 px-4 py-6 shadow-sm md:-mx-6 md:-mt-6 md:px-6 lg:-mx-9 lg:-mt-9 lg:px-9">
          <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">Canchas</h1>
        </div>

        <section className="flex min-w-0 justify-end">
          <Dialog
            open={open}
            onOpenChange={(val) => {
              setOpen(val)
              if (!val) resetCourtDialog()
            }}
          >
            <DialogTrigger
              render={
                <Button
                  className="h-11 w-full rounded-lg bg-amber-400 px-5 font-black text-emerald-950 shadow-sm hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-500 lg:w-auto"
                  onClick={openCreateDialog}
                  aria-label="Agregar cancha"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar cancha
                </Button>
              }
            />
            <CourtFormDialog
              editingCourt={editingCourt}
              imageUrl={imageUrl}
              isUploading={isUploading}
              pending={pending}
              selectedCapacity={selectedCapacity}
              selectedStatus={selectedStatus}
              businessId={businessId}
              setImageUrl={setImageUrl}
              setIsUploading={setIsUploading}
              setSelectedCapacity={setSelectedCapacity}
              setSelectedStatus={setSelectedStatus}
              onSubmit={onSubmit}
            />
          </Dialog>
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1fr)_auto_auto] xl:items-center">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cancha..."
              className="h-10 rounded-lg border-slate-200 bg-white pl-10 font-medium text-slate-950"
            />
          </div>

          <SegmentedControl label="Filtrar por estado">
            <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Todas</FilterButton>
            <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>Activas</FilterButton>
            <FilterButton active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>Inactivas</FilterButton>
          </SegmentedControl>

          <SegmentedControl label="Cambiar vista">
            <FilterButton active={viewMode === 'cards'} onClick={() => setViewMode('cards')}>
              <Grid2X2 className="h-4 w-4" />
              Tarjetas
            </FilterButton>
            <FilterButton active={viewMode === 'table'} onClick={() => setViewMode('table')}>
              <Table2 className="h-4 w-4" />
              Tabla
            </FilterButton>
          </SegmentedControl>
        </section>

        {filteredCourts.length === 0 ? (
          <EmptyState
            hasCourts={courts.length > 0}
            hasFilters={Boolean(hasFilters)}
            onAdd={openCreateDialog}
            onClear={clearFilters}
          />
        ) : viewMode === 'cards' ? (
          <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredCourts.map((court) => (
              <CourtCard
                key={court.id}
                court={court}
                slug={slug}
                onDetail={setDetailCourt}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onPricing={loadPricingRules}
                onStatusChange={handleStatusChange}
              />
            ))}
            <AddCourtCard onClick={openCreateDialog} />
          </div>
        ) : (
          <CourtsTable
            courts={filteredCourts}
            slug={slug}
            onDetail={setDetailCourt}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onPricing={loadPricingRules}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      <CourtDetailDialog
        court={detailCourt}
        slug={slug}
        onOpenChange={(openDetail) => {
          if (!openDetail) setDetailCourt(null)
        }}
        onEdit={openEditDialog}
        onPricing={loadPricingRules}
        onStatusChange={handleStatusChange}
      />

      <PricingPanel
        court={pricingCourt}
        rules={pricingRules}
        pending={pending}
        loading={loadingPricing}
        onClose={() => setPricingCourt(null)}
        onSubmit={addPricingRule}
        onDeleteRule={handleDeletePricingRule}
      />
    </>
  )
}

function appendCourtId(formData: FormData, id: string) {
  formData.append('id', id)
  return formData
}

function SegmentedControl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1 sm:flex" aria-label={label}>
      {children}
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
        active ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100',
      )}
    >
      {children}
    </button>
  )
}

function CourtCard({
  court,
  slug,
  onDetail,
  onEdit,
  onDelete,
  onPricing,
  onStatusChange,
}: {
  court: Court
  slug: string
  onDetail: (court: Court) => void
  onEdit: (court: Court) => void
  onDelete: (court: Court) => void
  onPricing: (court: Court) => void
  onStatusChange: (court: Court, isActive: boolean) => void
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-xl border-slate-200 bg-white py-0 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200">
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950">
        {court.image_url && (
          <Image
            src={court.image_url}
            loader={passthroughImageLoader}
            unoptimized
            className="object-cover opacity-25"
            alt={court.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
          />
        )}
        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <TypeBadge court={court} />
            <StatusBadge active={Boolean(court.is_active)} />
          </div>
          <CourtActions
            court={court}
            slug={slug}
            onDetail={onDetail}
            onEdit={onEdit}
            onDelete={onDelete}
            onPricing={onPricing}
            onStatusChange={onStatusChange}
          />
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="line-clamp-2 text-xl font-black tracking-tight text-white">{court.name}</h3>
        </div>
      </div>

      <CardContent className="space-y-4 p-4">
        <div>
          <p className="font-bold text-slate-700">{getCourtTypeLabel(court)}</p>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-relaxed text-slate-500">
            {court.description || 'Sin descripción registrada.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoTile icon={Users} label="Capacidad" value={`${court.capacity || 5} jugadores`} />
          <InfoTile icon={Coins} label="Precio base" value={formatCurrency(court.price_per_person)} />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href={`/${slug}/reservar?courtId=${court.id}`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-black text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:col-span-2"
            aria-label={`Ver disponibilidad de ${court.name}`}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver disponibilidad
          </Link>
          <Button type="button" variant="outline" className="h-10 w-full rounded-lg border-slate-200 bg-slate-50 font-black text-slate-900 hover:bg-slate-100" onClick={() => onPricing(court)} aria-label={`Administrar precios de ${court.name}`}>
            <Clock className="mr-2 h-4 w-4" />
            Precios
          </Button>
          <Button type="button" variant="outline" className="h-10 w-full rounded-lg border-slate-200 bg-slate-50 font-black text-slate-900 hover:bg-slate-100" onClick={() => onEdit(court)} aria-label={`Editar ${court.name}`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AddCourtCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[360px] rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-6 text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      aria-label="Agregar cancha"
    >
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-slate-300">
        <Plus className="h-5 w-5" />
      </span>
      <span className="mt-3 block font-semibold">Agregar cancha</span>
    </button>
  )
}

function CourtActions({
  court,
  slug,
  onDetail,
  onEdit,
  onDelete,
  onPricing,
  onStatusChange,
}: {
  court: Court
  slug: string
  onDetail: (court: Court) => void
  onEdit: (court: Court) => void
  onDelete: (court: Court) => void
  onPricing: (court: Court) => void
  onStatusChange: (court: Court, isActive: boolean) => void
}) {
  const router = useRouter()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-950/70 text-white shadow-sm backdrop-blur transition-colors hover:bg-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={`Acciones de ${court.name}`}
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 bg-white text-slate-950">
        <DropdownMenuItem onClick={() => onDetail(court)} className="gap-2">
          <Eye className="h-4 w-4" />
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(court)} className="gap-2">
          <Pencil className="h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPricing(court)} className="gap-2">
          <Clock className="h-4 w-4" />
          Administrar precios
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/${slug}/reservar?courtId=${court.id}`)} className="gap-2">
          <CalendarDays className="h-4 w-4" />
          Ver disponibilidad
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatusChange(court, !court.is_active)} className={cn('gap-2', court.is_active ? 'text-rose-700' : 'text-emerald-700')}>
          {court.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {court.is_active ? 'Desactivar cancha' : 'Activar cancha'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(court)} className="gap-2 text-rose-700">
          <Trash2 className="h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CourtsTable({
  courts,
  slug,
  onDetail,
  onEdit,
  onDelete,
  onPricing,
  onStatusChange,
}: {
  courts: Court[]
  slug: string
  onDetail: (court: Court) => void
  onEdit: (court: Court) => void
  onDelete: (court: Court) => void
  onPricing: (court: Court) => void
  onStatusChange: (court: Court, isActive: boolean) => void
}) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[minmax(220px,1.3fr)_130px_150px_150px_160px_72px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black uppercase text-slate-600">
            <span>Cancha</span>
            <span>Tipo</span>
            <span>Capacidad</span>
            <span>Precio base</span>
            <span>Disponibilidad</span>
            <span className="text-right">Acciones</span>
          </div>
          <div className="divide-y divide-slate-100">
            {courts.map((court) => (
              <div key={court.id} className="grid grid-cols-[minmax(220px,1.3fr)_130px_150px_150px_160px_72px] items-center gap-4 px-5 py-4 transition-colors hover:bg-emerald-50/40">
                <div className="min-w-0">
                  <p className="line-clamp-2 font-black text-slate-950">{court.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">{court.description || 'Sin descripción.'}</p>
                  <div className="mt-2"><StatusBadge active={Boolean(court.is_active)} /></div>
                </div>
                <TypeBadge court={court} />
                <p className="font-semibold text-slate-700">{court.capacity || 5} jugadores</p>
                <p className="font-black text-emerald-700">{formatCurrency(court.price_per_person)}</p>
                <Link href={`/${slug}/reservar?courtId=${court.id}`} className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver disponibilidad
                </Link>
                <div className="justify-self-end">
                  <CourtActions court={court} slug={slug} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} onPricing={onPricing} onStatusChange={onStatusChange} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {courts.map((court) => (
          <CourtCard key={court.id} court={court} slug={slug} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} onPricing={onPricing} onStatusChange={onStatusChange} />
        ))}
      </div>
    </>
  )
}

function EmptyState({ hasCourts, hasFilters, onAdd, onClear }: { hasCourts: boolean; hasFilters: boolean; onAdd: () => void; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <p className="text-lg font-black text-slate-950">
        {hasCourts ? 'No se encontraron canchas que coincidan con los filtros seleccionados.' : 'No hay canchas registradas.'}
      </p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        {hasFilters ? (
          <Button type="button" variant="outline" onClick={onClear} className="rounded-lg border-slate-200 font-black">
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        ) : (
          <Button type="button" onClick={onAdd} className="rounded-lg bg-amber-400 font-black text-emerald-950 hover:bg-amber-300">
            <Plus className="mr-2 h-4 w-4" />
            Agregar primera cancha
          </Button>
        )}
      </div>
    </div>
  )
}

function CourtDetailDialog({
  court,
  slug,
  onOpenChange,
  onEdit,
  onPricing,
  onStatusChange,
}: {
  court: Court | null
  slug: string
  onOpenChange: (open: boolean) => void
  onEdit: (court: Court) => void
  onPricing: (court: Court) => void
  onStatusChange: (court: Court, isActive: boolean) => void
}) {
  return (
    <Dialog open={Boolean(court)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto rounded-xl border-slate-200 bg-white text-slate-950">
        {court && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{court.name}</DialogTitle>
              <DialogDescription>Detalle administrativo de la cancha.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <TypeBadge court={court} />
                <StatusBadge active={Boolean(court.is_active)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoTile icon={Users} label="Capacidad" value={`${court.capacity || 5} jugadores`} />
                <InfoTile icon={Coins} label="Precio base" value={formatCurrency(court.price_per_person)} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-500">Descripción</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">{court.description || 'Sin descripción registrada.'}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href={`/${slug}/reservar?courtId=${court.id}`} className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-black text-white hover:bg-emerald-800">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver disponibilidad
                </Link>
                <Button type="button" variant="outline" className="h-10 rounded-lg border-slate-200 font-black" onClick={() => onPricing(court)}>
                  <Clock className="mr-2 h-4 w-4" />
                  Precios
                </Button>
                <Button type="button" variant="outline" className="h-10 rounded-lg border-slate-200 font-black" onClick={() => onEdit(court)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button type="button" variant="outline" className="h-10 rounded-lg border-slate-200 font-black" onClick={() => onStatusChange(court, !court.is_active)}>
                  {court.is_active ? <XCircle className="mr-2 h-4 w-4 text-rose-700" /> : <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-700" />}
                  {court.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PricingPanel({
  court,
  rules,
  pending,
  loading,
  onClose,
  onSubmit,
  onDeleteRule,
}: {
  court: Court | null
  rules: PricingRule[]
  pending: boolean
  loading: boolean
  onClose: () => void
  onSubmit: (formData: FormData) => void
  onDeleteRule: (id: string) => void
}) {
  return (
    <Dialog open={Boolean(court)} onOpenChange={(openPanel) => { if (!openPanel) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="fixed bottom-0 left-0 right-0 top-auto max-h-[92vh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-3xl border-slate-200 bg-white p-0 text-slate-950 sm:left-auto sm:right-0 sm:top-0 sm:h-dvh sm:max-h-dvh sm:max-w-[460px] sm:translate-x-0 sm:translate-y-0 sm:rounded-none sm:rounded-l-3xl"
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-6 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-black text-slate-950">Precios: {court?.name}</DialogTitle>
              <DialogDescription>Configura tarifas especiales por día y horario.</DialogDescription>
            </DialogHeader>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar panel de precios">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-black uppercase text-emerald-700">Precio base</p>
            <p className="mt-2 text-3xl font-black text-emerald-800">{formatCurrency(court?.price_per_person)} <span className="text-sm text-slate-500">por persona</span></p>
          </div>

          <form action={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Field label="Día" htmlFor="day_of_week">
              <Select name="day_of_week" defaultValue="0" items={dayNames.map((day, index) => ({ value: String(index), label: day }))}>
                <SelectTrigger id="day_of_week" className="h-11 w-full border-slate-200 bg-white">
                  <SelectValue placeholder="Selecciona el día" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-950">
                  {dayNames.map((day, index) => (
                    <SelectItem key={day} value={String(index)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio" htmlFor="start_time">
                <Input id="start_time" name="start_time" type="time" required className="h-11 border-slate-200 bg-white" />
              </Field>
              <Field label="Fin" htmlFor="end_time">
                <Input id="end_time" name="end_time" type="time" required className="h-11 border-slate-200 bg-white" />
              </Field>
            </div>

            <Field label="Precio especial (₡)" htmlFor="price">
              <Input id="price" name="price" type="number" required min="0" step="100" className="h-11 border-slate-200 bg-white" placeholder="13000" />
            </Field>

            <Button type="submit" className="h-11 w-full rounded-lg bg-emerald-700 font-black hover:bg-emerald-800" disabled={pending || !court}>
              {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Añadiendo...</> : <><Plus className="mr-2 h-4 w-4" />Añadir tarifa</>}
            </Button>
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase text-slate-500">Tarifas configuradas</h3>
              <Badge variant="outline" className="border-slate-200 text-slate-600">{rules.length}</Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-10">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
              </div>
            ) : rules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="font-bold text-slate-500">No hay tarifas especiales para esta cancha.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            {shortDayNames[rule.day_of_week] || 'DÍA'}
                          </Badge>
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-600">
                            <Clock className="h-4 w-4 text-slate-500" />
                            {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
                          </span>
                        </div>
                        <p className="mt-3 text-2xl font-black text-slate-950">{formatCurrency(rule.price)}</p>
                      </div>
                      <Button type="button" variant="destructive" size="icon" onClick={() => onDeleteRule(rule.id)} aria-label="Eliminar tarifa">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CourtFormDialog({
  editingCourt,
  imageUrl,
  isUploading,
  pending,
  selectedCapacity,
  selectedStatus,
  businessId,
  setImageUrl,
  setIsUploading,
  setSelectedCapacity,
  setSelectedStatus,
  onSubmit,
}: {
  editingCourt: Court | null
  imageUrl: string
  isUploading: boolean
  pending: boolean
  selectedCapacity: string
  selectedStatus: string
  businessId: string
  setImageUrl: (value: string) => void
  setIsUploading: (value: boolean) => void
  setSelectedCapacity: (value: string) => void
  setSelectedStatus: (value: string) => void
  onSubmit: (formData: FormData) => void
}) {
  return (
    <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto rounded-xl border-slate-200 bg-white text-slate-950">
      <DialogHeader>
        <DialogTitle>{editingCourt ? 'Editar cancha' : 'Nueva cancha'}</DialogTitle>
        <DialogDescription>Completa los detalles de la cancha sintética.</DialogDescription>
      </DialogHeader>
      <form key={editingCourt?.id || 'new'} action={onSubmit} className="space-y-4">
        <Field label="Nombre" htmlFor="name">
          <Input id="name" name="name" defaultValue={editingCourt?.name} placeholder="Cancha 1 (Fútbol 5)" required className="border-slate-200 bg-white" />
        </Field>
        <Field label="Precio por persona (₡)" htmlFor="price_per_person">
          <Input id="price_per_person" name="price_per_person" type="number" min="0" step="100" defaultValue={editingCourt?.price_per_person || undefined} placeholder="1500" required className="border-slate-200 bg-white" />
        </Field>
        <Field label="Tipo de cancha" htmlFor="capacity">
          <Select name="capacity" value={selectedCapacity} onValueChange={(value) => setSelectedCapacity(value || '5')} items={[
            { value: '5', label: 'Fútbol 5 (5 vs 5)' },
            { value: '6', label: 'Fútbol 6 (6 vs 6)' },
            { value: '7', label: 'Fútbol 7 (7 vs 7)' },
          ]}>
            <SelectTrigger id="capacity" className="w-full border-slate-200 bg-white">
              <SelectValue placeholder="Selecciona el tipo de cancha" />
            </SelectTrigger>
            <SelectContent className="bg-white text-slate-950">
              <SelectItem value="5">Fútbol 5 (5 vs 5)</SelectItem>
              <SelectItem value="6">Fútbol 6 (6 vs 6)</SelectItem>
              <SelectItem value="7">Fútbol 7 (7 vs 7)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estado" htmlFor="is_active">
          <Select name="is_active" value={selectedStatus} onValueChange={(value) => setSelectedStatus(value || 'true')} items={[
            { value: 'true', label: 'Activa' },
            { value: 'false', label: 'Inactiva' },
          ]}>
            <SelectTrigger id="is_active" className="w-full border-slate-200 bg-white">
              <SelectValue placeholder="Selecciona el estado" />
            </SelectTrigger>
            <SelectContent className="bg-white text-slate-950">
              <SelectItem value="true">Activa</SelectItem>
              <SelectItem value="false">Inactiva</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Descripción (opcional)" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={editingCourt?.description || undefined} placeholder="Detalles de la cancha..." className="border-slate-200 bg-white" />
        </Field>

        <div className="space-y-2">
          <Label>Imagen de la cancha</Label>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-24 sm:w-24">
              {imageUrl || editingCourt?.image_url ? (
                <Image
                  src={imageUrl || editingCourt?.image_url || ''}
                  loader={passthroughImageLoader}
                  unoptimized
                  className="object-cover"
                  alt="Vista previa de la cancha"
                  fill
                  sizes="96px"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-slate-400" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                type="file"
                accept="image/*"
                className="border-slate-200 bg-white"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return

                  setIsUploading(true)
                  try {
                    const { createClient } = await import('@/lib/supabase/client')
                    const supabase = createClient()
                    const fileExt = file.name.split('.').pop()
                    const fileName = `${crypto.randomUUID()}.${fileExt}`
                    const filePath = `${businessId}/${fileName}`
                    const { error } = await supabase.storage.from('courts').upload(filePath, file)

                    if (error) throw error

                    const { data: { publicUrl } } = supabase.storage.from('courts').getPublicUrl(filePath)
                    setImageUrl(publicUrl)
                    toast.success('Imagen cargada correctamente')
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Error desconocido'
                    toast.error('Error al cargar imagen: ' + message)
                  } finally {
                    setIsUploading(false)
                  }
                }}
                disabled={isUploading}
              />
              <p className="text-xs text-slate-500">Formato sugerido: JPG o PNG</p>
            </div>
          </div>
        </div>

        <Button type="submit" className="h-11 w-full rounded-lg bg-emerald-700 font-black hover:bg-emerald-800" disabled={pending || isUploading}>
          {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{editingCourt ? 'Actualizando...' : 'Creando...'}</> : editingCourt ? 'Guardar cambios' : 'Crear cancha'}
        </Button>
      </form>
    </DialogContent>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'w-fit border font-black',
        active
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
          : 'border-rose-100 bg-rose-50 text-rose-700',
      )}
    >
      <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-rose-500')} />
      {active ? 'Activa' : 'Inactiva'}
    </Badge>
  )
}

function TypeBadge({ court }: { court: Court }) {
  return (
    <Badge className="bg-emerald-950/80 font-black text-white">
      {getCourtTypeLabel(court).replace('Cancha ', '')}
    </Badge>
  )
}

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-2 text-base font-black text-slate-950">{value}</p>
    </div>
  )
}

function filterCourts(courts: Court[], query: string, statusFilter: StatusFilter) {
  const normalizedQuery = query.trim().toLowerCase()
  return courts.filter((court) => {
    const searchable = [court.name, court.description, getCourtTypeLabel(court), String(court.capacity || '')]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && Boolean(court.is_active)) ||
      (statusFilter === 'inactive' && !court.is_active)
    return matchesQuery && matchesStatus
  })
}

function getCourtTypeLabel(court: Court) {
  const description = court.description?.toLowerCase() || ''
  if (description.includes('multiuso')) return 'Cancha multiuso'
  return `Cancha fútbol ${court.capacity || 5}`
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(Number(value || 0)).replace(/\s/g, ' ')
}

function formatTime(value: string) {
  return value.substring(0, 5)
}

function sortPricingRules(a: PricingRule, b: PricingRule) {
  if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
  return a.start_time.localeCompare(b.start_time)
}
