'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createBusiness(formData: FormData) {
  const supabase = await createClient()

  // Verify the user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const phone = formData.get('phone') as string
  const location = formData.get('location') as string

  // Insert the business
  const { data: business, error } = await supabase
    .from('businesses')
    .insert({
      name,
      slug,
      phone,
      location,
      owner_id: user.id
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation for slug
      return { error: 'Ese enlace personalizado (slug) ya está en uso. Por favor elige otro.' }
    }
    return { error: 'Error al crear el negocio: ' + error.message }
  }

  // After creating the business, redirect to the dashboard
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
