'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const themeOptions = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Automático', icon: Monitor },
] as const

type ThemeToggleProps = {
  className?: string
  align?: 'start' | 'center' | 'end'
}

const subscribeToMount = () => () => {}
const getMounted = () => true
const getServerMounted = () => false

export function ThemeToggle({ className, align = 'end' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribeToMount, getMounted, getServerMounted)

  const currentTheme = mounted ? theme ?? 'system' : 'system'
  const ResolvedIcon = !mounted ? Monitor : resolvedTheme === 'dark' ? Moon : Sun
  const currentLabel = themeOptions.find((option) => option.value === currentTheme)?.label ?? 'Automático'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={`Tema: ${currentLabel}. Cambiar tema`}
        title={`Tema: ${currentLabel}`}
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className
        )}
      >
        <ResolvedIcon className="size-[18px]" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tema de la aplicación</DropdownMenuLabel>
          {themeOptions.map((option) => {
            const Icon = option.icon
            const isActive = currentTheme === option.value

            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
                className="cursor-pointer gap-2 px-2 py-2"
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="flex-1">{option.label}</span>
                {isActive && <Check className="size-4 text-primary" aria-hidden="true" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
