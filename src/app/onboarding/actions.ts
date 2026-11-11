'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validatePhone } from '@/lib/phone'

export async function createBusiness(formData: FormData) {
  const supabase = await createClient()

  // Verify the user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // SECURITY: verify the profile role is allowed to onboard a new business.
  // NOTE: the profile role in this codebase is 'customer' (not 'client').
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const allowedRoles: readonly string[] = ['customer', 'owner']
  if (!profile || !allowedRoles.includes(profile.role)) {
    // SECURITY: generic message — do not reveal which roles exist in the system
    throw new Error('No autorizado')
  }

  // SECURITY: one business per user — profiles has no business_id column, so the
  // ownership relation is checked through businesses.owner_id (mirrors the login flow).
  const { data: existingBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existingBusiness) {
    throw new Error('Ya tienes un negocio registrado')
  }

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const phone = formData.get('phone') as string
  const location = formData.get('location') as string
  const businessPhone = validatePhone(phone)
  if (!businessPhone.ok) return { error: businessPhone.error }

  // Insert the business
  const { data: business, error } = await supabase
    .from('businesses')
    .insert({
      name,
      slug,
      phone: businessPhone.value,
      location,
      owner_id: user.id
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation for slug
      return { error: 'Ese enlace personalizado (slug) ya está en uso. Por favor elige otro.' }
    }
    return { error: 'Error al crear negocio' }
  }

  // After creating the business, redirect to the dashboard
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
