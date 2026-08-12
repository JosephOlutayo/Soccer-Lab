import { Play } from "lucide-react";
import { PlaceholderPanel, SectionHero } from "@/components/shell-ui";
import { SimulationLab } from "@/components/simulation-lab";

const ICON = { size: 18, strokeWidth: 2.25, "aria-hidden": true } as const;

export default function SimulationPage() {
  return (
    <>
      <SectionHero eyebrow="The Simulation">
        Move the dials and re-run the season against a Poisson model fitted to
        real league data — every club&apos;s scoring record and the division&apos;s
        measured home advantage.
      </SectionHero>

      <SimulationLab />

      {/* The Transfer Lab placeholder that used to sit here has been removed —
          it shipped, and left a second "Transfer Lab" heading on the page. */}
      <div className="grid gap-4 border-t border-ink-800 py-10 sm:grid-cols-2">
        <PlaceholderPanel
          icon={<Play {...ICON} />}
          title="Match-by-match"
          step="Later"
        >
          Drill into a single simulated season: the fixture list it produced,
          and which results swung the title.
        </PlaceholderPanel>
      </div>
    </>
  );
}
