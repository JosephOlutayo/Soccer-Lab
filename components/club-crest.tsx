import type { Club } from "@/lib/clubs";

/**
 * Identity mark for a club.
 *
 * Deliberately NOT a real crest: club badges are trademarked and their files
 * are not redistributable, so shipping guessed logo paths would be both broken
 * and a licensing problem. This renders the club's official colour with its
 * scoreboard code — recognisable, legally clean, and it never 404s. Swap the
 * internals for licensed assets later without touching any call site.
 */
export function ClubCrest({ club, size = 28 }: { club: Club; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[7px] font-display font-bold leading-none"
      style={{
        width: size,
        height: size,
        backgroundColor: club.accent,
        color: club.onAccent,
        fontSize: size * 0.4,
        letterSpacing: "0.02em",
      }}
    >
      {club.code}
    </span>
  );
}
