"use client";

import { useClub } from "@/components/club-provider";
import { getLeague } from "@/lib/clubs";

/**
 * The page-level statement block. This is where the reference image's
 * oversized condensed type lands — one loud element per screen, with
 * everything around it kept quiet.
 */
export function SectionHero({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children?: React.ReactNode;
}) {
  const { club } = useClub();
  const league = getLeague(club.league);

  const facts = [
    { label: "Founded", value: String(club.founded) },
    { label: "Ground", value: club.stadium },
    { label: "Capacity", value: club.capacity.toLocaleString("en-GB") },
    { label: "League", value: league.name },
  ];

  return (
    <section className="relative border-b border-ink-800 py-10 sm:py-14">
      <p className="eyebrow">{eyebrow}</p>

      <h1 className="display-xl mt-3 text-chalk">
        {club.name}
        <span style={{ color: "var(--club-accent)" }}>.</span>
      </h1>

      {children && (
        <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-chalk-dim">
          {children}
        </p>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="eyebrow">{fact.label}</dt>
            <dd className="tabular mt-1 text-lg font-semibold leading-tight text-chalk">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * A slot for a feature that is scheduled but not built. It states what will go
 * here and which step delivers it, rather than faking a chart with invented
 * numbers — nothing on screen should imply data we do not have yet.
 */
export function PlaceholderPanel({
  icon,
  title,
  step,
  children,
}: {
  /**
   * An already-rendered icon element, not a component type. These panels are
   * used from Server Components, and a component function is not serializable
   * across the server/client boundary — a rendered element is.
   */
  icon: React.ReactNode;
  title: string;
  step: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-ink-800 bg-ink-900 p-5 transition-colors duration-200 hover:border-ink-700">
      <div className="flex items-start justify-between gap-3">
        <span
          className="grid size-9 place-items-center rounded-xl"
          style={{
            backgroundColor: "color-mix(in oklab, var(--club-accent) 16%, transparent)",
            color: "var(--club-accent)",
          }}
        >
          {icon}
        </span>
        <span className="eyebrow pt-1">{step}</span>
      </div>

      <h2 className="display-md mt-4 text-chalk">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-chalk-dim">{children}</p>
    </article>
  );
}
