'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateBusiness } from './actions'
import { toast } from 'sonner'

export default function SettingsClient({ business }: { business: any }) {
  const [pending, setPending] = useState(false)

  async function onSubmit(formData: FormData) {
    setPending(true)
    formData.append('id', business.id)
    const result = await updateBusiness(formData)
    setPending(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Configuración actualizada correctamente')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información General</CardTitle>
        <CardDescription>Actualiza los datos públicos de tu sintética.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" defaultValue={business.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Enlace Personalizado</Label>
              <Input id="slug" defaultValue={business.slug} disabled />
              <p className="text-xs text-muted-foreground">El enlace no se puede cambiar fácilmente.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (WhatsApp)</Label>
              <Input id="phone" name="phone" defaultValue={business.phone || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input id="location" name="location" defaultValue={business.location || ''} />
            </div>
          </div>
          <Button type="submit" className="mt-4" disabled={pending}>
            {pending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
