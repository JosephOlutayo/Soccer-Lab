"use client";

import { useClub } from "@/components/club-provider";
import {
  LANDMARK_LABELS,
  getLandmarks,
  type Landmark,
} from "@/lib/landmarks";

/**
 * The curated half of the page's single reverse-chronological spine. It picks
 * up where the live API data stops (2023/24) and runs back to the club's
 * founding, so scrolling down is always travelling further back in time.
 */
export function LandmarkTimeline() {
  const { club } = useClub();
  const landmarks = getLandmarks(club.id);

  return (
    <section aria-labelledby="landmarks-heading" className="pb-16">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="landmarks-heading" className="display-md text-chalk">
          Landmarks
        </h2>
        <p className="eyebrow">Curated · pre-2023</p>
      </div>

      {landmarks.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-ink-800 p-5 text-sm leading-relaxed text-chalk-dim">
          Landmarks haven&apos;t been curated for {club.name} yet. The live
          season record above still covers 2023/24 onward — add entries to{" "}
          <code className="text-chalk-faint">lib/landmarks.ts</code> to fill in
          the deep history.
        </p>
      ) : (
        <ol className="mt-6">
          {landmarks.map((landmark, index) => (
            <LandmarkRow
              key={`${landmark.year}-${landmark.title}`}
              landmark={landmark}
              isLast={index === landmarks.length - 1}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function LandmarkRow({
  landmark,
  isLast,
}: {
  landmark: Landmark;
  isLast: boolean;
}) {
  return (
    <li className="grid grid-cols-[3.75rem_1.5rem_1fr] gap-x-3 sm:grid-cols-[5rem_1.5rem_1fr] sm:gap-x-5">
      {/* Year sits in the display face at a size that carries the page. */}
      <span className="tabular pt-0.5 text-right font-display text-2xl font-bold leading-none text-chalk-dim sm:text-3xl">
        {landmark.year}
      </span>

      {/* The spine: a dot on a hairline that stops at the founding entry. */}
      <span aria-hidden className="relative flex justify-center">
        <span
          className="mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-ink-950"
          style={{ backgroundColor: "var(--club-accent)" }}
        />
        {!isLast && (
          <span className="absolute top-4 bottom-0 w-px bg-ink-800" />
        )}
      </span>

      <div className="pb-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-base font-bold leading-snug text-chalk">
            {landmark.title}
          </h3>
          <span className="eyebrow">{LANDMARK_LABELS[landmark.kind]}</span>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-chalk-dim">
          {landmark.detail}
        </p>
      </div>
    </li>
  );
}
