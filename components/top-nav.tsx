"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, LineChart } from "lucide-react";
import { ClubSwitcher } from "@/components/club-switcher";
import { useClub } from "@/components/club-provider";
import { getLeague } from "@/lib/clubs";

const SECTIONS = [
  {
    href: "/",
    label: "History & Live Hub",
    shortLabel: "History",
    icon: LineChart,
  },
  {
    href: "/simulation",
    label: "The Simulation",
    shortLabel: "Simulation",
    icon: FlaskConical,
  },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const { club } = useClub();
  const league = getLeague(club.league);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6"
      >
        {/* Wordmark — the one place the display face runs at nav scale. */}
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-2 no-underline"
        >
          <span className="font-display text-xl font-bold uppercase tracking-tight text-chalk">
            Soccer
          </span>
          <span
            className="font-display text-xl font-bold uppercase tracking-tight"
            style={{ color: "var(--club-accent)" }}
          >
            Lab
          </span>
        </Link>

        {/* Section toggle. Centred on desktop, and the reason this bar exists. */}
        <div className="mx-auto hidden md:block">
          <SectionToggle pathname={pathname} />
        </div>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <div className="hidden text-right lg:block">
            <div className="eyebrow leading-tight">{league.name}</div>
            <div className="text-xs font-medium leading-tight text-chalk-dim">
              {club.stadium} · {club.capacity.toLocaleString("en-GB")}
            </div>
          </div>
          <ClubSwitcher />
        </div>
      </nav>

      {/* Below the md breakpoint the toggle gets its own full-width row rather
          than being squeezed — it is the primary navigation, not an accessory. */}
      <div className="border-t border-ink-800/60 px-4 py-2 md:hidden">
        <SectionToggle pathname={pathname} fullWidth />
      </div>
    </header>
  );
}

function SectionToggle({
  pathname,
  fullWidth = false,
}: {
  pathname: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-pill border border-ink-700 bg-ink-900 p-1 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {SECTIONS.map((section) => {
        const active =
          section.href === "/"
            ? pathname === "/"
            : pathname.startsWith(section.href);
        const Icon = section.icon;

        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            // h-11 below md keeps the touch target at 44px; the desktop bar
            // renders at md+ where a 36px mouse target is fine.
            className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill px-4 text-sm font-semibold whitespace-nowrap no-underline transition-colors duration-200 md:h-9 ${
              active ? "" : "text-chalk-dim hover:bg-ink-800 hover:text-chalk"
            }`}
            style={
              active
                ? {
                    backgroundColor: "var(--club-accent)",
                    color: "var(--club-on-accent)",
                  }
                : undefined
            }
          >
            <Icon size={16} strokeWidth={2.25} aria-hidden />
            <span className="sm:hidden">{section.shortLabel}</span>
            <span className="hidden sm:inline">{section.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
