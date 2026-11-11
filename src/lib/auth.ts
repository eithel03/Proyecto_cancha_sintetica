import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

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

// SECURITY: roles in business_users that grant admin-level permissions over a business.
// 'manager' is the admin role in this schema; 'admin' is accepted for forward compatibility.
const BUSINESS_ADMIN_ROLES: readonly string[] = ['admin', 'manager']

/**
 * SECURITY: verifies that a user has ADMIN-level access to a business:
 * the business owner, an admin/manager staff member, or a global super_admin.
 * Unlike verifyBusinessAccess, plain 'staff' members are NOT authorized.
 * Returns a generic error message so callers never leak why access was denied.
 */
export async function verifyBusinessAdminAccess(
  supabase: SupabaseClient,
  userId: string,
  businessId: string
): Promise<{ error?: string }> {
  // SECURITY: global super_admin role always grants admin access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'super_admin') {
    return {}
  }

  // SECURITY: the business owner is the admin of their own business
  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single()

  if (business?.owner_id === userId) {
    return {}
  }

  // SECURITY: staff members require an admin-level role on this specific business
  if (business) {
    const { data: staff } = await supabase
      .from('business_users')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .maybeSingle()

    if (staff?.role && BUSINESS_ADMIN_ROLES.includes(staff.role)) {
      return {}
    }
  }

  return { error: 'No autorizado' }
}
