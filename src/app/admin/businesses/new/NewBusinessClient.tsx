'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createBusinessWithUser } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewBusinessClient() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [slugPreview, setSlugPreview] = useState('')

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setSlugPreview(value)
  }

  async function onSubmit(formData: FormData) {
    setPending(true)
    const result = await createBusinessWithUser(formData)
    setPending(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Negocio y Usuario creados correctamente.')
      router.push('/admin/businesses')
    }
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Alta de Nuevo Negocio</CardTitle>
        <CardDescription>
          Completa los datos de la sintética y genera la cuenta de acceso para su administrador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-8">
          
          {/* Datos del Negocio */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">1. Datos del Negocio</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="b_name">Nombre de la Sintética</Label>
                <Input id="b_name" name="b_name" required placeholder="Sintética Pital" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b_slug">Slug (Enlace Público)</Label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 px-3 text-gray-500 sm:text-sm bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700">
                    /
                  </span>
                  <Input 
                    id="b_slug" 
                    name="b_slug" 
                    value={slugPreview}
                    onChange={handleSlugChange}
                    className="rounded-l-none" 
                    placeholder="sintetica-pital" 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="b_phone">Teléfono Fijo</Label>
                <Input id="b_phone" name="b_phone" placeholder="2460-0000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b_whatsapp">WhatsApp Público</Label>
                <Input id="b_whatsapp" name="b_whatsapp" placeholder="8888-8888" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="b_location">Ubicación</Label>
                <Input id="b_location" name="b_location" placeholder="Frente al parque..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="b_description">Descripción</Label>
                <Textarea id="b_description" name="b_description" />
              </div>
            </div>
          </div>

          {/* Datos del Usuario Owner */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">2. Credenciales del Administrador (Dueño)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u_name">Nombre Completo</Label>
                <Input id="u_name" name="u_name" required placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_phone">Teléfono Personal</Label>
                <Input id="u_phone" name="u_phone" placeholder="8888-8888" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_email">Correo Electrónico (Login)</Label>
                <Input id="u_email" name="u_email" type="email" required placeholder="juan@ejemplo.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u_password">Contraseña Temporal</Label>
                <Input id="u_password" name="u_password" required placeholder="Min 6 caracteres" minLength={6} />
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => router.push('/admin/businesses')} type="button">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creando sistema...' : 'Crear Negocio y Cuenta'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
