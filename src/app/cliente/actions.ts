'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone: phone,
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
      phone: phone,
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
