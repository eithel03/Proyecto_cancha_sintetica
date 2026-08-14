import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export function StatCard({
  icon: Icon,
  label,
  value,
  color = 'primary',
  className,
}: {
  icon?: LucideIcon
  label: string
  value: string | number
  color?: 'primary' | 'gold' | 'emerald' | 'slate'
  className?: string
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    gold: 'bg-gold/15 text-navy',
    emerald: 'bg-green-50 text-green-600',
    slate: 'bg-slate-100 text-slate-600',
  }

  return (
    <div
      className={cn(
        'bg-white border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center',
        className
      )}
    >
      {Icon && (
        <span className={cn('flex size-8 items-center justify-center rounded-lg mb-2', colorMap[color])}>
          <Icon className="w-4 h-4" />
        </span>
      )}
      <span className={cn('text-2xl font-bold tracking-tight', color === 'gold' ? 'text-navy' : 'text-foreground')}>
        {value}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground mt-0.5">{label}</span>
    </div>
  )
}
