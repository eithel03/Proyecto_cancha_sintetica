'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeRedirect } from '@/lib/auth/redirect'

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

  // SECURITY: removed temporary console.log statements that leaked user IDs and profile data
  // Verificar el rol del usuario consultando public.profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

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
      .select('slug')
      .eq('owner_id', user.id)
      .single()

    if (!business) {
      await supabase.auth.signOut()
      return { error: 'Tu cuenta aún no tiene un negocio asignado. Contacta al administrador.' }
    }

    revalidatePath(`/${business.slug}/admin`, 'layout')
    // SECURITY: validate the slug-built target is an internal path before redirecting
    redirect(safeRedirect(`/${business.slug}/admin`))
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

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: 'Correo o contraseña incorrectos' }
  }

  const user = authData.user
  if (!user) {
    return { error: 'No autorizado' }
  }

  // SECURITY: only accounts with the 'customer' role may use the customer login flow
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'customer') {
    return { error: 'No autorizado' }
  }

  const businessSlug = formData.get('businessSlug') as string
  if (businessSlug) {
    revalidatePath(`/${businessSlug}`, 'layout')
    // SECURITY: businessSlug is user-controlled input — validate the redirect target
    redirect(safeRedirect(`/${businessSlug}`))
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
    return { error: 'Error al registrar cliente' }
  }

  const businessSlug = formData.get('businessSlug') as string
  if (businessSlug) {
    revalidatePath(`/${businessSlug}`, 'layout')
    // SECURITY: businessSlug is user-controlled input — validate the redirect target
    redirect(safeRedirect(`/${businessSlug}`))
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
