"use client";

import { useEffect, useRef, useState } from "react";
import { dsNativeSelectFieldClassName } from "@visualify/design-system";
import "./app-shell-app-menu.css";

export type AppShellHelpFeedbackAction = "issue" | "feature" | "question";

export type AppShellHelpFeedbackActionOption = {
  value: AppShellHelpFeedbackAction;
  label: string;
};

type AppShellHelpFeedbackActionSelectProps = {
  id: string;
  value: AppShellHelpFeedbackAction;
  options: readonly AppShellHelpFeedbackActionOption[];
  onChange: (value: AppShellHelpFeedbackAction) => void;
  disabled?: boolean;
};

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

/**
 * Mobile Help & Feedback action picker — matches Report custom dropdown pattern
 * ({@link ReportProjectReportingDateSelect} / {@link ReportProjectStageSelect}):
 * field trigger, chevron, `ds-app-menu-dropdown` listbox, selected state.
 */
export function AppShellHelpFeedbackActionSelect({
  id,
  value,
  options,
  onChange,
  disabled = false,
}: AppShellHelpFeedbackActionSelectProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const selectedLabel = selectedOption?.label ?? "Report an issue";

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (disabled) {
      setMenuOpen(false);
    }
  }, [disabled]);

  return (
    <div
      className="vf-app-shell-help-feedback-modal__action-field relative w-full min-w-0"
      ref={wrapRef}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        aria-label={`Feedback type, ${selectedLabel}`}
        className={`${dsNativeSelectFieldClassName(false)} flex items-center justify-between gap-2 text-left`}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <IconChevronDownSubtle />
      </button>

      {menuOpen ? (
        <div
          role="listbox"
          aria-labelledby={id}
          className="vf-app-shell-help-feedback-modal__action-menu absolute inset-x-0 top-full z-[100] mt-[var(--ds-space-1)] w-full min-w-0 ds-app-menu-dropdown ds-app-menu-dropdown--min-w-full"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={[
                  "ds-app-menu-dropdown__item text-left",
                  isSelected ? "ds-app-menu-dropdown__item--current" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  onChange(option.value);
                  setMenuOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
