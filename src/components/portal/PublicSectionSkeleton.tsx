import { cn } from '@/lib/utils'

type PublicSectionSkeletonProps = {
  variant?: 'home' | 'booking' | 'challenges' | 'tournament' | 'profile'
}

function SkeletonBar({ className }: { className: string }) {
  return <div className={cn('animate-shimmer rounded-lg bg-surface', className)} />
}

function PublicNavSkeleton() {
  return (
    <>
      <div className="hidden h-16 w-full border-b border-white/5 bg-navy md:block">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <SkeletonBar className="h-9 w-9 rounded-xl bg-white/10" />
            <div className="space-y-1.5">
              <SkeletonBar className="h-4 w-32 bg-white/10" />
              <SkeletonBar className="h-2 w-24 bg-white/10" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBar key={index} className="h-9 w-20 rounded-xl bg-white/10" />
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 h-16 border-t border-border bg-card md:hidden">
        <div className="flex h-full items-center justify-around px-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-1">
              <SkeletonBar className="h-6 w-9 rounded-full" />
              <SkeletonBar className="h-2 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function ContentSkeleton({ variant }: { variant: PublicSectionSkeletonProps['variant'] }) {
  if (variant === 'home') {
    return (
      <>
        <div className="bg-navy px-4 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-5xl space-y-5">
            <SkeletonBar className="h-7 w-40 bg-white/10" />
            <SkeletonBar className="h-12 w-3/4 bg-white/10" />
            <SkeletonBar className="h-4 w-full max-w-lg bg-white/10" />
            <SkeletonBar className="h-12 w-40 rounded-xl bg-white/10" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
          <SkeletonBar className="h-8 w-32" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBar key={index} className="h-72 rounded-2xl" />
            ))}
          </div>
        </div>
      </>
    )
  }

  if (variant === 'tournament') {
    return (
      <div className="mx-auto w-full max-w-[1360px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <SkeletonBar className="h-48 rounded-2xl bg-navy" />
        <SkeletonBar className="h-12 rounded-xl" />
        <SkeletonBar className="h-[28rem] rounded-2xl" />
      </div>
    )
  }

  if (variant === 'challenges') {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-8">
        <SkeletonBar className="h-48 rounded-2xl bg-navy" />
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBar key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'profile') {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <SkeletonBar className="h-9 w-48" />
            <SkeletonBar className="h-4 w-64" />
          </div>
          <SkeletonBar className="h-11 w-36 rounded-xl" />
        </div>
        <SkeletonBar className="h-14 rounded-xl" />
        <SkeletonBar className="h-[30rem] rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-8">
      <SkeletonBar className="h-14 rounded-2xl" />
      <SkeletonBar className="h-[34rem] rounded-2xl" />
    </div>
  )
}

export function PublicSectionSkeleton({ variant = 'home' }: PublicSectionSkeletonProps) {
  return (
    <div className="min-h-screen bg-background" role="status" aria-live="polite" aria-label="Cargando sección">
      <PublicNavSkeleton />
      <ContentSkeleton variant={variant} />
      <span className="sr-only">Cargando contenido</span>
    </div>
  )
}
