"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, Radio } from "lucide-react";
import { useClub } from "@/components/club-provider";
import type { LiveMatch, LiveState } from "@/lib/football-data";

type Payload = LiveState & { fetchedAt: string };

/** Fast while a match is running, slow otherwise — this is a quota budget. */
const POLL_LIVE_MS = 30_000;
const POLL_IDLE_MS = 300_000;

// Rendered in the viewer's own timezone, with the zone named — a fixture time
// that silently differs from the advertised kickoff is worse than no time.
const KICKOFF_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
});

export function LiveTracker() {
  const { club } = useClub();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: Payload }
    | { status: "error"; message: string }
  >({ status: "loading" });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (signal: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/live?club=${encodeURIComponent(club.id)}`,
          { signal, cache: "no-store" },
        );
        const body = await response.json();
        if (!response.ok) {
          // A rate limit is transient: say so plainly and keep the existing
          // scoreline on screen rather than replacing it with an error.
          if (response.status === 429) {
            setState((prev) =>
              prev.status === "ready"
                ? prev
                : { status: "error", message: body.error ?? "Rate limited" },
            );
            return false;
          }
          throw new Error(body.error ?? "Request failed");
        }
        setState({ status: "ready", data: body as Payload });
        return Boolean((body as Payload).live);
      } catch (error) {
        if (signal.aborted) return false;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Request failed",
        });
        return false;
      }
    },
    [club.id],
  );

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    const tick = async () => {
      // Don't burn quota polling a tab nobody is looking at.
      if (document.visibilityState === "visible") {
        const isLive = await load(controller.signal);
        if (controller.signal.aborted) return;
        timer.current = setTimeout(tick, isLive ? POLL_LIVE_MS : POLL_IDLE_MS);
      } else {
        timer.current = setTimeout(tick, POLL_IDLE_MS);
      }
    };

    tick();

    // Refresh immediately when the tab comes back, so a returning user never
    // reads a stale scoreline.
    const onVisible = () => {
      if (document.visibilityState === "visible") load(controller.signal);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      controller.abort();
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <section aria-labelledby="live-heading" className="py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="live-heading" className="display-md text-chalk">
          Live
        </h2>
        <p className="eyebrow">
          {state.status === "ready" && state.data.live
            ? "Updating every 30s"
            : "football-data.org"}
        </p>
      </div>

      {state.status === "loading" && (
        <div
          aria-hidden
          className="mt-5 h-32 animate-pulse rounded-2xl border border-ink-800 bg-ink-900"
        />
      )}

      {state.status === "error" && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-ink-700 bg-ink-900 p-5 text-sm text-chalk-dim"
        >
          Couldn&apos;t load live state: {state.message}
        </p>
      )}

      {state.status === "ready" && (
        <div aria-live="polite" className="mt-5">
          {state.data.live ? (
            <LiveCard match={state.data.live} />
          ) : (
            <NothingLive data={state.data} clubName={club.shortName} />
          )}
        </div>
      )}
    </section>
  );
}

function LiveCard({ match }: { match: LiveMatch }) {
  const paused = match.status === "PAUSED";
  return (
    <article
      className="rounded-2xl border p-5"
      style={{ borderColor: "var(--club-accent)" }}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-live opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-live" />
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-live">
          {paused ? "Half-time" : "Live"}
        </span>
        {match.minute != null && !paused && (
          <span className="tabular text-xs font-semibold text-chalk-dim">
            {match.minute}&apos;
          </span>
        )}
        <span className="eyebrow ml-auto">{match.competition}</span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Side name={match.home.name} crest={match.home.crest} align="right" />
        <p className="tabular font-display text-4xl font-bold leading-none text-chalk">
          {match.home.goals ?? 0}–{match.away.goals ?? 0}
        </p>
        <Side name={match.away.name} crest={match.away.crest} align="left" />
      </div>
    </article>
  );
}

function Side({
  name,
  crest,
  align,
}: {
  name: string;
  crest: string | null;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      {crest && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt="" width={28} height={28} className="size-7 shrink-0 object-contain" />
      )}
      <span className="truncate text-sm font-semibold text-chalk">{name}</span>
    </div>
  );
}

function NothingLive({ data, clubName }: { data: Payload; clubName: string }) {
  const next = data.upcoming[0];

  return (
    <div className="space-y-3">
      <article className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
        <div className="flex items-center gap-2">
          <Radio size={15} strokeWidth={2.25} aria-hidden className="text-chalk-faint" />
          <p className="text-sm text-chalk-dim">
            No {clubName} match in play.
          </p>
        </div>

        {next ? (
          <div className="mt-4">
            <p className="eyebrow">Next fixture</p>
            <p className="mt-1.5 text-lg font-bold text-chalk">
              {next.home.name} v {next.away.name}
            </p>
            <p className="tabular mt-1 text-sm text-chalk-dim">
              {KICKOFF_FORMAT.format(new Date(next.utcDate))} ·{" "}
              <Countdown iso={next.utcDate} />
            </p>
            <p className="eyebrow mt-1">{next.competition}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-chalk-faint">
            No fixtures scheduled in the next 30 days.
          </p>
        )}

        {data.lastResult && (
          <p className="mt-4 border-t border-ink-800 pt-3 text-xs text-chalk-faint">
            Last result: {data.lastResult.home.name}{" "}
            <span className="tabular font-semibold text-chalk-dim">
              {data.lastResult.home.goals}–{data.lastResult.away.goals}
            </span>{" "}
            {data.lastResult.away.name}
          </p>
        )}
      </article>

      {data.upcoming.length > 1 && (
        <div className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
          <h3 className="eyebrow flex items-center gap-1.5">
            <CalendarClock size={12} strokeWidth={2.5} aria-hidden />
            Coming up
          </h3>
          <ol className="mt-2.5 space-y-1">
            {data.upcoming.slice(1).map((match) => (
              <li
                key={match.id}
                className="grid grid-cols-[1fr_auto] items-baseline gap-3 rounded-lg px-1 py-1.5"
              >
                <span className="truncate text-sm text-chalk">
                  {match.home.name} v {match.away.name}
                </span>
                <span className="tabular text-xs text-chalk-faint">
                  {KICKOFF_FORMAT.format(new Date(match.utcDate))}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/**
 * Relative time to kickoff, recomputed on the client only. Rendering this on
 * the server would bake in a stale value and mismatch on hydration.
 */
function Countdown({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const format = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
    const update = () => {
      const diff = new Date(iso).getTime() - Date.now();
      const minutes = Math.round(diff / 60000);
      if (Math.abs(minutes) < 60) setLabel(format.format(minutes, "minute"));
      else if (Math.abs(minutes) < 60 * 24)
        setLabel(format.format(Math.round(minutes / 60), "hour"));
      else setLabel(format.format(Math.round(minutes / 1440), "day"));
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return <span suppressHydrationWarning>{label ?? "—"}</span>;
}
