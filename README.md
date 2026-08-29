# Soccer Lab

A football history, live data and season-simulation app for Arsenal and eleven other clubs across Europe's top five leagues.

Every number on screen comes from real match data. Where data is unavailable, the interface says so rather than filling the gap with estimates.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Lucide icons
**Data:** [football-data.org](https://www.football-data.org) (free tier)

---

## Contents

- [What it does](#what-it-does)
- [Getting started](#getting-started)
- [How the simulation works](#how-the-simulation-works)
- [Data sources and their limits](#data-sources-and-their-limits)
- [Project structure](#project-structure)
- [API routes](#api-routes)
- [Design and engineering notes](#design-and-engineering-notes)
- [Roadmap](#roadmap)

---

## What it does

The app has two sections, switched from the top navigation. A club selector re-themes the entire interface around whichever of the twelve clubs is active.

### History & Live Hub

Arranged as one continuous reverse-chronological spine, so scrolling down travels backwards through time.

| Section | What it shows |
| --- | --- |
| **Live** | In-play score and minute, the next fixture with a countdown, and the most recent result |
| **Season Timeline** | League record per season — position, points, W/D/L, goal difference |
| **Match Archive** | Expand any season row for its full fixture list, filterable by venue and result |
| **Landmarks** | 23 curated Arsenal entries reaching back to the 1886 founding |

The live tracker polls every 30 seconds while a match is running and every five minutes otherwise. It stops entirely on a hidden browser tab and refetches the moment you return, which keeps it inside the API rate limit without ever showing a stale scoreline.

### The Simulation

Adjust the inputs, re-run the season, and see how the outcome distribution shifts.

- **Dials** — attacking output, goals conceded, and home advantage, each a multiplier where 100% means "exactly as this club performed last season".
- **Transfer Lab** — sell and sign named players drawn from the division's real scoring records. The resulting attack multiplier composes with the dials, and the panel shows the combined figure so the two controls never disagree.
- **Outcomes** — title and top-four probability, mean points with a 5th–95th percentile range, and a chart of the full finishing-position distribution with a table view alongside it.

---

## Getting started

### Prerequisites

- **Node.js 20+** (developed against 24.19)
- A free **football-data.org API key** — register at [football-data.org/client/register](https://www.football-data.org/client/register)

### Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Paste your key into `.env.local`, then open <http://localhost:3000>.

### Environment

`.env.local` holds a single value:

```
FOOTBALL_DATA_API_KEY=your_key_here
```

Note the deliberate absence of a `NEXT_PUBLIC_` prefix. The key is read only in `lib/football-data.ts`, which imports `server-only` to guarantee it can never be pulled into a client bundle. Browser requests reach the API through the routes in `app/api/`, so the key never leaves the server. `.env.local` is gitignored.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |

---

## How the simulation works

A Poisson goal model of the classic Maher (1982) form, fitted to real league data rather than hand-tuned constants.

Each club gets an **attack** and a **defence** rating, both relative to the league average, derived from the goals it actually scored and conceded. Expected goals in a fixture are then:

```
home goals ~ Poisson(attack_home × defence_away × leagueHomeMean)
away goals ~ Poisson(attack_away × defence_home × leagueAwayMean)
```

The home and away means come from the division's own measured split, so home advantage is observed rather than assumed — the Premier League produced 1.53 goals per home side against 1.22 away in 2025/26, the Bundesliga 1.78 against 1.40.

A full double round-robin is simulated 2,000 times, ranked on points then goal difference. The random number generator is seeded, so a given set of dials always reproduces the same result.

### Does it work?

Replaying 2025/26 with the dials neutral reproduces the real table to within **3.4 points mean absolute error** across all twenty Premier League clubs. Arsenal simulated at 82.7 points against an actual 85; Manchester City at 80.0 against 78. The model independently ranks them first and second.

### What it deliberately does not model

Matches are treated as independent. Injuries, form streaks, fixture congestion, red cards and managerial changes are all absent, and the model slightly under-produces draws — the known weakness that Dixon–Coles corrects for. It is a reasonable first-order model, not a forecast, and the interface says as much.

---

## Data sources and their limits

### football-data.org free tier

Two constraints shape the whole application:

- **Seasons from 2023/24 onward only.** Earlier seasons return HTTP 403. The season timeline renders those as explicitly locked rows rather than hiding them or estimating values.
- **Rate limited.** Every request goes through the Next.js fetch cache — completed seasons for 24 hours, in-progress data for 30 seconds to 10 minutes — so ordinary browsing costs no upstream requests at all.

### Curated landmarks

Because the API cannot reach past 2023, `lib/landmarks.ts` holds 23 hand-entered Arsenal milestones from the 1886 founding onward. It is deliberately a plain data file: correcting or extending it needs no code changes. Only Arsenal is curated — other clubs show an explicit empty state pointing at that file rather than a silently short timeline.

### Player data

The Transfer Lab draws on the division's **top 100 scorers**, which is all the free tier exposes. Low-scoring squad players, goalkeepers and most defenders are therefore not transferable. Incoming goals are scaled by the ratio of the destination club's attacking output to the player's current club, because a striker's tally depends on the chances his team creates.

### Club crests

Club badges are trademarked and their files are not freely redistributable, so the twelve tracked clubs are rendered as colour-and-code marks instead. Opponent crests in the match archive use the URLs football-data.org itself supplies.

---

## Project structure

Data flows in one direction: `lib/` talks to the API and does the maths, `app/api/` exposes it over HTTP without leaking the key, and `components/` render it. Nothing in `components/` imports `football-data.ts` except for its types.

### `app/` — routing, and the only server-side code

| Path | Role |
| --- | --- |
| `layout.tsx` | Wraps every page in `ClubProvider` and `TopNav`, and loads the two Barlow faces used across the design |
| `page.tsx` | The History & Live Hub. Pure composition — stacks `LiveTracker`, `SeasonTimeline` and `LandmarkTimeline` into the reverse-chronological spine |
| `simulation/page.tsx` | The Simulation. Hosts `SimulationLab`, which owns all the state that page needs |
| `globals.css` | Tailwind v4 `@theme` tokens: the ink/chalk surface ramp, the display and body type scales, and the `--club-accent` defaults that `ClubProvider` overwrites at runtime |
| `api/live/` | Wraps `getLiveState`. The only route with `force-dynamic` and a 30-second cache, because staleness here is visible to the user |
| `api/club-history/` | Wraps `getClubHistory`, which walks each available season and reports restricted ones instead of hiding them |
| `api/club-matches/` | Wraps `getClubMatches` for a single season. Kept separate from club-history so expanding a season costs exactly one upstream request, and only when opened |
| `api/league-baseline/` | Wraps `getLeagueBaseline`. Walks back to the most recent *completed* season, since fitting a model to two matchdays would produce confident nonsense |
| `api/league-scorers/` | Wraps `getLeagueScorers` and splits the result into the club's own players and everyone else — the two lists the Transfer Lab renders |

### `components/` — all client-side

| File | Role |
| --- | --- |
| `club-provider.tsx` | The root of club state. Persists the choice to `localStorage` and writes `--club-accent` / `--club-chart` onto `<html>`, which is how plain CSS re-themes and not just React |
| `club-switcher.tsx` | The selector itself, built as an ARIA listbox rather than a styled `<select>` so options can carry crests and league grouping. Calls `setClubId` from the provider |
| `club-crest.tsx` | The colour-and-code identity mark, used by both the switcher and the nav. Swap its internals for licensed art without touching a single call site |
| `top-nav.tsx` | Wordmark, the two-section toggle driven by `usePathname`, and the mount point for `ClubSwitcher` |
| `shell-ui.tsx` | `SectionHero`, shared by both pages, plus the placeholder panel used for unbuilt features |
| `live-tracker.tsx` | Owns the polling loop, its visibility handling, and the in-play/idle branch. The only component that refetches on a timer |
| `season-timeline.tsx` | Renders one row per season and turns each into a disclosure. Mounts `MatchArchive` only when a row is opened |
| `match-archive.tsx` | A season's fixtures with venue and result filters. Fetches on mount, which is why an unopened season costs nothing |
| `landmark-timeline.tsx` | Reads `landmarks.ts` directly — the one data surface with no API call behind it |
| `simulation-lab.tsx` | The orchestrator. Fetches the baseline and scorer pools, holds the dials and transfer selections, runs the model, and composes the two into one attack multiplier |
| `transfer-lab.tsx` | Renders the two player lists and reports selections upward. Deliberately owns no model state |
| `position-distribution.tsx` | The finishing-position chart, with its hover layer and table view. Takes a plain array of probabilities, so it knows nothing about football |

### `lib/` — data and maths, no React

| File | Role |
| --- | --- |
| `clubs.ts` | The single source of truth for the twelve clubs and five leagues: identity colours, contrast-checked chart accents, and the football-data.org ids every route resolves through |
| `football-data.ts` | The API client. Owns the key, every cache duration, and the classification of failures into `restricted` / `rate-limited` / `error`. Imports `server-only` so it can never reach the browser |
| `api-failure.ts` | The one place a failure becomes an HTTP response, so a new route cannot reintroduce the mislabelling described above |
| `simulation.ts` | Pure functions: `fitRatings` turns a baseline into attack/defence ratings, `simulateSeason` runs the Monte Carlo, `transferEffect` converts signings into a multiplier. No imports from React or the API client |
| `landmarks.ts` | Curated club history as plain data, kept separate from anything fetched so the UI can label each source honestly |

---

## API routes

All routes are server-side proxies that keep the API key private.

| Route | Query | Returns |
| --- | --- | --- |
| `/api/live` | `club` | In-play match, upcoming fixtures, last result |
| `/api/club-history` | `club` | Per-season league record |
| `/api/club-matches` | `club`, `season` | That season's fixtures |
| `/api/league-baseline` | `club` | Every team's scoring record plus league goal means |
| `/api/league-scorers` | `club`, `season` | Top scorers split into squad and market |

Upstream failures are classified as `restricted`, `rate-limited` or `error` and mapped to 403, 429 and 502 by `lib/api-failure.ts`, with a `retry` flag telling the client whether repeating the call could ever succeed. This matters: an earlier version collapsed every failure into "restricted", so a rate limit told users their plan lacked data it actually included.

---

## Design and engineering notes

A few decisions worth knowing about if you are reading the code.

**Club identity drives the UI through CSS custom properties.** `ClubProvider` sets `--club-accent` on the root element, so switching clubs re-themes plain CSS — focus rings, pseudo-elements — and not just the React tree.

**Chart marks use a separate token.** Two identity colours fail a 3:1 contrast check against the dark chart surface (PSG's navy manages 1.82:1, Barcelona's claret 2.45:1). Those clubs carry a lightened `chartAccent` used for data marks only, while the identity colour still drives the navigation and hero.

**Season records are counted from fixtures.** The API's own `resultSet.wins` field is unreliable — for Arsenal 2025/26 it reports 38 played but a W/D/L that sums to 30, contradicting both the standings and its own match list. Counting the returned fixtures is self-consistent.

**Probabilities never round to certainty.** 99.8% displayed as "100%" claims the model rules out every other outcome. Even 2,000 of 2,000 is a sample, not a proof, so the extremes render as `>99%` and `<1%`.

**Accessibility.** The club selector implements the ARIA listbox pattern with full keyboard traversal; season rows are proper disclosures; the distribution chart ships a table view; touch targets meet 44px on mobile; and `prefers-reduced-motion` is respected.

---

## Roadmap

- Verify the in-play card against a real live match — it has been tested only against controlled responses, since no fixture was running during development
- Lift the top-100-scorer ceiling in the Transfer Lab
- Curate landmarks for clubs beyond Arsenal
- Drill into a single simulated season to see which results swung the title
