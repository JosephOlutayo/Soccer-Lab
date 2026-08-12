/**
 * Real club reference data — no placeholder text.
 *
 * `accent` is the club's primary identity colour and is injected at runtime as
 * the `--club-accent` CSS custom property, so the entire UI re-themes when the
 * user switches clubs. `onAccent` is the foreground colour that meets WCAG AA
 * against that accent (checked per club, not assumed).
 *
 * Founding years, stadiums and capacities are factual and stable — they are the
 * seed for the History hub before any API is wired up.
 */

export type LeagueId = "epl" | "laliga" | "bundesliga" | "seriea" | "ligue1";

export type League = {
  id: LeagueId;
  name: string;
  country: string;
  /** football-data.org competition code. */
  apiCode: string;
};

export const LEAGUES: League[] = [
  { id: "epl", name: "Premier League", country: "England", apiCode: "PL" },
  { id: "laliga", name: "LaLiga", country: "Spain", apiCode: "PD" },
  {
    id: "bundesliga",
    name: "Bundesliga",
    country: "Germany",
    apiCode: "BL1",
  },
  { id: "seriea", name: "Serie A", country: "Italy", apiCode: "SA" },
  { id: "ligue1", name: "Ligue 1", country: "France", apiCode: "FL1" },
];

export type Club = {
  /** Stable slug used in URLs and as the API lookup key. */
  id: string;
  name: string;
  /** Short form for tight spaces (nav pill, table columns). */
  shortName: string;
  /** Two-or-three letter code, as used on scoreboards. */
  code: string;
  league: LeagueId;
  founded: number;
  stadium: string;
  capacity: number;
  accent: string;
  onAccent: string;
  /** football-data.org team id — verified against /competitions/{code}/teams. */
  apiTeamId: number;
  /**
   * Accent lightened to clear 3:1 against the dark chart surface (#0d0f11).
   * Only set where the identity colour is too dark to read as a data mark —
   * Barcelona (2.45:1) and PSG (1.82:1). Everything else passes as-is, so it
   * falls back to `accent`.
   */
  chartAccent?: string;
};

export const CLUBS: Club[] = [
  // Premier League
  {
    id: "arsenal",
    name: "Arsenal",
    shortName: "Arsenal",
    code: "ARS",
    league: "epl",
    founded: 1886,
    stadium: "Emirates Stadium",
    capacity: 60704,
    accent: "#EF0107",
    onAccent: "#FFFFFF",
    apiTeamId: 57,
  },
  {
    id: "manchester-city",
    name: "Manchester City",
    shortName: "Man City",
    code: "MCI",
    league: "epl",
    founded: 1880,
    stadium: "Etihad Stadium",
    capacity: 53400,
    accent: "#6CABDD",
    onAccent: "#06121C",
    apiTeamId: 65,
  },
  {
    id: "liverpool",
    name: "Liverpool",
    shortName: "Liverpool",
    code: "LIV",
    league: "epl",
    founded: 1892,
    stadium: "Anfield",
    capacity: 61276,
    accent: "#C8102E",
    onAccent: "#FFFFFF",
    apiTeamId: 64,
  },
  // LaLiga
  {
    id: "real-madrid",
    name: "Real Madrid",
    shortName: "Real Madrid",
    code: "RMA",
    league: "laliga",
    founded: 1902,
    stadium: "Santiago Bernabéu",
    capacity: 81044,
    accent: "#FEBE10",
    onAccent: "#1A1400",
    apiTeamId: 86,
  },
  {
    id: "barcelona",
    name: "FC Barcelona",
    shortName: "Barcelona",
    code: "BAR",
    league: "laliga",
    founded: 1899,
    stadium: "Spotify Camp Nou",
    capacity: 99354,
    accent: "#A50044",
    onAccent: "#FFFFFF",
    apiTeamId: 81,
    chartAccent: "#B2245E",
  },
  // Bundesliga
  {
    id: "bayern-munich",
    name: "FC Bayern München",
    shortName: "Bayern",
    code: "FCB",
    league: "bundesliga",
    founded: 1900,
    stadium: "Allianz Arena",
    capacity: 75024,
    accent: "#DC052D",
    onAccent: "#FFFFFF",
    apiTeamId: 5,
  },
  {
    id: "borussia-dortmund",
    name: "Borussia Dortmund",
    shortName: "Dortmund",
    code: "BVB",
    league: "bundesliga",
    founded: 1909,
    stadium: "Signal Iduna Park",
    capacity: 81365,
    accent: "#FDE100",
    onAccent: "#141200",
    apiTeamId: 4,
  },
  // Serie A
  {
    id: "inter",
    name: "Inter Milan",
    shortName: "Inter",
    code: "INT",
    league: "seriea",
    founded: 1908,
    stadium: "San Siro",
    capacity: 75923,
    accent: "#0068A8",
    onAccent: "#FFFFFF",
    apiTeamId: 108,
  },
  {
    id: "ac-milan",
    name: "AC Milan",
    shortName: "Milan",
    code: "MIL",
    league: "seriea",
    founded: 1899,
    stadium: "San Siro",
    capacity: 75923,
    accent: "#FB090B",
    onAccent: "#FFFFFF",
    apiTeamId: 98,
  },
  {
    id: "juventus",
    name: "Juventus",
    shortName: "Juventus",
    code: "JUV",
    league: "seriea",
    founded: 1897,
    stadium: "Allianz Stadium",
    capacity: 41507,
    accent: "#E8E8E8",
    onAccent: "#0B0B0B",
    apiTeamId: 109,
  },
  // Ligue 1
  {
    id: "psg",
    name: "Paris Saint-Germain",
    shortName: "PSG",
    code: "PSG",
    league: "ligue1",
    founded: 1970,
    stadium: "Parc des Princes",
    capacity: 47929,
    accent: "#004170",
    onAccent: "#FFFFFF",
    apiTeamId: 524,
    chartAccent: "#33678D",
  },
  {
    id: "marseille",
    name: "Olympique de Marseille",
    shortName: "Marseille",
    code: "OM",
    league: "ligue1",
    founded: 1899,
    stadium: "Stade Vélodrome",
    capacity: 67394,
    accent: "#2FAEE0",
    onAccent: "#04161F",
    apiTeamId: 516,
  },
];

export const DEFAULT_CLUB_ID = "arsenal";

export function getClub(id: string): Club {
  return CLUBS.find((club) => club.id === id) ?? CLUBS[0];
}

export function getLeague(id: LeagueId): League {
  return LEAGUES.find((league) => league.id === id) ?? LEAGUES[0];
}

/** Clubs grouped by league, in `LEAGUES` order — drives the switcher's sections. */
export function clubsByLeague(): { league: League; clubs: Club[] }[] {
  return LEAGUES.map((league) => ({
    league,
    clubs: CLUBS.filter((club) => club.league === league.id),
  })).filter((group) => group.clubs.length > 0);
}
