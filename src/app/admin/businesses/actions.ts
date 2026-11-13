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
    // Resolver el dueño desde la base y no confiar en un ownerId enviado por el cliente.
    const { data: business, error: lookupError } = await adminClient
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .maybeSingle()

    if (lookupError) return { error: 'No se pudo consultar el negocio: ' + lookupError.message }
    if (!business) return { error: 'El negocio ya no existe' }

    const resolvedOwnerId = business.owner_id || ownerId

    // 1. Eliminar únicamente el negocio seleccionado y sus datos en cascada.
    const { error: businessError } = await adminClient
      .from('businesses')
      .delete()
      .eq('id', businessId)

    if (businessError) {
      console.error('Business deletion failed:', businessError.message)
      return { error: 'El negocio no pudo eliminarse: ' + businessError.message }
    }

    // 2. Nunca eliminar un dueño compartido con otros negocios.
    if (resolvedOwnerId) {
      const { count: remainingBusinesses, error: remainingError } = await adminClient
      .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', resolvedOwnerId)

      if (remainingError) {
        console.warn('No se pudo comprobar si el dueño tiene otros negocios:', remainingError.message)
      } else if ((remainingBusinesses ?? 0) === 0) {
        const { error: authError } = await adminClient.auth.admin.deleteUser(resolvedOwnerId)
        const authNotFound = authError?.message.toLowerCase().includes('not found')

        // El negocio ya fue eliminado; una cuenta Auth ausente no debe revertirlo.
        if (authError && !authNotFound) {
          console.warn('El negocio se eliminó, pero no se pudo eliminar la cuenta del dueño:', authError.message)
        }
      }
    }

    revalidatePath('/admin/businesses')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
