import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export function StepIndicator({
  steps,
  currentStep,
}: {
  steps: { step: number; label: string; done: boolean }[]
  currentStep: number
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s.step} className="flex items-center gap-2">
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-200',
            s.done
              ? 'bg-primary text-white'
              : s.step === currentStep
                ? 'bg-gold text-navy shadow-sm shadow-gold/25'
                : 'bg-surface text-muted-foreground border border-border'
          )}>
            {s.done ? <Check className="w-4 h-4" /> : s.step}
          </div>
          <span className={cn(
            'text-xs font-medium hidden sm:block',
            s.done ? 'text-foreground' : s.step === currentStep ? 'text-foreground font-semibold' : 'text-muted-foreground'
          )}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={cn('w-8 h-px', s.done ? 'bg-primary' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  )
}
