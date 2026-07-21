'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateBusiness(id: string, data: any) {
  const supabase = await createClient()
  
  // Verificación de autenticación y rol
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') return { error: 'Acceso denegado' }

  const adminClient = createAdminClient()

  // Actualizar negocio
  const { error: bizError } = await adminClient
    .from('businesses')
    .update({
      name: data.name,
      slug: data.slug,
      location: data.location,
      phone: data.phone,
      whatsapp: data.whatsapp,
      description: data.description,
      is_active: data.is_active,
      max_courts: data.max_courts ? parseInt(data.max_courts.toString(), 10) : 1,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null
    })
    .eq('id', id)

  if (bizError) {
    if (bizError.code === '23505') return { error: 'El slug ya está en uso por otro negocio' }
    return { error: 'Error al actualizar el negocio: ' + bizError.message }
  }

  // Actualizar perfil del dueño si se proporcionan datos
  if (data.owner_id && (data.owner_name || data.owner_phone)) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name: data.owner_name,
        phone: data.owner_phone
      })
      .eq('id', data.owner_id)
    
    if (profileError) {
      console.error('Error updating owner profile:', profileError)
      // No retornamos error fatal aquí para que los cambios del negocio se mantengan
    }
  }

  revalidatePath('/admin/businesses')
  return { success: true }
}

export async function deleteBusiness(businessId: string, ownerId: string) {
  const supabase = await createClient()
  
  // Verificación de autenticación y rol
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') return { error: 'Acceso denegado' }

  const adminClient = createAdminClient()

  try {
    // 1. Eliminar primero el negocio (esto debería eliminar en cascada reservas y canchas si la BD está configurada así)
    const { error: businessError } = await adminClient
      .from('businesses')
      .delete()
      .eq('id', businessId)

    if (businessError) throw new Error('Error al eliminar negocio: ' + businessError.message)

    // 2. Eliminar el usuario dueño usando Admin API (eliminación en cascada total de perfil y accesos)
    if (ownerId) {
      const { error: authError } = await adminClient.auth.admin.deleteUser(ownerId)
      if (authError) throw new Error('El negocio se eliminó, pero hubo un error al eliminar al usuario: ' + authError.message)
    }

    revalidatePath('/admin/businesses')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
