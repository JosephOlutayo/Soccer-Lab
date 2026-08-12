"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CLUBS, DEFAULT_CLUB_ID, getClub, type Club } from "@/lib/clubs";

type ClubContextValue = {
  club: Club;
  setClubId: (id: string) => void;
};

const ClubContext = createContext<ClubContextValue | null>(null);

const STORAGE_KEY = "gunners-lab:club";

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const [clubId, setClubIdState] = useState(DEFAULT_CLUB_ID);

  // Restore after mount rather than during render: reading localStorage on the
  // server is impossible, and doing it in render would desync hydration.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && CLUBS.some((c) => c.id === stored)) {
      setClubIdState(stored);
    }
  }, []);

  const club = getClub(clubId);

  // Drive the accent through CSS custom properties on <html> so that plain CSS
  // (focus rings, ::selection, pseudo-elements) re-themes too — not just the
  // React tree.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--club-accent", club.accent);
    root.style.setProperty("--club-on-accent", club.onAccent);
    // Data marks use their own token: two clubs' identity colours are too dark
    // to clear 3:1 against the chart surface (PSG's navy manages only 1.82:1).
    root.style.setProperty("--club-chart", club.chartAccent ?? club.accent);
  }, [club.accent, club.onAccent, club.chartAccent]);

  const setClubId = useCallback((id: string) => {
    setClubIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = useMemo(() => ({ club, setClubId }), [club, setClubId]);

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub must be used inside <ClubProvider>");
  return ctx;
}
