import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorState({
  title = 'No pudimos cargar esta información',
  description,
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn(
      'rounded-2xl border border-red-200 bg-red-50 p-10 sm:p-14 text-center space-y-4',
      className
    )}>
      <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <div className="space-y-1">
        <p className="text-red-700 font-semibold">{title}</p>
        {description && (
          <p className="text-sm text-red-600/80">{description}</p>
        )}
      </div>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          className="border-red-200 text-red-600 hover:bg-red-100 font-semibold text-sm h-10 px-6 rounded-xl"
        >
          Intentar nuevamente
        </Button>
      )}
    </div>
  )
}
