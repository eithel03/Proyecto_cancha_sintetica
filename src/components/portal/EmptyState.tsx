import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export function EmptyState({
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
    <div
      className={cn(
        'rounded-2xl border-2 border-dashed border-border bg-white p-10 sm:p-14 text-center space-y-4',
        className
      )}
    >
      {Icon && (
        <div className="bg-muted w-14 h-14 rounded-2xl flex items-center justify-center mx-auto">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-foreground font-semibold">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
