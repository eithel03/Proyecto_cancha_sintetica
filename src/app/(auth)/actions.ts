'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: 'Correo o contraseña incorrectos' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Ocurrió un error inesperado al verificar la cuenta.' }
  }

  // Agregar logs temporales en servidor
  console.log('USER ID:', user.id)

  // Verificar el rol del usuario consultando public.profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log('PROFILE:', profile)
  console.log('PROFILE ERROR:', profileError)

  if (profileError) {
    await supabase.auth.signOut()
    return { error: 'No se encontró el perfil del usuario' }
  }

  if (!profile || !profile.role) {
    await supabase.auth.signOut()
    return { error: 'Tu cuenta no tiene permisos asignados' }
  }

  if (profile.role === 'super_admin') {
    revalidatePath('/', 'layout')
    redirect('/admin/dashboard')
  }

  // Si es owner, verificar que tenga un negocio asignado
  if (profile.role === 'owner') {
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!business) {
      await supabase.auth.signOut()
      return { error: 'Tu cuenta aún no tiene un negocio asignado. Contacta al administrador.' }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  // Si es algún otro rol no contemplado
  await supabase.auth.signOut()
  return { error: 'Tu cuenta no tiene permisos asignados' }
}

export async function signup(formData: FormData) {
  // El registro público de dueños está deshabilitado en este modelo SaaS cerrado.
  return { error: 'El registro de nuevos locales está restringido. Por favor, contacta a la administración.' }
}

export async function customerLogin(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: 'Correo o contraseña incorrectos' }
  }

  const businessSlug = formData.get('businessSlug') as string
  if (businessSlug) {
    revalidatePath(`/${businessSlug}`, 'layout')
    redirect(`/${businessSlug}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function customerSignup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('full_name') as string,
        role: 'customer', // Específicamente asignado como cliente
      }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: 'Error al crear la cuenta: ' + error.message }
  }

  const businessSlug = formData.get('businessSlug') as string
  if (businessSlug) {
    revalidatePath(`/${businessSlug}`, 'layout')
    redirect(`/${businessSlug}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
