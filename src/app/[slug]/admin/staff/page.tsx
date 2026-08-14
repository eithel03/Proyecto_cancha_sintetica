import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin'
import StaffClient from './StaffClient'

export default async function StaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { user, business } = await getAdminSession(slug)

  if (business.owner_id !== user.id) redirect('/dashboard')
  const supabase = await createClient()

  const { data: staffMembers } = await supabase
    .from('business_users')
    .select('id, role, created_at, user_id, profiles!business_users_user_id_fkey(id, full_name, first_name, last_name, phone)')
    .eq('business_id', business.id)

  return (
    <div className="min-w-0 space-y-6 animate-in fade-in duration-300">
      <header className="-mx-4 -mt-4 bg-emerald-950 px-4 py-6 shadow-sm md:-mx-6 md:-mt-6 md:px-6 lg:-mx-9 lg:-mt-9 lg:px-9">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Equipo y permisos</p>
        <h2 className="mt-1 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">Staff</h2>
        <p className="mt-2 text-sm font-medium text-emerald-100/75">Administra los usuarios que tienen acceso a este negocio.</p>
      </header>
      <StaffClient
        initialStaff={staffMembers || []}
        businessId={business.id}
        slug={slug}
        ownerId={user.id}
      />
    </div>
  )
}
