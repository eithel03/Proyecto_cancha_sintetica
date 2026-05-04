import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BusinessActions } from './BusinessActions'

export default async function AdminBusinessesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/login')

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })

  let profiles: any[] = []
  if (businesses && businesses.length > 0) {
    const ownerIds = businesses.map(b => b.owner_id).filter(Boolean)
    if (ownerIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', ownerIds)
      if (data) profiles = data
    }
  }

  // Combinar
  const mergedBusinesses = businesses?.map(b => {
    const ownerProfile = profiles.find(p => p.id === b.owner_id)
    return { ...b, ownerProfile }
  }) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Negocios Registrados</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Administra las sintéticas que usan la plataforma.
          </p>
        </div>
        <Link href="/admin/businesses/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Crear Nuevo Negocio
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Admin / Dueño</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mergedBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No hay negocios registrados.
                    </td>
                  </tr>
                ) : (
                  mergedBusinesses.map((b: any) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{b.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">/{b.slug}</td>
                      <td className="px-4 py-3">{b.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.ownerProfile?.full_name || 'Desconocido'}</div>
                        {b.ownerProfile?.phone && (
                          <div className="text-xs text-muted-foreground">{b.ownerProfile.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={b.is_active ? "default" : "destructive"}>
                          {b.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/${b.slug}`} 
                            target="_blank" 
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2"
                          >
                            Ver Pág.
                          </Link>
                          <BusinessActions business={b} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
