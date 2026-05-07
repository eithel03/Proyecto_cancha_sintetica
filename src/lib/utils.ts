import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime12h(time: string | number) {
  if (!time && time !== 0) return ''
  
  let hours: number
  let minutes: number

  if (typeof time === 'number') {
    hours = Math.floor(time)
    minutes = Math.round((time % 1) * 60)
  } else {
    const [h, m] = time.split(':').map(Number)
    hours = h
    minutes = m || 0
  }

  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')

  return `${displayHours}:${displayMinutes} ${ampm}`
}

