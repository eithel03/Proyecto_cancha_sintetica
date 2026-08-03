'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validatePhone } from '@/lib/phone'

export async function createBusinessWithUser(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') return { error: 'Acceso denegado' }

  const adminClient = createAdminClient()

  // Business Data
  const bName = formData.get('b_name') as string
  const bSlug = formData.get('b_slug') as string
  const bLocation = formData.get('b_location') as string
  const bPhone = formData.get('b_phone') as string
  const bWhatsapp = formData.get('b_whatsapp') as string
  const bDescription = formData.get('b_description') as string
  const bLatitude = formData.get('b_latitude') as string
  const bLongitude = formData.get('b_longitude') as string

  // User Data
  const uName = formData.get('u_name') as string
  const uEmail = formData.get('u_email') as string
  const uPhone = formData.get('u_phone') as string
  const uPassword = formData.get('u_password') as string

  if (!bName || !bSlug || !uName || !uEmail || !uPassword) {
    return { error: 'Faltan campos obligatorios' }
  }

  const businessPhone = validatePhone(bPhone)
  if (!businessPhone.ok) return { error: businessPhone.error }

  const whatsapp = validatePhone(bWhatsapp)
  if (!whatsapp.ok) return { error: whatsapp.error }

  const userPhone = validatePhone(uPhone)
  if (!userPhone.ok) return { error: userPhone.error }

  try {
    // 1. Create the user using Admin API (bypasses Auth policies and doesn't sign us out)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: uEmail,
      password: uPassword,
      email_confirm: true, // Auto confirm
      user_metadata: {
        full_name: uName,
        role: 'owner'
      }
    })

    if (authError) throw new Error('Error al crear usuario: ' + authError.message)
    
    const newUserId = authData.user.id

    // 2. The trigger `on_auth_user_created` will automatically create the profile.
    // Wait briefly to ensure trigger finishes or we could manually update if needed.
    // We update the profile to set the phone number if needed.
    await adminClient.from('profiles').update({ phone: userPhone.value, role: 'owner' }).eq('id', newUserId)

    // 3. Create the business
    const { error: businessError } = await adminClient.from('businesses').insert({
      name: bName,
      slug: bSlug,
      location: bLocation,
      phone: businessPhone.value,
      whatsapp: whatsapp.value,
      description: bDescription,
      latitude: bLatitude ? parseFloat(bLatitude) : null,
      longitude: bLongitude ? parseFloat(bLongitude) : null,
      owner_id: newUserId,
      is_active: true
    })

    if (businessError) {
      // Rollback user if business creation fails
      await adminClient.auth.admin.deleteUser(newUserId)
      if (businessError.code === '23505') throw new Error('El slug ya está en uso')
      throw new Error('Error al crear negocio: ' + businessError.message)
    }

    revalidatePath('/admin/businesses')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
