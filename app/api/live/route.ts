import { NextResponse } from "next/server";
import { CLUBS } from "@/lib/clubs";
import { getLiveState, isFailure } from "@/lib/football-data";
import { failureResponse } from "@/lib/api-failure";

/**
 * Live state for a club. Deliberately not cached at the route level — the
 * 30-second window lives on the upstream fetch, so every poll either serves a
 * fresh-enough copy or refreshes it, without the client ever seeing a response
 * older than half a minute.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clubId = new URL(request.url).searchParams.get("club");

  const club = CLUBS.find((c) => c.id === clubId);
  if (!club) {
    return NextResponse.json({ error: "Unknown club" }, { status: 400 });
  }

  try {
    const state = await getLiveState(club.apiTeamId);
    if (isFailure(state)) return failureResponse(state.failure, "Live data");
    return NextResponse.json({ ...state, fetchedAt: new Date().toISOString() });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upstream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
