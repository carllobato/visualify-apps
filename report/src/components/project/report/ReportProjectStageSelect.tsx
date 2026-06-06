"use client";

import { useEffect, useRef, useState } from "react";
import { dsNativeSelectFieldClassName } from "@visualify/design-system";
import {
  REPORT_PROJECT_STAGES,
  type ReportProjectStage,
} from "@/lib/projects/report-project-stages";

function IconChevronDownSubtle() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-[color-mix(in_oklab,var(--ds-text-secondary)_58%,transparent)] opacity-[0.85]"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ReportProjectStageSelectProps = {
  id: string;
  value: ReportProjectStage;
  onChange: (value: ReportProjectStage) => void;
  disabled?: boolean;
};

export function ReportProjectStageSelect({
  id,
  value,
  onChange,
  disabled = false,
}: ReportProjectStageSelectProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="relative w-full min-w-0" ref={wrapRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        aria-label="Project stage"
        className={`${dsNativeSelectFieldClassName(false)} flex items-center justify-between gap-2 text-left`}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="min-w-0 flex-1 truncate">{value}</span>
        <IconChevronDownSubtle />
      </button>

      {menuOpen ? (
        <div
          role="listbox"
          aria-labelledby={id}
          className="absolute inset-x-0 top-full z-[100] mt-[var(--ds-space-1)] w-full min-w-0 ds-app-menu-dropdown ds-app-menu-dropdown--min-w-full"
        >
          {REPORT_PROJECT_STAGES.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              className="ds-app-menu-dropdown__item text-left"
              onClick={() => {
                onChange(option);
                setMenuOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
