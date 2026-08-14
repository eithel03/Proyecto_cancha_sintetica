'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validatePhone } from '@/lib/phone'

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
  const businessPhone = data._skipPhoneValidation ? { value: data.phone } : validatePhone(data.phone)
  if ('ok' in businessPhone && !businessPhone.ok) return { error: businessPhone.error }

  const whatsapp = data._skipPhoneValidation ? { value: data.whatsapp } : validatePhone(data.whatsapp)
  if ('ok' in whatsapp && !whatsapp.ok) return { error: whatsapp.error }

  const ownerPhone = data._skipPhoneValidation ? { value: data.owner_phone } : validatePhone(data.owner_phone)
  if ('ok' in ownerPhone && !ownerPhone.ok) return { error: ownerPhone.error }

  // Actualizar negocio
  const { error: bizError } = await adminClient
    .from('businesses')
    .update({
      name: data.name,
      slug: data.slug,
      location: data.location,
      phone: businessPhone.value,
      whatsapp: whatsapp.value,
      description: data.description,
      is_active: data.is_active,
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
        phone: ownerPhone.value
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
    // 1. Eliminar primero el usuario dueño (si falla, el negocio queda intacto)
    if (ownerId) {
      const { error: authError } = await adminClient.auth.admin.deleteUser(ownerId)
      if (authError) {
        console.error('Failed to delete owner user:', authError.message)
        return { error: 'Error al eliminar el usuario del dueño: ' + authError.message }
      }
    }

    // 2. Eliminar el negocio (cascada a reservas, canchas, etc.)
    const { error: businessError } = await adminClient
      .from('businesses')
      .delete()
      .eq('id', businessId)

    if (businessError) {
      console.error('Business deleted owner user but failed to delete business:', businessError.message)
      return { error: 'El usuario del dueño se eliminó, pero el negocio no pudo eliminarse: ' + businessError.message + '. Contacta soporte para limpiar manualmente.' }
    }

    revalidatePath('/admin/businesses')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
