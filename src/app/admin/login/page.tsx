'use client'

import { useState } from 'react'
import { adminLogin } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    const result = await adminLogin(formData)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950 text-slate-100">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Acceso Restringido</CardTitle>
          <CardDescription className="text-slate-400">
            Panel exclusivo para Super Administradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Correo Electrónico</Label>
              <Input id="email" name="email" type="email" required className="bg-slate-900 border-slate-800 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
              <Input id="password" name="password" type="password" required className="bg-slate-900 border-slate-800 text-white" />
            </div>
            
            {error && (
              <div className="text-sm text-red-500 bg-red-950/50 border border-red-900 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={pending}>
              {pending ? 'Verificando...' : 'Entrar al Panel'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
