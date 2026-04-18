"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@visualify/design-system";
import { fetchDistinctLockedReportingMonthKeys } from "@/lib/db/lockedReportingMonths";
import { formatReportMonthLabel } from "@/lib/db/snapshots";
import {
  PORTFOLIO_REPORTING_MONTH_QUERY_PARAM,
  isValidReportingMonthYearKey,
} from "@/lib/reportingMonthSelection";

const ChevronIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="pointer-events-none shrink-0 text-[var(--ds-text-muted)]"
    aria-hidden
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const reportingMonthMenuItemClass =
  "block w-full cursor-pointer px-[var(--ds-space-4)] py-[var(--ds-space-2)] text-left text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] no-underline transition-[background-color,color] duration-150 ease-out " +
  "hover:bg-[var(--ds-surface-hover)] focus-visible:bg-[var(--ds-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

const reportingMonthTriggerClassName =
  "!h-9 !max-w-64 !min-w-0 !rounded-full !border-0 !py-0 !pl-3 !pr-2 !gap-2 !font-normal shadow-[var(--ds-shadow-sm)] !bg-[var(--ds-surface-muted)] hover:!bg-[var(--ds-surface-subtle)] active:!brightness-[0.98] [&_svg]:text-[var(--ds-text-secondary)] hover:[&_svg]:text-[var(--ds-text-primary)]";

export type PortfolioReportingMonthSelectProps = {
  /** Distinct months from locked reporting runs for this project only */
  projectId?: string;
  /** Distinct months from locked reporting runs across projects in this portfolio */
  portfolioId?: string;
};

export function PortfolioReportingMonthSelect({
  projectId,
  portfolioId,
}: PortfolioReportingMonthSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [monthKeys, setMonthKeys] = useState<string[] | null>(null);
  const [legacyLockedWithoutReportMonth, setLegacyLockedWithoutReportMonth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pid = projectId?.trim();
    const pfid = portfolioId?.trim();
    if (!pid && !pfid) {
      setMonthKeys([]);
      setLegacyLockedWithoutReportMonth(false);
      return;
    }
    let cancelled = false;
    void fetchDistinctLockedReportingMonthKeys({ projectId: pid, portfolioId: pfid }).then((result) => {
      if (!cancelled) {
        setMonthKeys(result.monthYearKeys);
        setLegacyLockedWithoutReportMonth(result.legacyLockedWithoutReportMonth);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, portfolioId]);

  const options = useMemo(() => {
    if (!monthKeys?.length) return [];
    return monthKeys.map((value) => ({
      value,
      label: formatReportMonthLabel(value),
    }));
  }, [monthKeys]);

  const optionValueSet = useMemo(() => new Set(options.map((o) => o.value)), [options]);

  const rawFromUrl = searchParams.get(PORTFOLIO_REPORTING_MONTH_QUERY_PARAM);
  const fromUrl = typeof rawFromUrl === "string" ? rawFromUrl.trim() : "";
  const selected =
    fromUrl && isValidReportingMonthYearKey(fromUrl) && optionValueSet.has(fromUrl)
      ? fromUrl
      : (options[0]?.value ?? "");

  useEffect(() => {
    if (monthKeys === null || monthKeys.length === 0) return;
    const raw = searchParams.get(PORTFOLIO_REPORTING_MONTH_QUERY_PARAM);
    const param = typeof raw === "string" ? raw.trim() : "";
    if (isValidReportingMonthYearKey(param) && monthKeys.includes(param)) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set(PORTFOLIO_REPORTING_MONTH_QUERY_PARAM, monthKeys[0]);
    router.replace(`${pathname}?${next.toString()}`);
  }, [monthKeys, pathname, router, searchParams]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  if (monthKeys === null) {
    return (
      <div
        className="h-9 min-w-[10.5rem] max-w-[16rem] animate-pulse rounded-full bg-[var(--ds-surface-muted)]"
        aria-hidden
      />
    );
  }

  if (monthKeys.length === 0) {
    return (
      <div className="flex min-w-0 items-center gap-[var(--ds-space-2)]">
        <span className="hidden shrink-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] sm:inline">
          Reporting month
        </span>
        <span className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
          {legacyLockedWithoutReportMonth
            ? "Reporting month not set (legacy lock)"
            : "No locked reporting yet"}
        </span>
      </div>
    );
  }

  const selectedLabel = options.find((o) => o.value === selected)?.label ?? "";

  return (
    <div className="flex min-w-0 items-center gap-[var(--ds-space-2)]">
      <span className="hidden shrink-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] sm:inline">
        Reporting month
      </span>
      <div className="relative flex min-w-0 items-center" ref={menuRef}>
        <Button
          type="button"
          variant="ghost"
          size="md"
          className={`${reportingMonthTriggerClassName} min-w-[10.5rem]`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Reporting month"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="min-w-0 flex-1 truncate text-left text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
            {selectedLabel}
          </span>
          <ChevronIcon />
        </Button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-[100] mt-[var(--ds-space-1)] min-w-full overflow-hidden rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-elevated)] py-[var(--ds-space-1)] shadow-[var(--ds-shadow-lg)]"
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="menuitem"
                className={reportingMonthMenuItemClass}
                onClick={() => {
                  setMenuOpen(false);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set(PORTFOLIO_REPORTING_MONTH_QUERY_PARAM, o.value);
                  router.push(`${pathname}?${params.toString()}`);
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
