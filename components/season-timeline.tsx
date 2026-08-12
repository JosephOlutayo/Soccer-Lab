"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, Lock, RefreshCw, Trophy } from "lucide-react";
import { useClub } from "@/components/club-provider";
import { MatchArchive } from "@/components/match-archive";
import type { SeasonOutcome } from "@/lib/football-data";

type Payload = { club: string; league: string; seasons: SeasonOutcome[] };

export function SeasonTimeline() {
  const { club } = useClub();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: Payload }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    fetch(`/api/club-history?club=${encodeURIComponent(club.id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Request failed");
        setState({ status: "ready", data: body as Payload });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Request failed",
        });
      });

    return () => controller.abort();
  }, [club.id]);

  return (
    <section aria-labelledby="timeline-heading" className="py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="timeline-heading" className="display-md text-chalk">
          Season Timeline
        </h2>
        <p className="eyebrow">Live · football-data.org</p>
      </div>

      {state.status === "loading" && <TimelineSkeleton />}

      {state.status === "error" && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-ink-700 bg-ink-900 p-5 text-sm text-chalk-dim"
        >
          Couldn&apos;t load season data: {state.message}. Check that
          FOOTBALL_DATA_API_KEY is set in <code>.env.local</code>, then reload.
        </p>
      )}

      {state.status === "ready" && (
        <TimelineRows seasons={state.data.seasons} clubId={club.id} />
      )}
    </section>
  );
}

function TimelineSkeleton() {
  return (
    <div className="mt-5 space-y-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-[4.5rem] animate-pulse rounded-2xl border border-ink-800 bg-ink-900"
        />
      ))}
    </div>
  );
}

function TimelineRows({
  seasons,
  clubId,
}: {
  seasons: SeasonOutcome[];
  clubId: string;
}) {
  const restricted = seasons.filter((s) => s.status === "restricted").length;
  const throttled = seasons.some((s) => s.status === "rate-limited");

  return (
    <>
      <ol className="mt-5 space-y-2">
        {seasons.map((outcome) => (
          <li
            key={outcome.status === "ok" ? outcome.row.label : outcome.label}
          >
            {outcome.status === "ok" ? (
              <SeasonRowCard outcome={outcome} clubId={clubId} />
            ) : (
              <BlockedRow
                label={outcome.label}
                reason={BLOCKED_REASON[outcome.status]}
                transient={outcome.status === "rate-limited"}
              />
            )}
          </li>
        ))}
      </ol>

      {restricted > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-chalk-faint">
          Seasons before 2023/24 are not available on football-data.org&apos;s
          free tier. Nothing is estimated to fill the gap.
        </p>
      )}

      {throttled && (
        <p className="mt-2 text-xs leading-relaxed text-warn">
          Some seasons were throttled by the API&apos;s rate limit. Reload in a
          minute — this is temporary, not missing data.
        </p>
      )}
    </>
  );
}

function SeasonRowCard({
  outcome,
  clubId,
}: {
  outcome: Extract<SeasonOutcome, { status: "ok" }>;
  clubId: string;
}) {
  const row = outcome.row;
  const inProgress = row.played > 0 && !row.complete;
  const notStarted = row.played === 0 && row.position !== null;
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Nothing to expand into for a season the club did not play in this division,
  // or one that has not started.
  const expandable = row.position !== null && !notStarted;

  return (
    <article
      className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 transition-colors duration-200 hover:border-ink-700"
      style={
        row.isChampion
          ? { borderColor: "var(--club-accent)" }
          : undefined
      }
    >
      <Header
        expandable={expandable}
        open={open}
        panelId={panelId}
        onToggle={() => setOpen((v) => !v)}
        label={row.label}
      >
      <span className="tabular font-display text-2xl font-bold leading-none text-chalk">
        {row.label}
      </span>

      {/* Finishing position is the one number worth reading at a glance.
          Before a ball is kicked the API still returns a position (the table is
          ordered alphabetically at 0 points), so suppress it — showing "1"
          would read as top of the league. */}
      <span className="tabular flex items-baseline gap-1 sm:justify-center">
        {row.position === null || notStarted ? (
          <span className="text-sm text-chalk-faint">—</span>
        ) : (
          <>
            <span
              className="text-3xl font-bold leading-none"
              style={{
                color: row.isChampion ? "var(--club-accent)" : undefined,
              }}
            >
              {row.position}
            </span>
            <span className="text-xs text-chalk-faint">
              /{row.teamsInDivision}
            </span>
          </>
        )}
      </span>

      {/* Spans, not divs/dl: this subtree renders inside a <button> for
          expandable seasons, and a button may only contain phrasing content. */}
      <span className="col-span-2 block sm:col-span-1">
        {notStarted ? (
          <span className="block text-sm text-chalk-dim">
            Season not yet under way — no fixtures played.
          </span>
        ) : row.position === null ? (
          <span className="block text-sm text-chalk-dim">
            Not in this division. {row.champion} finished top.
          </span>
        ) : (
          <span className="tabular flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
            <Stat label="Pts" value={row.points} strong />
            <Stat label="P" value={row.played} />
            <Stat label="W" value={row.won} />
            <Stat label="D" value={row.drawn} />
            <Stat label="L" value={row.lost} />
            <Stat
              label="GD"
              value={row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
            />
          </span>
        )}
      </span>

      <span className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:justify-end">
        {row.isChampion && (
          <span
            className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
            style={{
              backgroundColor: "var(--club-accent)",
              color: "var(--club-on-accent)",
            }}
          >
            <Trophy size={13} strokeWidth={2.5} aria-hidden />
            Champions
          </span>
        )}
        {inProgress && (
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-ink-700 px-2.5 py-1 text-xs font-semibold text-chalk-dim">
            <RefreshCw size={12} strokeWidth={2.5} aria-hidden />
            In progress
          </span>
        )}
        {expandable && (
          <ChevronDown
            size={18}
            strokeWidth={2.25}
            aria-hidden
            className={`text-chalk-faint transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </span>
      </Header>

      {/* Mounted only while open, so a closed season costs no API request. */}
      {expandable && open && (
        <div id={panelId} className="border-t border-ink-800">
          <MatchArchive clubId={clubId} season={row.season} />
        </div>
      )}
    </article>
  );
}

/**
 * The row's clickable surface. Expandable seasons render a real <button> so
 * keyboard and screen-reader users get the disclosure semantics; seasons with
 * nothing behind them render a plain div rather than a dead control.
 */
function Header({
  expandable,
  open,
  panelId,
  onToggle,
  label,
  children,
}: {
  expandable: boolean;
  open: boolean;
  panelId: string;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const layout =
    "grid w-full grid-cols-[4.5rem_1fr] items-center gap-4 p-4 text-left sm:grid-cols-[5rem_3.5rem_1fr_auto]";

  if (!expandable) return <div className={layout}>{children}</div>;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-label={`${label} season — ${open ? "hide" : "show"} fixtures`}
      className={`${layout} cursor-pointer transition-colors duration-150 hover:bg-ink-850`}
    >
      {children}
    </button>
  );
}

function Stat({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number | string;
  strong?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="eyebrow">{label}</span>
      <span
        className={
          strong
            ? "text-base font-bold text-chalk"
            : "text-sm font-medium text-chalk-dim"
        }
      >
        {value}
      </span>
    </span>
  );
}

/** Wording per blocked status — a throttle must not read like missing data. */
const BLOCKED_REASON: Record<
  Exclude<SeasonOutcome["status"], "ok">,
  string
> = {
  restricted: "Not included in the free API tier",
  "rate-limited": "Rate limited — reload shortly",
  unavailable: "No data returned for this season",
};

function BlockedRow({
  label,
  reason,
  transient = false,
}: {
  label: string;
  reason: string;
  transient?: boolean;
}) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-dashed border-ink-800 px-4 py-3">
      <span className="tabular font-display text-xl font-bold leading-none text-chalk-faint">
        {label}
      </span>
      <span
        className={`flex items-center gap-1.5 text-xs ${
          transient ? "text-warn" : "text-chalk-faint"
        }`}
      >
        {transient ? (
          <RefreshCw size={12} strokeWidth={2.25} aria-hidden />
        ) : (
          <Lock size={12} strokeWidth={2.25} aria-hidden />
        )}
        {reason}
      </span>
    </article>
  );
}
