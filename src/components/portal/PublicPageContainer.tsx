import { cn } from '@/lib/utils'

export function PublicPageContainer({
  children,
  className,
  noPadding = false,
}: {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1280px]',
        !noPadding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  )
}
