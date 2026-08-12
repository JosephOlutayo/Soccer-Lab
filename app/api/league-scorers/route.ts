import { NextResponse } from "next/server";
import { CLUBS, getLeague } from "@/lib/clubs";
import {
  EARLIEST_FREE_SEASON,
  getLeagueScorers,
  isFailure,
} from "@/lib/football-data";
import { failureResponse } from "@/lib/api-failure";

/**
 * Leading scorers for the club's division, split into the club's own players
 * (potential departures) and everyone else (potential signings).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const clubId = params.get("club");
  const season = Number(params.get("season"));

  const club = CLUBS.find((c) => c.id === clubId);
  if (!club) {
    return NextResponse.json({ error: "Unknown club" }, { status: 400 });
  }
  if (
    !Number.isInteger(season) ||
    season < EARLIEST_FREE_SEASON ||
    season > new Date().getFullYear() + 1
  ) {
    return NextResponse.json({ error: "Unsupported season" }, { status: 400 });
  }

  const league = getLeague(club.league);

  try {
    const scorers = await getLeagueScorers(league.apiCode, season);
    if (isFailure(scorers)) return failureResponse(scorers.failure, "Scorers");

    return NextResponse.json({
      season,
      squad: scorers.filter((s) => s.teamId === club.apiTeamId),
      market: scorers.filter((s) => s.teamId !== club.apiTeamId),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upstream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
