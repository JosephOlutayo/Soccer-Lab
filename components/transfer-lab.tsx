"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Search, X } from "lucide-react";
import type { Scorer } from "@/lib/football-data";
import type { TransferEffect } from "@/lib/simulation";

export type ScorerPools = { season: number; squad: Scorer[]; market: Scorer[] };

/**
 * Named signings and departures, drawn from real scoring records.
 *
 * Selection state lives in the parent so the resulting attack multiplier can
 * feed straight into the simulation — this component renders and reports, it
 * does not own the model.
 */
export function TransferLab({
  pools,
  error,
  outIds,
  inIds,
  onToggleOut,
  onToggleIn,
  onClear,
  effect,
  clubShortName,
  seasonLabel,
}: {
  pools: ScorerPools | null;
  error: string | null;
  outIds: Set<number>;
  inIds: Set<number>;
  onToggleOut: (id: number) => void;
  onToggleIn: (id: number) => void;
  onClear: () => void;
  effect: TransferEffect;
  clubShortName: string;
  seasonLabel: string;
}) {
  const [query, setQuery] = useState("");

  const market = useMemo(() => {
    if (!pools) return [];
    const q = query.trim().toLowerCase();
    const matches = q
      ? pools.market.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.teamShortName.toLowerCase().includes(q),
        )
      : pools.market;
    // Always keep chosen signings visible, even when filtered out by search.
    const chosen = pools.market.filter((s) => inIds.has(s.id));
    const seen = new Set(chosen.map((s) => s.id));
    return [...chosen, ...matches.filter((s) => !seen.has(s.id))].slice(0, 60);
  }, [pools, query, inIds]);

  if (error) {
    return (
      <section
        aria-labelledby="transfers-heading"
        className="rounded-2xl border border-ink-800 bg-ink-900 p-5"
      >
        <h2 id="transfers-heading" className="display-md text-chalk">
          Transfer Lab
        </h2>
        <p role="alert" className="mt-3 text-sm text-chalk-dim">
          {error}. The simulation above is unaffected — it does not depend on
          player-level data.
        </p>
      </section>
    );
  }

  if (!pools) {
    return (
      <div className="h-64 animate-pulse rounded-2xl bg-ink-900" aria-hidden />
    );
  }

  const touched = outIds.size > 0 || inIds.size > 0;

  return (
    <section
      aria-labelledby="transfers-heading"
      className="rounded-2xl border border-ink-800 bg-ink-900 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="transfers-heading" className="display-md text-chalk">
          Transfer Lab
        </h2>
        <div className="flex items-center gap-3">
          <p className="eyebrow">Top scorers · {seasonLabel}</p>
          {touched && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-ink-700 px-2.5 py-1 text-xs font-semibold text-chalk-dim transition-colors duration-150 hover:text-chalk"
            >
              <X size={12} strokeWidth={2.5} aria-hidden />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* The running total — the one number that explains what the lists did. */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-xl border border-ink-800 bg-ink-850 px-4 py-3">
        <Figure label="Out" value={effect.goalsOut ? `−${effect.goalsOut}` : "0"} />
        <Figure
          label="In"
          value={effect.goalsIn ? `+${effect.goalsIn.toFixed(1)}` : "0"}
          hint={
            effect.goalsInRaw && Math.abs(effect.goalsIn - effect.goalsInRaw) > 0.05
              ? `${effect.goalsInRaw} raw, adjusted for context`
              : undefined
          }
        />
        <Figure
          label="Net goals"
          value={`${effect.netGoals > 0 ? "+" : ""}${effect.netGoals.toFixed(1)}`}
          strong
        />
        <Figure
          label="Attack"
          value={`${Math.round(effect.attackMultiplier * 100)}%`}
          hint={`from ${effect.baseGoals} scored`}
          strong
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {/* Departures */}
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-chalk">
            <ArrowUpRight size={15} strokeWidth={2.5} aria-hidden className="text-warn" />
            Sell from {clubShortName}
          </h3>
          <p className="mt-1 text-xs text-chalk-faint">
            {pools.squad.length} players from the division&apos;s top scorers.
          </p>
          <ul className="mt-2.5 space-y-1">
            {pools.squad.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                selected={outIds.has(player.id)}
                onToggle={() => onToggleOut(player.id)}
                tone="out"
              />
            ))}
            {pools.squad.length === 0 && (
              <li className="py-3 text-xs text-chalk-faint">
                No {clubShortName} players appear in the top-scorer list.
              </li>
            )}
          </ul>
        </div>

        {/* Signings */}
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-chalk">
            <ArrowDownLeft size={15} strokeWidth={2.5} aria-hidden className="text-live" />
            Sign from the division
          </h3>

          <div className="relative mt-1.5">
            <Search
              size={14}
              strokeWidth={2.25}
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-chalk-faint"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player or club"
              aria-label="Search players to sign"
              className="h-11 w-full rounded-xl border border-ink-700 bg-ink-850 pl-8 pr-3 text-sm text-chalk placeholder:text-chalk-faint focus:border-ink-600"
            />
          </div>

          <ul className="mt-2.5 max-h-80 space-y-1 overflow-y-auto overscroll-contain pr-1">
            {market.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                selected={inIds.has(player.id)}
                onToggle={() => onToggleIn(player.id)}
                tone="in"
                showTeam
              />
            ))}
            {market.length === 0 && (
              <li className="py-3 text-xs text-chalk-faint">
                No players match “{query}”.
              </li>
            )}
          </ul>
        </div>
      </div>

      <p className="mt-5 border-t border-ink-800 pt-4 text-xs leading-relaxed text-chalk-faint">
        Only the division&apos;s top 100 scorers are available on the free tier,
        so squad players with few goals cannot be moved and goalkeepers or
        defenders rarely appear. Incoming goals are scaled by the ratio of{" "}
        {clubShortName}&apos;s attacking output to the player&apos;s current
        club, because a forward&apos;s tally depends on the chances his team
        creates — but this still assumes he keeps his finishing rate and stays
        fit.
      </p>
    </section>
  );
}

function Figure({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p
        className={`tabular leading-none ${
          strong ? "mt-1 text-xl font-bold text-chalk" : "mt-1 text-lg font-semibold text-chalk-dim"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[0.625rem] text-chalk-faint">{hint}</p>}
    </div>
  );
}

function PlayerRow({
  player,
  selected,
  onToggle,
  tone,
  showTeam = false,
}: {
  player: Scorer;
  selected: boolean;
  onToggle: () => void;
  tone: "in" | "out";
  showTeam?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors duration-150 ${
          selected
            ? tone === "in"
              ? "border-live/50 bg-live/10"
              : "border-warn/50 bg-warn/10"
            : "border-transparent hover:bg-ink-850"
        }`}
      >
        {showTeam && player.teamCrest && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.teamCrest}
            alt=""
            width={18}
            height={18}
            loading="lazy"
            className="size-[18px] shrink-0 object-contain"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-chalk">
            {player.name}
          </span>
          <span className="tabular block truncate text-xs text-chalk-faint">
            {showTeam && `${player.teamShortName} · `}
            {player.playedMatches} apps · {player.assists} assists
          </span>
        </span>
        <span className="tabular shrink-0 text-right">
          <span className="block text-base font-bold leading-none text-chalk">
            {player.goals}
          </span>
          <span className="eyebrow">goals</span>
        </span>
      </button>
    </li>
  );
}
