'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginCustomer } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

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
    <Card className="max-w-md w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Iniciar Sesión (Cliente)</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para reservar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" name="email" type="email" placeholder="tu@correo.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Iniciando sesión...' : 'Entrar'}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">O también</span>
            </div>
          </div>

          <Link href={guestRedirectTo} className="w-full block">
            <Button type="button" variant="outline" className="w-full border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-all">
              Continuar como invitado
            </Button>
          </Link>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col text-sm text-center text-muted-foreground gap-2">
        <p>
          ¿No tienes una cuenta?{' '}
          <Link href={`/cliente/registro?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-primary font-medium hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
