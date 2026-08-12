import "server-only";

/**
 * football-data.org v4 client.
 *
 * Two constraints shape everything here:
 *
 * 1. The free tier allows **10 requests per minute**. Every call goes through
 *    Next's fetch cache with a long revalidate window, so a page view costs
 *    zero upstream requests until the cache expires.
 * 2. The free tier only exposes recent seasons. Anything older returns 403,
 *    which is an expected outcome here, not an error — `getSeasonStanding`
 *    reports it as `restricted` so the UI can say so honestly rather than
 *    showing a blank row or inventing a number.
 */

const BASE = "https://api.football-data.org/v4";

/** Earliest season the free tier serves. Verified by probing 2020-2026. */
export const EARLIEST_FREE_SEASON = 2023;

/** A season is labelled by the year it starts: 2025 -> "2025/26". */
export function seasonLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function availableSeasons(now = new Date()): number[] {
  // Seasons start in August, so before August the current season is last year.
  const current =
    now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const seasons: number[] = [];
  for (let y = EARLIEST_FREE_SEASON; y <= current; y++) seasons.push(y);
  return seasons.reverse();
}

/**
 * Why an upstream call failed. These mean genuinely different things — a plan
 * limitation, a transient throttle, or a broken request — and must never be
 * flattened into one, or the UI ends up telling users to upgrade when they
 * simply polled too fast.
 */
export type FetchFailure = "restricted" | "rate-limited" | "error";

/** Every helper below reports failure in this shape. */
export type Failed = { failure: FetchFailure };

export function isFailure<T extends object>(
  value: T | Failed,
): value is Failed {
  return "failure" in value;
}

type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: FetchFailure; status: number };

async function apiFetch<T>(
  path: string,
  revalidateSeconds: number,
): Promise<FetchResult<T>> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    throw new Error(
      "FOOTBALL_DATA_API_KEY is not set. Copy .env.example to .env.local and add your key.",
    );
  }

  const response = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": key },
    next: { revalidate: revalidateSeconds },
  });

  if (!response.ok) {
    const reason =
      response.status === 403
        ? "restricted"
        : response.status === 429
          ? "rate-limited"
          : "error";
    return { ok: false, reason, status: response.status };
  }

  return { ok: true, data: (await response.json()) as T };
}

type StandingsResponse = {
  season: { startDate: string; endDate: string; currentMatchday: number | null };
  standings: {
    type: string;
    table: {
      position: number;
      team: { id: number; name: string; tla: string | null };
      playedGames: number;
      won: number;
      draw: number;
      lost: number;
      points: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
    }[];
  }[];
};

export type SeasonRow = {
  season: number;
  label: string;
  /** null when the season exists but the club was not in this division. */
  position: number | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  /** Total clubs in the division that season — needed to render position fairly. */
  teamsInDivision: number;
  champion: string | null;
  isChampion: boolean;
  complete: boolean;
};

export type SeasonOutcome =
  | { status: "ok"; row: SeasonRow }
  | { status: "restricted"; season: number; label: string }
  | { status: "rate-limited"; season: number; label: string }
  | { status: "unavailable"; season: number; label: string };

export async function getSeasonStanding(
  competitionCode: string,
  season: number,
  teamId: number,
): Promise<SeasonOutcome> {
  const label = seasonLabel(season);

  // Completed seasons never change, so cache them for a day. The in-progress
  // season is refreshed every 10 minutes.
  const isCurrent = season >= new Date().getFullYear() - 1;
  const result = await apiFetch<StandingsResponse>(
    `/competitions/${competitionCode}/standings?season=${season}`,
    isCurrent ? 600 : 86400,
  );

  if (!result.ok) {
    // "unavailable" reads as permanent. A throttle is not, so it gets its own
    // status and its own wording in the timeline.
    const status =
      result.reason === "restricted"
        ? "restricted"
        : result.reason === "rate-limited"
          ? "rate-limited"
          : "unavailable";
    return { status, season, label };
  }

  const table = result.data.standings.find((s) => s.type === "TOTAL")?.table;
  if (!table?.length) return { status: "unavailable", season, label };

  const entry = table.find((r) => r.team.id === teamId);
  const leader = table[0];
  const complete = table.every((r) => r.playedGames > 0) && !!entry?.playedGames;

  if (!entry) {
    // Club was in another division that season — a real, meaningful outcome.
    return {
      status: "ok",
      row: {
        season,
        label,
        position: null,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        teamsInDivision: table.length,
        champion: leader.team.name,
        isChampion: false,
        complete,
      },
    };
  }

  return {
    status: "ok",
    row: {
      season,
      label,
      position: entry.position,
      played: entry.playedGames,
      won: entry.won,
      drawn: entry.draw,
      lost: entry.lost,
      points: entry.points,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      goalDifference: entry.goalDifference,
      teamsInDivision: table.length,
      champion: leader.team.name,
      // Only claim a title once every fixture is played.
      isChampion: entry.position === 1 && entry.playedGames > 0 && complete,
      complete,
    },
  };
}

type MatchesResponse = {
  resultSet?: {
    count: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
  };
  matches: {
    id: number;
    utcDate: string;
    status: string;
    matchday: number | null;
    homeTeam: { id: number; shortName: string | null; name: string; tla: string | null; crest: string | null };
    awayTeam: { id: number; shortName: string | null; name: string; tla: string | null; crest: string | null };
    score: {
      winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
      fullTime: { home: number | null; away: number | null };
    };
  }[];
};

export type ArchivedMatch = {
  id: number;
  /** ISO date string; formatted in the client to respect the user's locale. */
  utcDate: string;
  matchday: number | null;
  /** True when the selected club played at home. */
  home: boolean;
  opponent: string;
  opponentCrest: string | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  /** null for fixtures not yet played. */
  outcome: "W" | "D" | "L" | null;
  played: boolean;
  status: string;
};

export type MatchArchive = {
  summary: { played: number; wins: number; draws: number; losses: number };
  matches: ArchivedMatch[];
};

export async function getClubMatches(
  competitionCode: string,
  season: number,
  teamId: number,
): Promise<MatchArchive | Failed> {
  const isCurrent = season >= new Date().getFullYear() - 1;
  const result = await apiFetch<MatchesResponse>(
    `/teams/${teamId}/matches?season=${season}&competitions=${competitionCode}`,
    isCurrent ? 600 : 86400,
  );

  if (!result.ok) return { failure: result.reason };

  const matches: ArchivedMatch[] = result.data.matches.map((match) => {
    const home = match.homeTeam.id === teamId;
    const opponentTeam = home ? match.awayTeam : match.homeTeam;
    const goalsFor = home ? match.score.fullTime.home : match.score.fullTime.away;
    const goalsAgainst = home
      ? match.score.fullTime.away
      : match.score.fullTime.home;

    // Derive the result from the club's perspective rather than reading
    // `winner` directly, which is expressed as home/away.
    let outcome: "W" | "D" | "L" | null = null;
    if (match.score.winner === "DRAW") outcome = "D";
    else if (match.score.winner === "HOME_TEAM") outcome = home ? "W" : "L";
    else if (match.score.winner === "AWAY_TEAM") outcome = home ? "L" : "W";

    return {
      id: match.id,
      utcDate: match.utcDate,
      matchday: match.matchday,
      home,
      opponent: opponentTeam.shortName ?? opponentTeam.name,
      opponentCrest: opponentTeam.crest,
      goalsFor,
      goalsAgainst,
      outcome,
      played: match.status === "FINISHED",
      status: match.status,
    };
  });

  // Derive the summary from the fixtures rather than the API's `resultSet`.
  // That field is unreliable: for Arsenal 2025/26 it reports 38 played but
  // 18W/7D/5L, which sums to 30 and contradicts both the standings table and
  // its own match list (the real record is 26W/7D/5L). Counting the matches we
  // already hold is self-consistent and cannot disagree with the rows below it.
  return {
    summary: {
      played: matches.filter((m) => m.played).length,
      wins: matches.filter((m) => m.outcome === "W").length,
      draws: matches.filter((m) => m.outcome === "D").length,
      losses: matches.filter((m) => m.outcome === "L").length,
    },
    matches,
  };
}

export type TeamBaseline = {
  id: number;
  name: string;
  shortName: string;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export type LeagueBaseline = {
  season: number;
  label: string;
  competition: string;
  teams: TeamBaseline[];
  /** Measured league means, not assumptions — the home/away split is the
      empirical home advantage for this division and season. */
  homeGoalMean: number;
  awayGoalMean: number;
};

/**
 * Every team's scoring record for one season, plus the league's home and away
 * goal means. These are the parameters the simulation is fitted to — without
 * them any "simulation" would just be invented numbers.
 */
export async function getLeagueBaseline(
  competitionCode: string,
  season: number,
): Promise<LeagueBaseline | Failed> {
  const result = await apiFetch<StandingsResponse>(
    `/competitions/${competitionCode}/standings?season=${season}`,
    86400,
  );
  if (!result.ok) return { failure: result.reason };

  const byType = (type: string) =>
    result.data.standings.find((s) => s.type === type)?.table ?? [];

  const total = byType("TOTAL");
  // A 200 with no TOTAL table is a malformed response, not a plan limit.
  if (!total.length) return { failure: "error" };

  const home = byType("HOME");
  const away = byType("AWAY");

  const sum = (rows: typeof total, key: "goalsFor" | "playedGames") =>
    rows.reduce((acc, r) => acc + r[key], 0);

  // Fall back to splitting the total evenly only if the API omits the
  // home/away tables; with them present these are exact.
  const homeGames = sum(home, "playedGames") || sum(total, "playedGames") / 2;
  const awayGames = sum(away, "playedGames") || sum(total, "playedGames") / 2;
  const homeGoals = sum(home, "goalsFor") || sum(total, "goalsFor") / 2;
  const awayGoals = sum(away, "goalsFor") || sum(total, "goalsFor") / 2;

  return {
    season,
    label: seasonLabel(season),
    competition: competitionCode,
    teams: total.map((r) => ({
      id: r.team.id,
      name: r.team.name,
      shortName: r.team.tla ?? r.team.name,
      played: r.playedGames,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      points: r.points,
    })),
    homeGoalMean: homeGoals / Math.max(1, homeGames),
    awayGoalMean: awayGoals / Math.max(1, awayGames),
  };
}

type ScorersResponse = {
  scorers: {
    player: { id: number; name: string; nationality: string | null; section: string | null };
    team: { id: number; shortName: string | null; name: string; crest: string | null };
    playedMatches: number | null;
    goals: number | null;
    assists: number | null;
  }[];
};

export type Scorer = {
  id: number;
  name: string;
  teamId: number;
  teamShortName: string;
  teamCrest: string | null;
  goals: number;
  assists: number;
  playedMatches: number;
};

/**
 * The division's leading scorers for a season — the only player-level output
 * data the free tier exposes.
 *
 * Note the ceiling this imposes: it returns the top `limit` scorers league-wide,
 * so squad players with few goals simply are not present and cannot be
 * transferred. The UI has to say so rather than implying the list is a squad.
 */
export async function getLeagueScorers(
  competitionCode: string,
  season: number,
  limit = 100,
): Promise<Scorer[] | Failed> {
  const result = await apiFetch<ScorersResponse>(
    `/competitions/${competitionCode}/scorers?season=${season}&limit=${limit}`,
    86400,
  );
  if (!result.ok) return { failure: result.reason };

  return result.data.scorers
    .filter((s) => (s.goals ?? 0) > 0)
    .map((s) => ({
      id: s.player.id,
      name: s.player.name,
      teamId: s.team.id,
      teamShortName: s.team.shortName ?? s.team.name,
      teamCrest: s.team.crest,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      playedMatches: s.playedMatches ?? 0,
    }));
}

export type LiveMatch = {
  id: number;
  utcDate: string;
  status: string;
  /** Minutes played; only present while a match is running. */
  minute: number | null;
  competition: string;
  competitionCode: string;
  home: { name: string; crest: string | null; goals: number | null };
  away: { name: string; crest: string | null; goals: number | null };
  /** True when the selected club is the home side. */
  clubIsHome: boolean;
};

export type LiveState = {
  /** A match currently running or at half-time, if any. */
  live: LiveMatch | null;
  upcoming: LiveMatch[];
  /** Most recently finished match, for context when nothing is live. */
  lastResult: LiveMatch | null;
};

/** Statuses that mean a ball is actually in play (or paused mid-match). */
const RUNNING = new Set(["IN_PLAY", "PAUSED"]);

/**
 * Current live state for a club across every competition it is in.
 *
 * Cached for only 30 seconds — this is the one endpoint where staleness is
 * visible to the user. That costs at most 2 upstream requests per minute
 * against a 10/minute budget.
 */
export async function getLiveState(
  teamId: number,
): Promise<LiveState | Failed> {
  const day = 86400000;
  // Seven days back, not one: clubs often go several days between fixtures, and
  // a one-day window would leave "last result" empty for most of the week.
  const from = new Date(Date.now() - 7 * day).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 30 * day).toISOString().slice(0, 10);

  const result = await apiFetch<MatchesResponse & { matches: MatchesResponse["matches"] }>(
    `/teams/${teamId}/matches?dateFrom=${from}&dateTo=${to}`,
    30,
  );
  // Propagate *why* it failed. Collapsing 429 into "restricted" told users
  // their plan lacked live data when they had simply polled too fast.
  if (!result.ok) return { failure: result.reason };

  const raw = result.data.matches as (MatchesResponse["matches"][number] & {
    minute?: number | null;
    competition?: { name: string; code: string };
  })[];

  const map = (m: (typeof raw)[number]): LiveMatch => ({
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    minute: m.minute ?? null,
    competition: m.competition?.name ?? "",
    competitionCode: m.competition?.code ?? "",
    home: {
      name: m.homeTeam.shortName ?? m.homeTeam.name,
      crest: m.homeTeam.crest,
      goals: m.score.fullTime.home,
    },
    away: {
      name: m.awayTeam.shortName ?? m.awayTeam.name,
      crest: m.awayTeam.crest,
      goals: m.score.fullTime.away,
    },
    clubIsHome: m.homeTeam.id === teamId,
  });

  const all = raw.map(map);
  const byDate = (a: LiveMatch, b: LiveMatch) =>
    new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();

  const finished = all
    .filter((m) => m.status === "FINISHED")
    .sort(byDate)
    .reverse();

  return {
    live: all.find((m) => RUNNING.has(m.status)) ?? null,
    upcoming: all
      .filter((m) => m.status === "SCHEDULED" || m.status === "TIMED")
      .sort(byDate)
      .slice(0, 5),
    lastResult: finished[0] ?? null,
  };
}

export async function getClubHistory(
  competitionCode: string,
  teamId: number,
): Promise<SeasonOutcome[]> {
  const seasons = availableSeasons();
  // Sequential rather than Promise.all: 10 req/min is easy to trip, and these
  // are cache hits on all but the first render.
  const outcomes: SeasonOutcome[] = [];
  for (const season of seasons) {
    outcomes.push(await getSeasonStanding(competitionCode, season, teamId));
  }
  return outcomes;
}
