import { notFound, redirect } from 'next/navigation'
import TournamentPublicClient from './TournamentPublicClient'
import { PublicNav } from '@/components/PublicNav'
import { PublicFooter } from '@/components/PublicFooter'
import { getPublicBusiness, getPublicTournamentData } from '@/lib/public-data'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function PublicTournamentPage({ params }: PageProps) {
  const { slug } = await params
  const business = await getPublicBusiness(slug)

  if (!business) notFound()

  // SECURITY: el toggle del negocio bloquea el acceso público al torneo.
  if (business.show_tournament === false) {
    redirect(`/${slug}`)
  }

  const { matches, teams, stats, classificationZones } = await getPublicTournamentData(business.id)

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
      <PublicNav slug={business.slug} businessName={business.name} showTournament={business.show_tournament ?? true} />

      <main className="flex-1 w-full overflow-x-clip animate-in fade-in slide-in-from-bottom-4 duration-700">
        <TournamentPublicClient 
          businessId={business.id}
          businessName={business.name}
          matches={matches}
          teams={teams}
          stats={stats}
          classificationZones={classificationZones}
        />
      </main>

      <PublicFooter business={business} />
    </div>
  )
}
