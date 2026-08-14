'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { registerCustomer } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail, Phone, UserPlus, UserRound } from 'lucide-react'

export default function RegisterClient() {
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'

  async function onSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    setSuccessMessage(null)
    formData.append('redirectTo', redirectTo)
    const result = await registerCustomer(formData)
    
    if (result?.error) {
      setError(result.error)
      setPending(false)
    } else if (result?.success) {
      setSuccessMessage(result.message || 'Cuenta creada correctamente.')
      setPending(false)
    }
  }

  if (successMessage) {
    return (
      <Card className="max-w-md w-full bg-white border-border rounded-3xl shadow-[0_20px_60px_rgba(8,38,45,0.12)] overflow-hidden animate-in fade-in duration-300">
        <div className="h-2.5 bg-gradient-to-r from-[#035C45] via-[#047857] to-[#036B4E]" />
        <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-green-light flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary-green" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">¡Registro Exitoso!</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            {successMessage}
          </p>
          <Link href={`/cliente/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="w-full mt-6">
            <Button className="w-full h-12 rounded-xl bg-primary-green text-white hover:bg-primary-green-hover font-bold text-sm transition-all">
              Ir a Iniciar Sesión
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md w-full bg-white border-border rounded-3xl shadow-[0_20px_60px_rgba(8,38,45,0.12)] overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-500">
      {/* Banda superior decorativa */}
      <div className="h-2.5 bg-gradient-to-r from-[#035C45] via-[#047857] to-[#036B4E]" />

      <CardContent className="p-7 sm:p-9">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-primary-green-light flex items-center justify-center mb-4 shadow-sm">
            <UserPlus className="w-7 h-7 text-primary-green" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Crear cuenta de cliente</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
            Regístrate para poder realizar reservas y disfrutar del torneo y los retos.
          </p>
        </div>

        <form action={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-semibold text-foreground">Nombre</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                <Input id="first_name" name="first_name" placeholder="Tu nombre" required className="h-12 rounded-xl bg-white border-border pl-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary-green/25 transition-all duration-150" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm font-semibold text-foreground">Apellidos</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                <Input id="last_name" name="last_name" placeholder="Tus apellidos" required className="h-12 rounded-xl bg-white border-border pl-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary-green/25 transition-all duration-150" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-semibold text-foreground">Número de teléfono</Label>
            <div className="flex">
              <div className="flex items-center justify-center px-4 rounded-l-xl border border-r-0 border-border bg-[#F4F0E6] text-slate-600 text-sm font-bold">
                +506
              </div>
              <div className="relative flex-1">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="8888-8888" required className="h-12 w-full rounded-l-none rounded-r-xl bg-white border-border pl-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary-green/25 transition-all duration-150" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">Correo Electrónico</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="tu@correo.com" required className="h-12 rounded-xl bg-white border-border pl-11 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary-green/25 transition-all duration-150" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">Contraseña</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" required className="h-12 rounded-xl bg-white border-border pl-11 pr-12 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary-green/25 transition-all duration-150" />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary-green hover:bg-primary-green-subtle transition-colors"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
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
                Creando cuenta...
              </span>
            ) : (
              'Registrarse'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col text-sm text-center text-muted-foreground gap-2 pb-7 border-t border-border/70 pt-6 bg-[#FBF9F3]">
        <p>
          ¿Ya tienes una cuenta?{' '}
          <Link href={`/cliente/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-primary-green font-bold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
