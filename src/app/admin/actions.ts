'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function adminLogin(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: 'Credenciales inválidas.' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Ocurrió un error inesperado al verificar la cuenta.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    await supabase.auth.signOut()
    return { error: 'No se encontró el perfil del usuario' }
  }

  if (!profile || profile.role !== 'super_admin') {
    await supabase.auth.signOut()
    return { error: 'No tienes permisos de administrador' }
  }

  redirect('/admin/dashboard')
}
