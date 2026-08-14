import { createClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin'
import CourtsClient from './CourtsClient'

export default async function CourtsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { business } = await getAdminSession(slug)
  const supabase = await createClient()

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-w-0">
      <CourtsClient initialCourts={courts || []} businessId={business.id} />
    </div>
  )
}
