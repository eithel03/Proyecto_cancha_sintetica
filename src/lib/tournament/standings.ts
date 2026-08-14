export type StandingsTeam = {
  id: string
  name: string
  gender?: string | null
  logo_url?: string | null
}

export type StandingsMatch = {
  home_team_id: string
  away_team_id: string
  status: string
  home_score: number | null
  away_score: number | null
}

export type TournamentStanding = {
  team: StandingsTeam
  team_id: string
  team_name: string
  pj: number
  g: number
  e: number
  p: number
  gf: number
  gc: number
  dg: number
  pts: number
}

export function isPlayedTournamentMatch(
  match: StandingsMatch,
): match is StandingsMatch & { home_score: number; away_score: number } {
  return (
    (match.status === 'finished' || match.status === 'live' || match.status === 'halftime') &&
    match.home_score !== null &&
    match.away_score !== null
  )
}

export function calculateTournamentStandings(teams: StandingsTeam[], matches: StandingsMatch[]): TournamentStanding[] {
  return teams
    .map((team) => {
      const stats = matches.reduce(
        (result, match) => {
          if (!isPlayedTournamentMatch(match)) return result
          if (match.home_team_id !== team.id && match.away_team_id !== team.id) return result

          const isHome = match.home_team_id === team.id
          const teamScore = isHome ? match.home_score : match.away_score
          const opponentScore = isHome ? match.away_score : match.home_score

          result.pj += 1
          result.gf += teamScore
          result.gc += opponentScore
          if (teamScore > opponentScore) result.g += 1
          else if (teamScore === opponentScore) result.e += 1
          else result.p += 1
          return result
        },
        { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 },
      )

      return {
        ...stats,
        team,
        team_id: team.id,
        team_name: team.name,
        dg: stats.gf - stats.gc,
        pts: stats.g * 3 + stats.e,
      }
    })
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.team_name.localeCompare(b.team_name, 'es'))
}
