import { createClient } from '@/lib/supabase/server'

export async function verifyBusinessAccess(businessId: string): Promise<{ error?: string; userId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single()

  if (!business) return { error: 'Negocio no encontrado' }

  if (business.owner_id !== user.id) {
    const { data: staff } = await supabase
      .from('business_users')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!staff) return { error: 'No tienes permisos para realizar esta acción' }
  }

  return { userId: user.id }
}
