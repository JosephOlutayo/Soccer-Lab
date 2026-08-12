/**
 * Curated club landmarks — the deep history the football-data.org free tier
 * cannot reach (it serves 2023/24 onward only).
 *
 * These are hand-entered, well-established facts, kept deliberately separate
 * from API data so the UI can label each source honestly. This is a plain data
 * file on purpose: correcting or extending it needs no code changes.
 *
 * Only Arsenal is curated so far. Other clubs render an explicit empty state
 * rather than a silently short timeline — add a `landmarks[clubId]` entry to
 * fill one in.
 */

export type LandmarkKind =
  | "league"
  | "cup"
  | "european"
  | "manager"
  | "ground"
  | "milestone";

export type Landmark = {
  /** Calendar year the event belongs to. Used for ordering and display. */
  year: number;
  kind: LandmarkKind;
  title: string;
  detail: string;
};

export const LANDMARK_LABELS: Record<LandmarkKind, string> = {
  league: "League",
  cup: "Cup",
  european: "Europe",
  manager: "Manager",
  ground: "Ground",
  milestone: "Milestone",
};

const arsenal: Landmark[] = [
  {
    year: 2020,
    kind: "cup",
    title: "FA Cup won under Arteta",
    detail:
      "Beat Chelsea 2–1 at Wembley, both goals from Pierre-Emerick Aubameyang, in Mikel Arteta's first season in charge.",
  },
  {
    year: 2019,
    kind: "manager",
    title: "Mikel Arteta appointed",
    detail:
      "Returned to the club in December 2019 as head coach, having captained the side before retiring in 2016.",
  },
  {
    year: 2018,
    kind: "manager",
    title: "Arsène Wenger departs",
    detail:
      "Left after 22 years, the longest managerial tenure in the club's history, with three league titles and seven FA Cups.",
  },
  {
    year: 2017,
    kind: "cup",
    title: "FA Cup won again",
    detail:
      "Beat Chelsea 2–1, extending the club's record as the competition's most successful side.",
  },
  {
    year: 2014,
    kind: "cup",
    title: "FA Cup ends the trophy drought",
    detail:
      "Came from 2–0 down to beat Hull City 3–2 after extra time, a first trophy since 2005.",
  },
  {
    year: 2006,
    kind: "ground",
    title: "Move to the Emirates Stadium",
    detail:
      "Left Highbury after 93 years for a 60,000-capacity ground a few hundred metres away in Holloway.",
  },
  {
    year: 2006,
    kind: "european",
    title: "First Champions League final",
    detail:
      "Lost 2–1 to Barcelona in Paris after goalkeeper Jens Lehmann was sent off in the 18th minute.",
  },
  {
    year: 2004,
    kind: "league",
    title: "The Invincibles",
    detail:
      "Won the Premier League without losing a match: 26 wins, 12 draws, no defeats across the 38-game season.",
  },
  {
    year: 2002,
    kind: "league",
    title: "Second Double under Wenger",
    detail:
      "Sealed the title at Old Trafford, having already beaten Chelsea in the FA Cup final.",
  },
  {
    year: 1998,
    kind: "league",
    title: "First Double under Wenger",
    detail:
      "Overhauled a 12-point Manchester United lead to win the league, then beat Newcastle in the FA Cup final.",
  },
  {
    year: 1996,
    kind: "manager",
    title: "Arsène Wenger appointed",
    detail:
      "A little-known appointment from Japanese club Nagoya Grampus Eight that reshaped English football's approach to diet, fitness and recruitment.",
  },
  {
    year: 1994,
    kind: "european",
    title: "European Cup Winners' Cup",
    detail:
      "Beat Parma 1–0 in Copenhagen through Alan Smith's volley.",
  },
  {
    year: 1993,
    kind: "cup",
    title: "Both domestic cups in one season",
    detail:
      "Beat Sheffield Wednesday in both the League Cup and FA Cup finals, the first English club to do so.",
  },
  {
    year: 1991,
    kind: "league",
    title: "League title with one defeat",
    detail:
      "Lost a single league match all season under George Graham, despite a two-point deduction.",
  },
  {
    year: 1989,
    kind: "league",
    title: "Title won at Anfield",
    detail:
      "Needed to win by two goals at Liverpool on the final night; Michael Thomas scored in the last seconds to take the title on goals scored.",
  },
  {
    year: 1971,
    kind: "league",
    title: "First Double",
    detail:
      "Won the league at White Hart Lane, then beat Liverpool in the FA Cup final five days later.",
  },
  {
    year: 1970,
    kind: "european",
    title: "First European trophy",
    detail:
      "Won the Inter-Cities Fairs Cup, overturning a first-leg deficit against Anderlecht.",
  },
  {
    year: 1931,
    kind: "league",
    title: "First League title",
    detail:
      "The first of five championships in the 1930s under Herbert Chapman and his successors.",
  },
  {
    year: 1930,
    kind: "cup",
    title: "First major trophy",
    detail:
      "Beat Huddersfield Town 2–0 in the FA Cup final, Chapman's first silverware at the club.",
  },
  {
    year: 1925,
    kind: "manager",
    title: "Herbert Chapman appointed",
    detail:
      "Introduced the WM formation, floodlights, numbered shirts and the white-sleeved kit still worn today.",
  },
  {
    year: 1913,
    kind: "ground",
    title: "Move to Highbury",
    detail:
      "Relocated from Plumstead in south-east London to Highbury in the north, the move that made Arsenal a North London club.",
  },
  {
    year: 1893,
    kind: "milestone",
    title: "Elected to the Football League",
    detail:
      "The first club from southern England to join the Football League, entering the Second Division.",
  },
  {
    year: 1886,
    kind: "milestone",
    title: "Founded as Dial Square",
    detail:
      "Formed by workers at the Royal Arsenal armaments factory in Woolwich, renamed Royal Arsenal within weeks.",
  },
];

const landmarks: Record<string, Landmark[]> = {
  arsenal,
};

/** Newest first, matching the reverse-chronological spine of the page. */
export function getLandmarks(clubId: string): Landmark[] {
  return [...(landmarks[clubId] ?? [])].sort((a, b) => b.year - a.year);
}

export function hasLandmarks(clubId: string): boolean {
  return (landmarks[clubId]?.length ?? 0) > 0;
}
