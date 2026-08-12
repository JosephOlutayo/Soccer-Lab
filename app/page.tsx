import { SectionHero } from "@/components/shell-ui";
import { LiveTracker } from "@/components/live-tracker";
import { SeasonTimeline } from "@/components/season-timeline";
import { LandmarkTimeline } from "@/components/landmark-timeline";

export default function HistoryHubPage() {
  return (
    <>
      <SectionHero eyebrow="History & Live Hub">
        One timeline running backwards: what is happening now, then the league
        record season by season, then curated landmarks to the founding.
      </SectionHero>

      {/* Ordered newest-first, so scrolling down travels back in time. */}
      <LiveTracker />
      <SeasonTimeline />
      <LandmarkTimeline />
    </>
  );
}
