import { NextResponse } from "next/server";
import { CLUBS, getLeague } from "@/lib/clubs";
import {
  availableSeasons,
  getLeagueBaseline,
  isFailure,
} from "@/lib/football-data";
import { failureResponse } from "@/lib/api-failure";

/**
 * The statistical baseline the simulation is fitted to: every team's real
 * scoring record for the most recent *completed* season in the club's league.
 *
 * An in-progress or unstarted season is skipped — fitting attack and defence
 * ratings to two matchdays would produce confident-looking nonsense.
 */
export async function GET(request: Request) {
  const clubId = new URL(request.url).searchParams.get("club");

  const club = CLUBS.find((c) => c.id === clubId);
  if (!club) {
    return NextResponse.json({ error: "Unknown club" }, { status: 400 });
  }

  const league = getLeague(club.league);

  try {
    for (const season of availableSeasons()) {
      const baseline = await getLeagueBaseline(league.apiCode, season);

      if (isFailure(baseline)) {
        // Only a plan restriction justifies falling back to an older season.
        // A throttle or upstream error would repeat on every remaining
        // iteration, burning quota on requests certain to fail the same way.
        if (baseline.failure === "restricted") continue;
        return failureResponse(baseline.failure, "League baseline");
      }

      const complete = baseline.teams.every((t) => t.played > 0);
      if (!complete) continue;

      return NextResponse.json({
        ...baseline,
        leagueName: league.name,
        clubTeamId: club.apiTeamId,
      });
    }

    return NextResponse.json(
      { error: "No completed season available to fit the model" },
      { status: 404 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upstream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
