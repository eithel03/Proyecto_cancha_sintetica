'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateBusiness(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const location = formData.get('location') as string
  
  if (!name) return { error: 'El nombre es obligatorio' }

  const { error } = await supabase
    .from('businesses')
    .update({
      name,
      phone,
      location,
    })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return { error: 'Error al actualizar negocio: ' + error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
