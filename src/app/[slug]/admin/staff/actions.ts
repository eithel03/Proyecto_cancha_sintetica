'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function addStaffMember(businessId: string, email: string, role: string, slug?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single()

  if (!business || business.owner_id !== user.id) {
    return { error: 'Solo el propietario puede agregar miembros' }
  }

  // Use admin client to find user by email (regular client cannot query auth.users)
  const adminClient = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()

  // listUsers devuelve páginas de 1000; recorremos hasta encontrar el correo o agotar las páginas
  let targetUser: { id: string } | undefined
  for (let page = 1; page <= 5 && !targetUser; page++) {
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    })

    if (listError) {
      return { error: 'Error al buscar usuarios: ' + listError.message }
    }

    targetUser = usersData?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail)
    if (!usersData?.users?.length || usersData.users.length < 1000) break
  }

  if (!targetUser) {
    return { error: 'No se encontró un usuario con ese correo. El usuario debe tener una cuenta activa.' }
  }

  const targetUserId = targetUser.id

  // Verify the target user has a profile
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', targetUserId)
    .maybeSingle()

  if (!targetProfile) {
    return { error: 'El usuario encontrado no tiene un perfil creado. Debe completar su registro primero.' }
  }

  const { error } = await supabase
    .from('business_users')
    .insert({
      business_id: businessId,
      user_id: targetUserId,
      role,
    })

  if (error) {
    if (error.code === '23505') return { error: 'Este usuario ya es miembro del staff' }
    return { error: 'Error al agregar miembro: ' + error.message }
  }

  if (slug) revalidatePath(`/${slug}/admin/staff`)
  return { success: true }
}

export async function removeStaffMember(businessId: string, staffId: string, slug?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single()

  if (!business || business.owner_id !== user.id) {
    return { error: 'Solo el propietario puede eliminar miembros' }
  }

  // Prevenir que el propietario se elimine a sí mismo como miembro
  const { data: staffRow } = await supabase
    .from('business_users')
    .select('user_id')
    .eq('id', staffId)
    .eq('business_id', businessId)
    .single()

  if (staffRow?.user_id === business.owner_id) {
    return { error: 'No puedes eliminar al propietario del negocio.' }
  }

  const { error } = await supabase
    .from('business_users')
    .delete()
    .eq('id', staffId)
    .eq('business_id', businessId)

  if (error) return { error: 'Error al eliminar miembro: ' + error.message }

  if (slug) revalidatePath(`/${slug}/admin/staff`)
  return { success: true }
}
