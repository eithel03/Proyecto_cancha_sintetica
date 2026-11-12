'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'

const PWAInstallPrompt = dynamic(
  () => import('./PWAInstallPrompt').then((module) => module.PWAInstallPrompt),
  { ssr: false },
)

export function DeferredPWAInstallPrompt(props: ComponentProps<typeof PWAInstallPrompt>) {
  return <PWAInstallPrompt {...props} />
}
