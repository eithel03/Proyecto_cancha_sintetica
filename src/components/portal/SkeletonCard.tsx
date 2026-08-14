import { cn } from '@/lib/utils'

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white border border-border rounded-2xl overflow-hidden', className)}>
      <div className="aspect-video bg-surface animate-shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-surface rounded-lg w-2/3 animate-shimmer" />
        <div className="h-4 bg-surface rounded-lg w-1/3 animate-shimmer" />
        <div className="flex gap-4">
          <div className="h-4 bg-surface rounded-lg w-16 animate-shimmer" />
          <div className="h-4 bg-surface rounded-lg w-16 animate-shimmer" />
        </div>
        <div className="h-6 bg-surface rounded-lg w-1/4 animate-shimmer" />
        <div className="h-11 bg-surface rounded-xl w-full animate-shimmer" />
      </div>
    </div>
  )
}

export function SkeletonSlotCard({ className }: { className?: string }) {
  return (
    <div className={cn('h-16 bg-white border border-border rounded-xl animate-shimmer', className)} />
  )
}

export function SkeletonMatchCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white border border-border rounded-xl overflow-hidden', className)}>
      <div className="h-10 bg-surface animate-shimmer" />
      <div className="p-5 flex items-center justify-between">
        <div className="flex-1 space-y-2 flex flex-col items-center">
          <div className="w-14 h-14 bg-surface rounded-xl animate-shimmer" />
          <div className="h-4 bg-surface rounded-lg w-20 animate-shimmer" />
        </div>
        <div className="flex items-baseline gap-2">
          <div className="w-8 h-8 bg-surface rounded-lg animate-shimmer" />
          <div className="w-4 h-4 bg-surface rounded animate-shimmer" />
          <div className="w-8 h-8 bg-surface rounded-lg animate-shimmer" />
        </div>
        <div className="flex-1 space-y-2 flex flex-col items-center">
          <div className="w-14 h-14 bg-surface rounded-xl animate-shimmer" />
          <div className="h-4 bg-surface rounded-lg w-20 animate-shimmer" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('bg-white border border-border rounded-2xl overflow-hidden', className)}>
      <div className="h-12 bg-surface animate-shimmer" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 border-b border-border/50 flex items-center px-4 gap-4">
          <div className="w-7 h-7 bg-surface rounded-lg animate-shimmer" />
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-surface rounded-lg animate-shimmer" />
            <div className="h-4 bg-surface rounded-lg w-24 animate-shimmer" />
          </div>
          <div className="h-4 bg-surface rounded-lg w-6 animate-shimmer" />
          <div className="h-4 bg-surface rounded-lg w-6 animate-shimmer" />
          <div className="h-4 bg-surface rounded-lg w-6 animate-shimmer" />
          <div className="h-5 bg-surface rounded-lg w-8 animate-shimmer" />
        </div>
      ))}
    </div>
  )
}
