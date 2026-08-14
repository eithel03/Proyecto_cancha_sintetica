'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, Users, UserPlus, Trash2, Shield, UserRound } from 'lucide-react'
import { addStaffMember, removeStaffMember } from './actions'
import { toast } from 'sonner'

type StaffMember = {
  id: string
  role: string | null
  created_at: string | null
  user_id: string | null
  profiles: {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    phone: string | null
  } | {
    id: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    phone: string | null
  }[] | null
}

export default function StaffClient({
  initialStaff,
  businessId,
  slug,
  ownerId,
}: {
  initialStaff: StaffMember[]
  businessId: string
  slug: string
  ownerId: string
}) {
  const [staff, setStaff] = useState(initialStaff)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await addStaffMember(businessId, email, role, slug)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Miembro agregado correctamente')
        setEmail('')
        setRole('staff')
        router.refresh()
      }
    })
  }

  function handleRemove(staffId: string) {
    startTransition(async () => {
      const result = await removeStaffMember(businessId, staffId, slug)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Miembro eliminado')
        setStaff(prev => prev.filter(s => s.id !== staffId))
      }
    })
  }

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
          <CardTitle className="flex items-center gap-3 text-lg font-black text-slate-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <UserPlus className="h-5 w-5" />
            </span>
            Agregar miembro
          </CardTitle>
          <CardDescription className="pl-[52px] text-sm font-medium text-slate-500">Invita por correo a una persona para que gestione este negocio.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleAdd} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-end">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-slate-700">Correo del usuario</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
                className="h-11 border-slate-300 pl-10 text-slate-950 placeholder:text-slate-400"
              />
              </div>
            </div>
            <div className="w-full space-y-2">
              <Label className="text-sm font-bold text-slate-700">Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v || 'staff')} items={[
                { value: 'staff', label: 'Staff' },
                { value: 'manager', label: 'Gerente' },
              ]}>
              <SelectTrigger className="h-11 border-slate-300 text-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isPending} className="h-11 bg-emerald-700 font-black text-white shadow-sm hover:bg-emerald-800">
              <UserPlus className="mr-2 h-4 w-4" />
              {isPending ? 'Agregando...' : 'Agregar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <CardTitle className="flex items-center gap-3 text-lg font-black text-slate-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Users className="h-5 w-5" />
            </span>
            Miembros actuales
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">{staff.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                <UserRound className="h-7 w-7" />
              </span>
              <p className="mt-4 text-base font-bold text-slate-700">Aún no hay miembros configurados</p>
              <p className="mt-1 max-w-md text-sm font-medium text-slate-500">Agrega usuarios para que puedan gestionar las reservas y canchas de este negocio.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      {getInitials(getProfileName(member.profiles))}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {getProfileName(member.profiles)}
                      </p>
                      <p className="truncate text-xs font-medium text-slate-500">{getProfilePhone(member.profiles) || 'Sin teléfono'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-amber-500" />
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">{member.role || 'staff'}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(member.id)}
                      disabled={isPending || member.user_id === ownerId}
                      className="h-9 w-9 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?'
}

function getProfileName(profiles: StaffMember['profiles']): string {
  if (!profiles) return 'Sin nombre'
  const p = Array.isArray(profiles) ? profiles[0] : profiles
  if (!p) return 'Sin nombre'
  return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Sin nombre'
}

function getProfilePhone(profiles: StaffMember['profiles']): string | null {
  if (!profiles) return null
  const p = Array.isArray(profiles) ? profiles[0] : profiles
  return p?.phone || null
}
