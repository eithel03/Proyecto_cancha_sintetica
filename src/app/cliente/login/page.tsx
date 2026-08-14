import { Suspense } from 'react'
import LoginClient from './LoginClient'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8F5EE] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-28 -right-28 w-96 h-96 rounded-full bg-primary-green/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-gold/20 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/3 -left-16 w-64 h-64 rounded-full bg-primary-green-light blur-[90px]" />

      <Suspense fallback={
        <div className="w-full max-w-md bg-white rounded-3xl border border-border shadow-soft p-10 flex flex-col items-center gap-4 animate-pulse">
          <div className="w-14 h-14 rounded-2xl bg-surface" />
          <div className="h-6 w-48 rounded-full bg-surface" />
          <div className="h-4 w-64 rounded-full bg-surface" />
          <div className="h-12 w-full rounded-xl bg-surface" />
          <div className="h-12 w-full rounded-xl bg-surface" />
        </div>
      }>
        <LoginClient />
      </Suspense>
    </div>
  )
}
