'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validatePhone } from '@/lib/phone'

export async function loginCustomer(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message }
  }

  if (!data.user) {
    return { error: 'Ocurrió un error inesperado al verificar la cuenta.' }
  }

  // Verificar el rol del usuario consultando public.profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    await supabase.auth.signOut()
    return { error: 'No se encontró el perfil del usuario. Contacta a soporte.' }
  }

  if (profile.role !== 'customer') {
    await supabase.auth.signOut()
    return { error: 'Esta cuenta no es de cliente. Por favor, usa la interfaz de administración.' }
  }

  if (redirectTo) {
    revalidatePath('/', 'layout')
    redirect(redirectTo)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function registerCustomer(formData: FormData) {
  const supabase = await createClient()

  const firstName = formData.get('first_name') as string
  const lastName = formData.get('last_name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string
  
  const fullName = `${firstName} ${lastName}`.trim()
  const customerPhone = validatePhone(phone, { required: true })
  if (!customerPhone.ok) return { error: customerPhone.error }

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone: customerPhone.value,
        role: 'customer',
      },
      // Important: don't let supabase redirect to its default site
      emailRedirectTo: undefined 
    }
  })

  if (error) {
    return { error: 'Error al crear la cuenta: ' + error.message }
  }

  if (authData.user) {
    // Explicitly update profile to ensure phone and role are correct
    // (The trigger handles creation, but we want to be 100% sure about the phone)
    await supabase.from('profiles').update({
      phone: customerPhone.value,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      role: 'customer'
    }).eq('id', authData.user.id)
  }

  // If Supabase is configured to NOT require email confirmation, it returns a session
  if (authData.session) {
    if (redirectTo) {
      revalidatePath('/', 'layout')
      redirect(redirectTo)
    }
    revalidatePath('/', 'layout')
    redirect('/')
  }

  // If email confirmation is required, there is no session
  return { 
    success: true, 
    message: 'Cuenta creada con éxito. Por favor, revisa tu correo para confirmar tu cuenta antes de iniciar sesión.' 
  }
}

export async function getBusinesses() {
  const supabase = await createClient()
  const { data, error, count } = await supabase
    .from('businesses')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching businesses:', error)
    return { businesses: [], count: 0 }
  }

  return { businesses: data || [], count: count || 0 }
}

export async function getUserFavorites() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('user_favorites')
    .select('business_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching favorites:', error)
    return []
  }

  return data.map(f => f.business_id)
}

export async function toggleFavorite(businessId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'authentication_required' }
  }

  // Verificar si ya es favorito
  const { data: existing } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .maybeSingle()

  if (existing) {
    // Eliminar
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('id', existing.id)
    
    if (error) return { error: error.message }
    revalidatePath('/')
    return { success: true, action: 'removed' }
  } else {
    // Agregar
    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: user.id, business_id: businessId })

    if (error) return { error: error.message }
    revalidatePath('/')
    return { success: true, action: 'added' }
  }
}
