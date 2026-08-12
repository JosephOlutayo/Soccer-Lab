"use client";

import { useEffect, useMemo, useState } from "react";
import type { ArchivedMatch, MatchArchive as Archive } from "@/lib/football-data";

type VenueFilter = "all" | "home" | "away";
type ResultFilter = "all" | "W" | "D" | "L";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

/**
 * One season's fixtures, loaded on demand when its timeline row is expanded.
 * Mounting is the trigger — an unopened season costs no upstream request,
 * which matters against a 10 requests/minute budget.
 */
export function MatchArchive({
  clubId,
  season,
}: {
  clubId: string;
  season: number;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: Archive }
    | { status: "error"; message: string; retry: boolean }
  >({ status: "loading" });

  const [venue, setVenue] = useState<VenueFilter>("all");
  const [result, setResult] = useState<ResultFilter>("all");

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    fetch(`/api/club-matches?club=${encodeURIComponent(clubId)}&season=${season}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          setState({
            status: "error",
            message: body.error ?? "Request failed",
            // The route tells us whether repeating the call could succeed.
            retry: Boolean(body.retry),
          });
          return;
        }
        setState({ status: "ready", data: body as Archive });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Request failed",
          retry: true,
        });
      });

    return () => controller.abort();
  }, [clubId, season]);

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    return state.data.matches.filter((match) => {
      if (venue === "home" && !match.home) return false;
      if (venue === "away" && match.home) return false;
      if (result !== "all" && match.outcome !== result) return false;
      return true;
    });
  }, [state, venue, result]);

  if (state.status === "loading") {
    return (
      <div className="space-y-1.5 px-1 pb-4" aria-live="polite">
        <span className="sr-only">Loading fixtures</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            aria-hidden
            className="h-11 animate-pulse rounded-xl bg-ink-850"
          />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p
        role="alert"
        className={`px-1 pb-4 text-sm ${state.retry ? "text-warn" : "text-chalk-dim"}`}
      >
        {state.message}
        {state.retry && " — collapse and reopen this season to try again."}
      </p>
    );
  }

  const { summary } = state.data;

  return (
    <div className="px-1 pb-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="tabular text-xs text-chalk-faint">
          {summary.played} played · {summary.wins}W {summary.draws}D{" "}
          {summary.losses}L
        </p>

        <div className="ml-auto flex flex-wrap gap-1.5">
          <FilterGroup<VenueFilter>
            label="Venue"
            value={venue}
            onChange={setVenue}
            options={[
              ["all", "All"],
              ["home", "Home"],
              ["away", "Away"],
            ]}
          />
          <FilterGroup<ResultFilter>
            label="Result"
            value={result}
            onChange={setResult}
            options={[
              ["all", "All"],
              ["W", "W"],
              ["D", "D"],
              ["L", "L"],
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-chalk-faint">
          No fixtures match these filters.
        </p>
      ) : (
        <ol className="space-y-1">
          {filtered.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </ol>
      )}
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: [T, string][];
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-0.5 rounded-pill border border-ink-700 p-0.5"
    >
      {options.map(([option, text]) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            // 44px minimum on touch; tightened to a compact chip from sm up,
            // where these are mouse targets sitting in a dense data view.
            className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-pill px-3 text-xs font-semibold transition-colors duration-150 sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1 ${
              active ? "bg-ink-700 text-chalk" : "text-chalk-faint hover:text-chalk"
            }`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

const OUTCOME_STYLE: Record<"W" | "D" | "L", string> = {
  W: "bg-live/15 text-live",
  D: "bg-ink-700 text-chalk-dim",
  L: "bg-warn/15 text-warn",
};

function MatchRow({ match }: { match: ArchivedMatch }) {
  const scoreline = match.played
    ? `${match.goalsFor}–${match.goalsAgainst}`
    : "–";

  return (
    <li className="grid grid-cols-[3.5rem_1.25rem_1fr_auto_1.5rem] items-center gap-2 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-ink-850 sm:gap-3">
      <span className="tabular text-xs text-chalk-faint">
        {DATE_FORMAT.format(new Date(match.utcDate))}
      </span>

      {/* Venue is a single glyph — it repeats 38 times, so a word would shout. */}
      <span
        className="text-xs font-bold text-chalk-faint"
        title={match.home ? "Home" : "Away"}
      >
        {match.home ? "H" : "A"}
        <span className="sr-only">{match.home ? " home" : " away"}</span>
      </span>

      <span className="flex min-w-0 items-center gap-2">
        {match.opponentCrest && (
          /* Crest URLs come from football-data.org itself, so these are
             provider-supplied rather than guessed. Fixed dimensions keep the
             row from shifting as they load. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.opponentCrest}
            alt=""
            width={18}
            height={18}
            loading="lazy"
            className="size-[18px] shrink-0 object-contain"
          />
        )}
        <span className="truncate text-sm font-medium text-chalk">
          {match.opponent}
        </span>
      </span>

      <span className="tabular text-sm font-bold text-chalk">{scoreline}</span>

      {match.outcome ? (
        <span
          className={`grid size-5 place-items-center rounded text-[0.6875rem] font-bold ${OUTCOME_STYLE[match.outcome]}`}
        >
          {match.outcome}
          <span className="sr-only">
            {match.outcome === "W" ? "win" : match.outcome === "D" ? "draw" : "loss"}
          </span>
        </span>
      ) : (
        <span className="text-[0.6875rem] text-chalk-faint">—</span>
      )}
    </li>
  );
}
