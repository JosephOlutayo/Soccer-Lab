"use client";

import { useId, useState } from "react";

/**
 * Probability of each finishing position — a single-series column chart.
 *
 * Single series by design: showing baseline and adjusted as two overlaid
 * series would need a validated categorical pair, and the deltas are already
 * carried numerically by the stat tiles. One series also means no legend is
 * required (the heading names it) and identity is never colour-alone.
 *
 * Marks use --club-chart, not --club-accent: the raw identity colour fails a
 * 3:1 contrast check against this surface for two clubs.
 */
export function PositionDistribution({
  probabilities,
  actualPosition,
}: {
  probabilities: number[];
  /** Where the club really finished last season, drawn as a reference line. */
  actualPosition?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const tableId = useId();
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(...probabilities, 0.0001);

  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        Probability of each final league position across the simulated seasons.
      </figcaption>

      {/* Plot. Bars are thin with a 2px surface gap, rounded only at the
          data-end, anchored to the baseline. */}
      <div className="relative flex h-44 items-end gap-[2px]">
        {probabilities.map((p, i) => {
          const position = i + 1;
          const active = hover === i;
          const isActual = actualPosition === position;
          return (
            <button
              key={position}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`Position ${position}: ${(p * 100).toFixed(1)} percent`}
              className="group relative flex h-full flex-1 cursor-pointer flex-col justify-end"
            >
              <span
                className="w-full rounded-t transition-[height,opacity] duration-200"
                style={{
                  height: `${Math.max(p / max, p > 0 ? 0.015 : 0) * 100}%`,
                  backgroundColor: "var(--club-chart)",
                  opacity: hover === null ? 1 : active ? 1 : 0.4,
                  outline: isActual ? "1px dashed var(--color-chalk-faint)" : undefined,
                  outlineOffset: 1,
                }}
              />
            </button>
          );
        })}

        {hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-ink-700 bg-ink-800 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
          >
            <span className="tabular font-bold text-chalk">
              {ordinal(hover + 1)}
            </span>
            <span className="tabular ml-2 text-chalk-dim">
              {(probabilities[hover] * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Axis: label only the anchors, not all twenty. */}
      <div className="mt-1.5 flex gap-[2px]">
        {probabilities.map((_, i) => (
          <span
            key={i}
            className="tabular flex-1 text-center text-[0.625rem] text-chalk-faint"
          >
            {i === 0 || (i + 1) % 5 === 0 ? i + 1 : ""}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-chalk-faint">
          Final position ·{" "}
          {actualPosition
            ? `dashed mark = actual ${ordinal(actualPosition)} last season`
            : "simulated"}
        </p>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          aria-controls={showTable ? tableId : undefined}
          className="cursor-pointer text-xs font-semibold text-chalk-dim underline underline-offset-2 hover:text-chalk"
        >
          {showTable ? "Hide" : "Show"} table
        </button>
      </div>

      {/* A chart alone is not screen-reader friendly; this is the text equivalent. */}
      {showTable && (
        <div id={tableId} className="mt-3 max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">
              Probability of each final league position
            </caption>
            <thead className="sticky top-0 bg-ink-900">
              <tr className="text-chalk-faint">
                <th scope="col" className="py-1 font-semibold">
                  Position
                </th>
                <th scope="col" className="py-1 text-right font-semibold">
                  Probability
                </th>
              </tr>
            </thead>
            <tbody className="tabular">
              {probabilities.map((p, i) => (
                <tr key={i} className="border-t border-ink-800">
                  <td className="py-1">{ordinal(i + 1)}</td>
                  <td className="py-1 text-right text-chalk-dim">
                    {(p * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}
