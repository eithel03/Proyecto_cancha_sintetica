'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Building2, Mail, Pencil, Phone, Save, Shield, User } from 'lucide-react'
import { updateOwnerProfile } from './actions'
import { toast } from 'sonner'

type Profile = {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: string | null
}

export default function AdminProfileClient({
  profile,
  email,
  businessName,
}: {
  profile: Profile | null
  email: string
  businessName: string
}) {
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [pending, setPending] = useState(false)
  const [editing, setEditing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)

    const formData = new FormData()
    formData.set('full_name', fullName)
    formData.set('phone', phone)

    const result = await updateOwnerProfile(formData)
    setPending(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Perfil actualizado correctamente')
      setEditing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700" />
        <CardContent className="relative px-6 pb-6 pt-0 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <span className="-mt-12 flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-3xl font-black text-white shadow-lg shadow-black/10 ring-4 ring-white">
                {getInitials(fullName)}
              </span>
              <div className="min-w-0 pb-1">
                <h2 className="truncate text-2xl font-black tracking-tight text-slate-900">{fullName || 'Administrador'}</h2>
                <p className="mt-0.5 truncate text-sm font-medium text-slate-500">{email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Badge className="gap-1 bg-emerald-600/10 px-3 py-1 text-emerald-700 hover:bg-emerald-600/15">
                <Shield className="h-3.5 w-3.5" />
                Administrador
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing((value) => !value)}
                className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                {editing ? 'Cancelar' : 'Editar perfil'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <User className="h-5 w-5 text-emerald-600" />
              Información personal
            </CardTitle>
            <CardDescription className="text-slate-500">Tu nombre completo y teléfono de contacto.</CardDescription>
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-semibold text-slate-900">Nombre completo</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-slate-900">Teléfono</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="8888-8888"
                    inputMode="tel"
                    className="border-slate-300"
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={pending} className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
                    <Save className="h-4 w-4" />
                    {pending ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <User className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nombre completo</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-800">{fullName || 'Sin registrar'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Teléfono</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-800">{phone || 'Sin registrar'}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Editar información
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <Mail className="h-5 w-5 text-slate-400" />
              Cuenta
            </CardTitle>
            <CardDescription className="text-slate-500">Información de tu cuenta de acceso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Correo electrónico</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">{email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Empresa</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">{businessName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Rol</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">Administrador</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  return initials || 'AD'
}
