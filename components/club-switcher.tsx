"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { CLUBS, clubsByLeague, type Club } from "@/lib/clubs";
import { useClub } from "@/components/club-provider";
import { ClubCrest } from "@/components/club-crest";

/**
 * Club selector, built as a real listbox rather than a styled <select> so the
 * options can carry crests, league grouping and stadium context. Keyboard
 * behaviour follows the ARIA listbox pattern: arrows move, Enter/Space commit,
 * Escape cancels and returns focus to the trigger.
 */
export function ClubSwitcher() {
  const { club, setClubId } = useClub();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const groups = clubsByLeague();
  // Flat order mirrors the rendered order, so arrow keys walk across league
  // headings without the caller having to think about grouping.
  const flat: Club[] = groups.flatMap((g) => g.clubs);

  function openMenu() {
    setActiveIndex(Math.max(0, flat.findIndex((c) => c.id === club.id)));
    setOpen(true);
  }

  function closeMenu(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function commit(index: number) {
    const next = flat[index];
    if (next) setClubId(next.id);
    closeMenu();
  }

  // Close on outside pointer down and on Escape from anywhere in the subtree.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the highlighted option in view during keyboard traversal.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (["Enter", " ", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        closeMenu();
        break;
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % flat.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(flat.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        break;
    }
  }

  return (
    <div ref={wrapperRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`Selected club: ${club.name}. Change club`}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        className="flex h-11 cursor-pointer items-center gap-2.5 rounded-pill border border-ink-700 bg-ink-850 pl-2 pr-3 transition-colors duration-200 hover:border-ink-600 hover:bg-ink-800"
      >
        <ClubCrest club={club} size={28} />
        <span className="hidden text-sm font-semibold sm:block">
          {club.shortName}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden
          className={`text-chalk-faint transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Select a club"
          aria-activedescendant={`${listboxId}-opt-${activeIndex}`}
          tabIndex={-1}
          className="absolute right-0 z-50 mt-2 max-h-[26rem] w-72 overflow-y-auto overscroll-contain rounded-2xl border border-ink-700 bg-ink-900 p-1.5 shadow-2xl shadow-black/60"
        >
          {groups.map((group) => (
            <li key={group.league.id} role="presentation">
              <div
                role="presentation"
                className="eyebrow px-2.5 pb-1 pt-2.5"
              >
                {group.league.name}
              </div>
              <ul role="group" aria-label={group.league.name}>
                {group.clubs.map((option) => {
                  const index = flat.indexOf(option);
                  const selected = option.id === club.id;
                  const active = index === activeIndex;
                  return (
                    <li
                      key={option.id}
                      id={`${listboxId}-opt-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={selected}
                      onClick={() => commit(index)}
                      onPointerEnter={() => setActiveIndex(index)}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors duration-150 ${
                        active ? "bg-ink-800" : ""
                      }`}
                    >
                      <ClubCrest club={option} size={26} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold leading-tight">
                          {option.shortName}
                        </span>
                        <span className="block truncate text-xs leading-tight text-chalk-faint">
                          Est. {option.founded} · {option.stadium}
                        </span>
                      </span>
                      {selected && (
                        <Check
                          size={16}
                          strokeWidth={2.5}
                          aria-hidden
                          style={{ color: "var(--club-accent)" }}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          <li role="presentation" className="eyebrow px-2.5 pb-1.5 pt-3">
            {CLUBS.length} clubs · 5 leagues
          </li>
        </ul>
      )}
    </div>
  );
}
