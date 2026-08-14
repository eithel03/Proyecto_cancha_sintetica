'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validatePhone } from '@/lib/phone'

export async function updateOwnerProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string

  const profilePhone = validatePhone(phone)
  if (!profilePhone.ok) return { error: profilePhone.error }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName || null,
      phone: profilePhone.value || null,
    })
    .eq('id', user.id)

  if (error) return { error: 'Error al actualizar perfil: ' + error.message }

  const { data: membership } = await supabase
    .from('business_users')
    .select('business_id, businesses!inner(slug)')
    .eq('user_id', user.id)
    .in('role', ['owner', 'staff'])
    .limit(1)
    .maybeSingle()

  const slug = (membership as any)?.businesses?.slug
  if (slug) {
    revalidatePath(`/${slug}/admin/perfil`)
    revalidatePath(`/${slug}/admin`)
  }
  return { success: true }
}
