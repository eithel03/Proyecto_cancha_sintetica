import { createClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin'
import AdminProfileClient from './AdminProfileClient'

export default async function AdminProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { user, business } = await getAdminSession(slug)
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-w-0 space-y-6 animate-in fade-in duration-300">
      <AdminProfileClient
        profile={profile}
        email={user.email || ''}
        businessName={business.name}
      />
    </div>
  )
}
