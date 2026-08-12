"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useClub } from "@/components/club-provider";
import { PositionDistribution } from "@/components/position-distribution";
import { TransferLab, type ScorerPools } from "@/components/transfer-lab";
import {
  NEUTRAL,
  fitRatings,
  simulateSeason,
  transferEffect,
  type Adjustments,
} from "@/lib/simulation";
import type { LeagueBaseline } from "@/lib/football-data";

type Baseline = LeagueBaseline & { leagueName: string; clubTeamId: number };

// `id` rather than `key`: spreading an object with a `key` field into a
// component collides with React's reserved prop.
const DIALS: {
  id: keyof Adjustments;
  label: string;
  help: string;
  min: number;
  max: number;
}[] = [
  {
    id: "attack",
    label: "Attacking output",
    help: "Signings, form and chance creation — scales goals scored.",
    min: 0.6,
    max: 1.5,
  },
  {
    id: "defence",
    label: "Goals conceded",
    help: "Defensive solidity. Below 100% means a tighter side.",
    min: 0.6,
    max: 1.5,
  },
  {
    id: "homeEdge",
    label: "Home advantage",
    help: "How much more dangerous the side is at its own ground.",
    min: 0.8,
    max: 1.3,
  },
];

/**
 * Never round a probability up to certainty or down to impossibility. 99.8%
 * displayed as "100%" claims the model rules out every other outcome, which it
 * does not — 4 of 2000 simulated seasons finished outside the top four.
 */
function formatProbability(p: number): string {
  // Even 2000 of 2000 is a sample, not a proof — the upper bound on the
  // unseen outcome is still around 0.15%. So certainty is never displayed.
  if (p >= 0.995) return ">99%";
  if (p <= 0.005) return "<1%";
  return `${(p * 100).toFixed(0)}%`;
}

/**
 * Percentage-point deltas. A real +0.2pp shift must not render as "+0pp",
 * which reads as "nothing changed".
 */
function formatPoints(delta: number): string {
  const pp = delta * 100;
  const sign = pp > 0 ? "+" : "−";
  const size = Math.abs(pp);
  if (size < 0.05) return "0pp";
  return `${sign}${size < 0.5 ? size.toFixed(1) : size.toFixed(0)}pp`;
}

export function SimulationLab() {
  const { club } = useClub();
  const [baseline, setBaseline] = useState<
    | { status: "loading" }
    | { status: "ready"; data: Baseline }
    | { status: "error"; message: string }
  >({ status: "loading" });
  const [dials, setDials] = useState<Adjustments>(NEUTRAL);
  const [pools, setPools] = useState<ScorerPools | null>(null);
  const [poolsError, setPoolsError] = useState<string | null>(null);
  const [outIds, setOutIds] = useState<Set<number>>(new Set());
  const [inIds, setInIds] = useState<Set<number>>(new Set());

  const clearTransfers = () => {
    setOutIds(new Set());
    setInIds(new Set());
  };

  useEffect(() => {
    const controller = new AbortController();
    setBaseline({ status: "loading" });
    setDials(NEUTRAL);
    setPools(null);
    setPoolsError(null);
    clearTransfers();

    fetch(`/api/league-baseline?club=${encodeURIComponent(club.id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Request failed");
        setBaseline({ status: "ready", data: body as Baseline });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setBaseline({
          status: "error",
          message: error instanceof Error ? error.message : "Request failed",
        });
      });

    return () => controller.abort();
  }, [club.id]);

  // Scorer pools depend on the baseline's season, so they load after it.
  useEffect(() => {
    if (baseline.status !== "ready") return;
    const controller = new AbortController();

    fetch(
      `/api/league-scorers?club=${encodeURIComponent(club.id)}&season=${baseline.data.season}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          // A missing scorer list costs the Transfer Lab but not the model, so
          // this stays local — it must still say something, though. Leaving
          // pools null showed a skeleton that never resolved.
          setPoolsError(body.error ?? "Couldn't load scorers");
          return;
        }
        setPools(body as ScorerPools);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPoolsError(
          error instanceof Error ? error.message : "Couldn't load scorers",
        );
      });

    return () => controller.abort();
  }, [baseline, club.id]);

  const ratings = useMemo(
    () => (baseline.status === "ready" ? fitRatings(baseline.data) : null),
    [baseline],
  );

  const clubGoals =
    baseline.status === "ready"
      ? (baseline.data.teams.find((t) => t.id === baseline.data.clubTeamId)
          ?.goalsFor ?? 0)
      : 0;

  const effect = useMemo(() => {
    const squad = pools?.squad.filter((s) => outIds.has(s.id)) ?? [];
    const signings = pools?.market.filter((s) => inIds.has(s.id)) ?? [];
    const teamGoalsFor = (teamId: number) =>
      baseline.status === "ready"
        ? (baseline.data.teams.find((t) => t.id === teamId)?.goalsFor ?? 0)
        : 0;

    return transferEffect(
      clubGoals,
      squad.map((s) => ({ id: s.id, name: s.name, goals: s.goals, teamGoals: clubGoals })),
      signings.map((s) => ({
        id: s.id,
        name: s.name,
        goals: s.goals,
        teamGoals: teamGoalsFor(s.teamId),
      })),
    );
  }, [pools, outIds, inIds, clubGoals, baseline]);

  // Transfers and the form dial compose: the squad change sets the baseline
  // attacking level, the dial then flexes it for form and everything else.
  const effectiveDials: Adjustments = useMemo(
    () => ({ ...dials, attack: dials.attack * effect.attackMultiplier }),
    [dials, effect.attackMultiplier],
  );

  // 2000 seasons of a 380-match division runs in ~150ms, so this stays in
  // useMemo rather than a worker. Recomputes only when a dial actually moves.
  const adjusted = useMemo(
    () =>
      ratings && baseline.status === "ready"
        ? simulateSeason(ratings, baseline.data.clubTeamId, effectiveDials)
        : null,
    [ratings, baseline, effectiveDials],
  );

  const neutral = useMemo(
    () =>
      ratings && baseline.status === "ready"
        ? simulateSeason(ratings, baseline.data.clubTeamId, NEUTRAL)
        : null,
    [ratings, baseline],
  );

  if (baseline.status === "loading") {
    return (
      <div className="py-10" aria-live="polite">
        <span className="sr-only">Fitting the model to league data</span>
        <div aria-hidden className="h-64 animate-pulse rounded-2xl bg-ink-900" />
      </div>
    );
  }

  if (baseline.status === "error") {
    return (
      <p role="alert" className="my-10 rounded-2xl border border-ink-700 bg-ink-900 p-5 text-sm text-chalk-dim">
        Couldn&apos;t fit the model: {baseline.message}
      </p>
    );
  }

  const data = baseline.data;
  const actual = data.teams.find((t) => t.id === data.clubTeamId);
  const actualPosition = actual
    ? [...data.teams].sort((a, b) => b.points - a.points).findIndex((t) => t.id === data.clubTeamId) + 1
    : undefined;
  const dialsTouched = JSON.stringify(dials) !== JSON.stringify(NEUTRAL);
  const touched = dialsTouched || outIds.size > 0 || inIds.size > 0;

  return (
    <div className="space-y-4 py-8">
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      {/* Controls */}
      <section
        aria-labelledby="dials-heading"
        className="rounded-2xl border border-ink-800 bg-ink-900 p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="dials-heading" className="display-md text-chalk">
            Dials
          </h2>
          {dialsTouched && (
            <button
              type="button"
              onClick={() => setDials(NEUTRAL)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-ink-700 px-2.5 py-1 text-xs font-semibold text-chalk-dim transition-colors duration-150 hover:text-chalk"
            >
              <RotateCcw size={12} strokeWidth={2.5} aria-hidden />
              Reset
            </button>
          )}
        </div>

        <p className="mt-2 text-xs leading-relaxed text-chalk-faint">
          100% is exactly as {club.shortName} performed in {data.label}. Every
          other club stays at its measured rating, so the change you see is
          yours alone.
        </p>

        <div className="mt-5 space-y-5">
          {DIALS.map((dial) => (
            <Dial
              key={dial.id}
              label={dial.label}
              help={dial.help}
              min={dial.min}
              max={dial.max}
              value={dials[dial.id]}
              onChange={(v) => setDials((d) => ({ ...d, [dial.id]: v }))}
            />
          ))}
        </div>

        {/* When transfers are in play the dial alone no longer describes the
            attack, so show the composed figure rather than letting the two
            controls silently disagree. */}
        {effect.attackMultiplier !== 1 && (
          <p className="mt-5 flex items-baseline justify-between gap-2 border-t border-ink-800 pt-4 text-xs text-chalk-faint">
            <span>
              Effective attack — dial x squad
            </span>
            <span
              className="tabular text-sm font-bold"
              style={{ color: "var(--club-chart)" }}
            >
              {Math.round(effectiveDials.attack * 100)}%
            </span>
          </p>
        )}
      </section>

      {/* Outcomes */}
      <section
        aria-labelledby="outcomes-heading"
        className="rounded-2xl border border-ink-800 bg-ink-900 p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="outcomes-heading" className="display-md text-chalk">
            Outcomes
          </h2>
          <p className="eyebrow">
            {adjusted?.runs.toLocaleString("en-GB")} seasons
          </p>
        </div>

        {adjusted && neutral && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Title"
                value={formatProbability(adjusted.titleProbability)}
                delta={touched ? adjusted.titleProbability - neutral.titleProbability : null}
                format={formatPoints}
              />
              <StatTile
                label="Top four"
                value={formatProbability(adjusted.topFourProbability)}
                delta={touched ? adjusted.topFourProbability - neutral.topFourProbability : null}
                format={formatPoints}
              />
              <StatTile
                label="Mean points"
                value={adjusted.meanPoints.toFixed(1)}
                delta={touched ? adjusted.meanPoints - neutral.meanPoints : null}
                format={(d) => `${d > 0 ? "+" : ""}${d.toFixed(1)}`}
              />
              <StatTile
                label="Points range"
                value={`${adjusted.pointsLow}–${adjusted.pointsHigh}`}
                hint="5th–95th pct"
              />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-chalk">
                Where {club.shortName} finish
              </h3>
              <div className="mt-3">
                <PositionDistribution
                  probabilities={adjusted.positionProbabilities}
                  actualPosition={actualPosition}
                />
              </div>
            </div>
          </>
        )}

        <p className="mt-5 border-t border-ink-800 pt-4 text-xs leading-relaxed text-chalk-faint">
          Fitted to real {data.leagueName} {data.label} data: every club&apos;s
          goals scored and conceded, plus the division&apos;s measured home
          advantage ({data.homeGoalMean.toFixed(2)} goals at home vs{" "}
          {data.awayGoalMean.toFixed(2)} away). Goals are drawn from a Poisson
          model, which treats matches as independent and ignores injuries, form
          streaks and fixture congestion — a first-order model, not a forecast.
        </p>
      </section>
    </div>

    <TransferLab
      pools={pools}
      error={poolsError}
      outIds={outIds}
      inIds={inIds}
      onToggleOut={(id) =>
        setOutIds((prev) => {
          const next = new Set(prev);
          if (!next.delete(id)) next.add(id);
          return next;
        })
      }
      onToggleIn={(id) =>
        setInIds((prev) => {
          const next = new Set(prev);
          if (!next.delete(id)) next.add(id);
          return next;
        })
      }
      onClear={clearTransfers}
      effect={effect}
      clubShortName={club.shortName}
      seasonLabel={data.label}
    />
    </div>
  );
}

function Dial({
  label,
  help,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  help: string;
  min: number;
  max: number;
  value: number;
  onChange: (next: number) => void;
}) {
  const id = useIdSafe(label);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-chalk">
          {label}
        </label>
        <output
          htmlFor={id}
          className="tabular text-sm font-bold"
          style={{ color: "var(--club-chart)" }}
        >
          {Math.round(value * 100)}%
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-11 w-full cursor-pointer accent-[var(--club-chart)]"
      />
      <p className="text-xs leading-relaxed text-chalk-faint">{help}</p>
    </div>
  );
}

/** Stable id from the label — these are fixed, so no need for useId churn. */
function useIdSafe(label: string) {
  return `dial-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
}

function StatTile({
  label,
  value,
  delta,
  format,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  format?: (d: number) => string;
  hint?: string;
}) {
  const meaningful = delta != null && Math.abs(delta) > 0.0001;
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-850 p-3">
      <p className="eyebrow">{label}</p>
      <p className="tabular mt-1 text-2xl font-bold leading-none text-chalk">
        {value}
      </p>
      {meaningful && format ? (
        <p
          className={`tabular mt-1 text-xs font-semibold ${
            delta > 0 ? "text-live" : "text-warn"
          }`}
        >
          {format(delta)}
        </p>
      ) : (
        <p className="mt-1 text-xs text-chalk-faint">{hint ?? " "}</p>
      )}
    </div>
  );
}
