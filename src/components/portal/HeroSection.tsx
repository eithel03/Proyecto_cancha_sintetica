import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export function HeroSection({
  icon: Icon,
  badge,
  title,
  subtitle,
  stats,
  actions,
  children,
  footer,
  className,
  variant = 'navy',
  containerClassName,
}: {
  icon?: LucideIcon
  badge?: string
  title: string
  subtitle?: string
  stats?: { value: number | string; label: string }[]
  actions?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  variant?: 'navy' | 'green'
  containerClassName?: string
}) {
  const constrained = containerClassName !== undefined

  return (
    <section className={cn(
      'relative overflow-hidden rounded-2xl',
      constrained ? '' : 'p-6 sm:p-8 lg:p-10',
      variant === 'navy' ? 'bg-navy' : 'bg-gradient-to-br from-[#035C45] via-[#047857] to-[#036B4E]',
      className
    )}>
      <div className="hero-pattern absolute inset-0 pointer-events-none" />
      <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-gold/8 blur-[80px] pointer-events-none" />
      <div className="absolute left-1/2 bottom-0 w-48 h-48 rounded-full bg-primary/15 blur-[60px] pointer-events-none" />

      <div className={cn('relative z-10 mx-auto w-full', constrained && 'py-6 sm:py-8 lg:py-10', containerClassName)}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4">
            {badge && (
              <span className="inline-flex items-center gap-2 rounded-full bg-gold/12 border border-gold/25 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {badge}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-white/50 max-w-md">{subtitle}</p>
            )}
            {stats && (
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3 pt-1">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2 sm:gap-2.5 bg-white/10 border border-white/20 rounded-xl px-2 sm:px-3.5 py-2 justify-center sm:justify-start">
                    <span className="text-lg sm:text-2xl font-bold text-white leading-none">{stat.value}</span>
                    <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-white/60">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {(actions || children) && (
            <div className="self-start lg:self-end">
              {actions || children}
            </div>
          )}
        </div>
      </div>

      {footer && (
        <div className={cn('relative z-10 mt-6 sm:mt-7', containerClassName && cn('mx-auto w-full', containerClassName))}>
          {footer}
        </div>
      )}
    </section>
  )
}