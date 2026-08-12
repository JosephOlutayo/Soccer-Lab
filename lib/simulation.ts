import type { LeagueBaseline, TeamBaseline } from "@/lib/football-data";

/**
 * A Poisson goal model of the classic Maher (1982) form, fitted to real
 * league data rather than invented constants.
 *
 * Each team gets an attack rating and a defence rating, both expressed
 * relative to the league average, derived from the goals it actually scored
 * and conceded. Expected goals in a fixture are then:
 *
 *   home goals ~ Poisson(attack_home x defence_away x leagueHomeMean)
 *   away goals ~ Poisson(attack_away x defence_home x leagueAwayMean)
 *
 * The home/away means come from the division's own measured split, so home
 * advantage is observed, not assumed.
 *
 * Honest limits, worth stating rather than hiding: this treats every match as
 * independent, ignores in-season form, injuries, fixture congestion and
 * red cards, and slightly under-produces draws compared with real football
 * (the well-known weakness Dixon-Coles corrects for). It is a reasonable
 * first-order model, not a forecast.
 */

export type TeamRating = {
  id: number;
  name: string;
  shortName: string;
  attack: number;
  defence: number;
};

export type Ratings = {
  teams: TeamRating[];
  homeGoalMean: number;
  awayGoalMean: number;
};

export function fitRatings(baseline: LeagueBaseline): Ratings {
  const totalGoals = baseline.teams.reduce((a, t) => a + t.goalsFor, 0);
  const totalGames = baseline.teams.reduce((a, t) => a + t.played, 0);
  const leagueMean = totalGoals / Math.max(1, totalGames);

  const rate = (team: TeamBaseline, key: "goalsFor" | "goalsAgainst") =>
    team.played > 0 ? team[key] / team.played / leagueMean : 1;

  return {
    teams: baseline.teams.map((team) => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      attack: rate(team, "goalsFor"),
      defence: rate(team, "goalsAgainst"),
    })),
    homeGoalMean: baseline.homeGoalMean,
    awayGoalMean: baseline.awayGoalMean,
  };
}

export type TransferPlayer = {
  id: number;
  name: string;
  goals: number;
  /** Goals scored by the player's current club — used for context adjustment. */
  teamGoals: number;
};

export type TransferEffect = {
  goalsOut: number;
  /** Incoming goals as actually scored, before any adjustment. */
  goalsInRaw: number;
  /** Incoming goals after scaling for the destination's attacking context. */
  goalsIn: number;
  netGoals: number;
  baseGoals: number;
  attackMultiplier: number;
};

/**
 * Turns named signings and departures into a multiplier on the club's attack
 * rating, so the abstract "attacking output" dial becomes an actual squad change.
 *
 * Departures subtract the goals the player scored for this club. Signings are
 * *not* added at face value: a striker's goals depend heavily on the chances
 * his team creates, so incoming goals are scaled by the ratio of the
 * destination club's total goals to the source club's. A 27-goal forward moving
 * from a side that scored 77 to one that scored 71 is credited with
 * 27 x 71/77 ~ 24.9.
 *
 * That is a crude adjustment and deliberately so — it is transparent and
 * directionally right. It still assumes the player keeps his finishing rate and
 * stays fit, which no transfer guarantees.
 */
export function transferEffect(
  baseGoals: number,
  out: TransferPlayer[],
  incoming: TransferPlayer[],
): TransferEffect {
  const goalsOut = out.reduce((a, p) => a + p.goals, 0);
  const goalsInRaw = incoming.reduce((a, p) => a + p.goals, 0);
  const goalsIn = incoming.reduce(
    (a, p) => a + p.goals * (p.teamGoals > 0 ? baseGoals / p.teamGoals : 1),
    0,
  );

  const netGoals = goalsIn - goalsOut;
  const projected = Math.max(0, baseGoals + netGoals);

  return {
    goalsOut,
    goalsInRaw,
    goalsIn,
    netGoals,
    baseGoals,
    // Floored rather than allowed to hit zero: a side that sells everyone still
    // scores through the players the top-scorer list never covered.
    attackMultiplier: baseGoals > 0 ? Math.max(0.2, projected / baseGoals) : 1,
  };
}

/** The user-facing dials. 1 means "exactly as measured last season". */
export type Adjustments = {
  /** Multiplier on the selected club's attack rating. */
  attack: number;
  /** Multiplier on the selected club's goals conceded. Below 1 = tighter. */
  defence: number;
  /** Multiplier on the club's home-advantage component. */
  homeEdge: number;
};

export const NEUTRAL: Adjustments = { attack: 1, defence: 1, homeEdge: 1 };

export type SimulationResult = {
  runs: number;
  /** Index = final position - 1; value = probability 0..1. */
  positionProbabilities: number[];
  meanPoints: number;
  /** 5th and 95th percentile of the points distribution. */
  pointsLow: number;
  pointsHigh: number;
  titleProbability: number;
  topFourProbability: number;
  meanPosition: number;
};

/**
 * Knuth's method. Fine for the small means (0-4 goals) this model produces,
 * and dependency-free.
 */
function samplePoisson(mean: number, random: () => number): number {
  const limit = Math.exp(-mean);
  let k = 0;
  let product = random();
  while (product > limit) {
    k++;
    product *= random();
    if (k > 15) break; // Guard against pathological means; 15 goals is plenty.
  }
  return k;
}

/** Mulberry32 — seeded so a given set of dials always reproduces its result. */
function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateSeason(
  ratings: Ratings,
  clubTeamId: number,
  adjustments: Adjustments,
  runs = 2000,
  seed = 20260810,
): SimulationResult {
  const teams = ratings.teams;
  const n = teams.length;
  const clubIndex = teams.findIndex((t) => t.id === clubTeamId);
  const random = makeRandom(seed);

  // Apply the dials to the selected club only — every other team stays at its
  // measured rating, so the output isolates the effect of these changes.
  const attack = teams.map((t, i) =>
    i === clubIndex ? t.attack * adjustments.attack : t.attack,
  );
  const defence = teams.map((t, i) =>
    i === clubIndex ? t.defence * adjustments.defence : t.defence,
  );

  const positionCounts = new Array<number>(n).fill(0);
  const pointsSamples: number[] = [];
  let titles = 0;
  let topFour = 0;
  let positionTotal = 0;

  // Precompute the fixture list once: a full double round-robin.
  const fixtures: [number, number][] = [];
  for (let h = 0; h < n; h++) {
    for (let a = 0; a < n; a++) {
      if (h !== a) fixtures.push([h, a]);
    }
  }

  for (let run = 0; run < runs; run++) {
    const points = new Array<number>(n).fill(0);
    const goalDiff = new Array<number>(n).fill(0);

    for (const [h, a] of fixtures) {
      let homeMean = attack[h] * defence[a] * ratings.homeGoalMean;
      const awayMean = attack[a] * defence[h] * ratings.awayGoalMean;

      // The home-edge dial scales only the club's own home matches.
      if (h === clubIndex) homeMean *= adjustments.homeEdge;

      const homeGoals = samplePoisson(homeMean, random);
      const awayGoals = samplePoisson(awayMean, random);

      goalDiff[h] += homeGoals - awayGoals;
      goalDiff[a] += awayGoals - homeGoals;

      if (homeGoals > awayGoals) points[h] += 3;
      else if (homeGoals < awayGoals) points[a] += 3;
      else {
        points[h] += 1;
        points[a] += 1;
      }
    }

    // Rank on points, then goal difference — the tiebreak used across the
    // top five leagues (Serie A's head-to-head rule is not modelled).
    const order = points
      .map((p, i) => i)
      .sort((x, y) => points[y] - points[x] || goalDiff[y] - goalDiff[x]);

    const finish = order.indexOf(clubIndex);
    positionCounts[finish]++;
    positionTotal += finish + 1;
    pointsSamples.push(points[clubIndex]);
    if (finish === 0) titles++;
    if (finish < 4) topFour++;
  }

  pointsSamples.sort((a, b) => a - b);
  const percentile = (p: number) =>
    pointsSamples[
      Math.min(pointsSamples.length - 1, Math.floor(p * pointsSamples.length))
    ];

  return {
    runs,
    positionProbabilities: positionCounts.map((c) => c / runs),
    meanPoints:
      pointsSamples.reduce((a, b) => a + b, 0) / Math.max(1, pointsSamples.length),
    pointsLow: percentile(0.05),
    pointsHigh: percentile(0.95),
    titleProbability: titles / runs,
    topFourProbability: topFour / runs,
    meanPosition: positionTotal / runs,
  };
}
