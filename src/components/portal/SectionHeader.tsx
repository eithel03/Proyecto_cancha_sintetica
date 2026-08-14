import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-3', className)}>
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          {Icon && (
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="w-4.5 h-4.5 text-primary" />
            </span>
          )}
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground font-medium">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
