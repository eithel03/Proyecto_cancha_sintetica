'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { registerCustomer } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterClient() {
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
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
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-600">¡Registro Exitoso!</CardTitle>
          <CardDescription className="text-base text-zinc-700 mt-2">
            {successMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Link href={`/cliente/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="w-full">
            <Button className="w-full h-12 text-lg">Ir a Iniciar Sesión</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Crear Cuenta de Cliente</CardTitle>
        <CardDescription>
          Regístrate para poder realizar reservas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input id="first_name" name="first_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellidos</Label>
              <Input id="last_name" name="last_name" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Número de teléfono</Label>
            <div className="flex gap-2">
              <div className="flex items-center justify-center px-3 rounded-md bg-gray-100 border border-gray-200 text-gray-500 text-sm font-bold">
                +506
              </div>
              <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="88888888 o 8888-8888" required className="flex-1" />
            </div>
          </div>
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
            {pending ? 'Creando cuenta...' : 'Registrarse'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col text-sm text-center text-muted-foreground gap-2">
        <p>
          ¿Ya tienes una cuenta?{' '}
          <Link href={`/cliente/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-primary font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
