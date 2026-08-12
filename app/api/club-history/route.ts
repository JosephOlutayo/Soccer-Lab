import { NextResponse } from "next/server";
import { CLUBS, getLeague } from "@/lib/clubs";
import { getClubHistory } from "@/lib/football-data";

/**
 * Server-side proxy for club season history.
 *
 * The club is chosen in the browser (localStorage-backed context), so the data
 * cannot be fetched during a server render of the page. This route keeps the
 * API key on the server while still letting the client drive the selection.
 *
 * When club selection eventually moves into the URL (`/[club]`), this can
 * collapse into a plain Server Component fetch.
 */
export async function GET(request: Request) {
  const clubId = new URL(request.url).searchParams.get("club");

  // Look the club up in our own list rather than trusting the query value —
  // nothing from the request reaches the upstream URL.
  const club = CLUBS.find((c) => c.id === clubId);
  if (!club) {
    return NextResponse.json({ error: "Unknown club" }, { status: 400 });
  }

  const league = getLeague(club.league);

  try {
    const seasons = await getClubHistory(league.apiCode, club.apiTeamId);
    return NextResponse.json({ club: club.id, league: league.name, seasons });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upstream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
