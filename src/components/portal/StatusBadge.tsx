import { cn } from '@/lib/utils'

type StatusVariant = 'available' | 'occupied' | 'confirmed' | 'pending' | 'cancelled' | 'live' | 'open' | 'accepted' | 'confirmed_challenge' | 'finished'

const statusConfig: Record<StatusVariant, { label: string; className: string; dotClassName?: string }> = {
  available: {
    label: 'Disponible',
    className: 'bg-green-50 text-green-700 border border-green-200/70',
    dotClassName: 'bg-green-600',
  },
  occupied: {
    label: 'Ocupada',
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
    dotClassName: 'bg-slate-400',
  },
  confirmed: {
    label: 'Confirmada',
    className: 'bg-green-50 text-green-700 border border-green-200',
    dotClassName: 'bg-green-600',
  },
  pending: {
    label: 'Pendiente',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
    dotClassName: 'bg-amber-500',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-red-50 text-red-600 border border-red-200',
    dotClassName: 'bg-red-500',
  },
  live: {
    label: 'En vivo',
    className: 'bg-red-50 text-red-600 border border-red-200',
    dotClassName: 'bg-red-500 animate-pulse',
  },
  open: {
    label: 'Abierto',
    className: 'bg-green-50 text-green-700 border border-green-200',
    dotClassName: 'bg-green-600',
  },
  accepted: {
    label: 'Aceptado',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
    dotClassName: 'bg-amber-500',
  },
  confirmed_challenge: {
    label: 'Confirmado',
    className: 'bg-green-50 text-green-700 border border-green-200',
    dotClassName: 'bg-green-600',
  },
  finished: {
    label: 'Finalizado',
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
    dotClassName: 'bg-slate-400',
  },
}

export function StatusBadge({
  status,
  label,
  className,
  size = 'sm',
}: {
  status?: StatusVariant
  label?: string
  className?: string
  size?: 'xs' | 'sm' | 'md'
}) {
  const config = status ? statusConfig[status] : null
  const displayLabel = label || config?.label || ''
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-[11px]',
    md: 'px-3 py-1 text-xs',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        sizeClasses[size],
        config?.className || 'bg-slate-100 text-slate-600 border border-slate-200',
        className
      )}
    >
      {config?.dotClassName && (
        <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClassName)} />
      )}
      {displayLabel}
    </span>
  )
}
