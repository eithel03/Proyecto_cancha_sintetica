'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginCustomer } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { AlertCircle, Lock, LogIn, Mail, ShieldCheck, UserRound } from 'lucide-react'

export default function LoginClient() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'
  
  // Si el destino original era el perfil (donde no se puede ser invitado),
  // el botón de invitado debe redirigir a la vista de reservas del local
  const guestRedirectTo = redirectTo.endsWith('/perfil') 
    ? redirectTo.replace('/perfil', '') 
    : redirectTo

  async function onSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    formData.append('redirectTo', redirectTo)
    const result = await loginCustomer(formData)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  return (
    <Card className="max-w-md w-full bg-white border-border rounded-3xl shadow-[0_20px_60px_rgba(8,38,45,0.12)] overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-500">
      {/* Banda superior decorativa */}
      <div className="h-2.5 bg-gradient-to-r from-[#035C45] via-[#047857] to-[#036B4E]" />

      <CardContent className="p-7 sm:p-9">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-primary-green-light flex items-center justify-center mb-4 shadow-sm">
            <ShieldCheck className="w-7 h-7 text-primary-green" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Bienvenido de vuelta</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Ingresa tus credenciales para reservar tu cancha
          </p>
        </div>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">Correo Electrónico</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <Input id="email" name="email" type="email" placeholder="tu@correo.com" required className="h-12 rounded-xl bg-white border-border pl-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary-green/25" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">Contraseña</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <Input id="password" name="password" type="password" placeholder="••••••••" required className="h-12 rounded-xl bg-white border-border pl-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary-green/25" />
            </div>
          </div>
          
          {error && (
            <div className="flex items-start gap-2.5 text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl animate-in fade-in duration-200">
              <AlertCircle className="w-4.5 h-4.5 mt-0.5 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <Button type="submit" disabled={pending} className="w-full h-12 rounded-xl bg-primary-green text-white hover:bg-primary-green-hover shadow-sm font-bold text-sm transition-all disabled:opacity-60 disabled:pointer-events-none">
            {pending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Iniciando sesión...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <LogIn className="w-4.5 h-4.5" /> Entrar
              </span>
            )}
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-muted-foreground font-medium tracking-wide">O también</span>
            </div>
          </div>

          <Link href={guestRedirectTo} className="w-full block">
            <Button type="button" variant="outline" className="w-full h-12 rounded-xl border-border bg-white text-slate-600 hover:bg-primary-green-subtle hover:text-primary-green hover:border-primary-green/40 font-semibold text-sm transition-all">
              <UserRound className="w-4.5 h-4.5" /> Continuar como invitado
            </Button>
          </Link>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col text-sm text-center text-muted-foreground gap-2 pb-7 border-t border-border/70 pt-6 bg-[#FBF9F3]">
        <p>
          ¿No tienes una cuenta?{' '}
          <Link href={`/cliente/registro?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-primary-green font-bold hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
