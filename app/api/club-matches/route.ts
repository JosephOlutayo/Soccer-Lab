import { NextResponse } from "next/server";
import { CLUBS, getLeague } from "@/lib/clubs";
import {
  EARLIEST_FREE_SEASON,
  getClubMatches,
  isFailure,
} from "@/lib/football-data";
import { failureResponse } from "@/lib/api-failure";

/**
 * Match archive for one club in one season. Kept separate from
 * /api/club-history so expanding a season costs exactly one upstream request
 * and only when the user actually opens it.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const clubId = params.get("club");
  const seasonRaw = params.get("season");

  const club = CLUBS.find((c) => c.id === clubId);
  if (!club) {
    return NextResponse.json({ error: "Unknown club" }, { status: 400 });
  }

  const season = Number(seasonRaw);
  if (
    !Number.isInteger(season) ||
    season < EARLIEST_FREE_SEASON ||
    season > new Date().getFullYear() + 1
  ) {
    return NextResponse.json({ error: "Unsupported season" }, { status: 400 });
  }

  const league = getLeague(club.league);

  try {
    const archive = await getClubMatches(league.apiCode, season, club.apiTeamId);
    if (isFailure(archive)) return failureResponse(archive.failure, "Fixtures");
    return NextResponse.json(archive);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upstream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
