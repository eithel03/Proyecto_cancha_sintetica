import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewBusinessClient from './NewBusinessClient'

export default async function NewBusinessPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/login')

  return (
    <div className="space-y-6">
      <NewBusinessClient />
    </div>
  )
}
