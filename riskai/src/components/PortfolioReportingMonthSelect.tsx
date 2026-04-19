"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSyncUrlSearchParams } from "@/hooks/useSyncUrlSearchParams";
import { Button } from "@visualify/design-system";
import { fetchDistinctLockedReportingMonthKeys } from "@/lib/db/lockedReportingMonths";
import { formatReportMonthLabel } from "@/lib/db/snapshots";
import {
  PORTFOLIO_REPORTING_MONTH_QUERY_PARAM,
  UNPUBLISHED_REPORTING_MONTH_PARAM_VALUE,
  isUnpublishedReportingMonthParamValue,
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
    className="pointer-events-none shrink-0"
    aria-hidden
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export type PortfolioReportingMonthSelectProps = {
  /** Distinct months from locked reporting runs for this project only */
  projectId?: string;
  /** Distinct months from locked reporting runs across projects in this portfolio */
  portfolioId?: string;
  /** Project overview only: adds an `Unpublished` value to the same `reportingMonth` query param. */
  showUnpublishedOption?: boolean;
  /** Request query string (with `?`); from `headers().get("x-url-search")` for SSR alignment */
  initialUrlSearch?: string;
};

export function PortfolioReportingMonthSelect({
  projectId,
  portfolioId,
  showUnpublishedOption = false,
  initialUrlSearch = "",
}: PortfolioReportingMonthSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSyncUrlSearchParams(initialUrlSearch);
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
    if (monthKeys === null) return [];
    const locked = monthKeys.map((value) => ({
      value,
      label: formatReportMonthLabel(value),
    }));
    const pid = projectId?.trim();
    if (showUnpublishedOption && pid) {
      if (monthKeys.length === 0) {
        return [{ value: UNPUBLISHED_REPORTING_MONTH_PARAM_VALUE, label: "Unpublished" }];
      }
      return [
        ...locked,
        { value: UNPUBLISHED_REPORTING_MONTH_PARAM_VALUE, label: "Unpublished" },
      ];
    }
    if (!monthKeys.length) return [];
    return locked;
  }, [monthKeys, showUnpublishedOption, projectId]);

  const optionValueSet = useMemo(() => new Set(options.map((o) => o.value)), [options]);

  const rawFromUrl = searchParams.get(PORTFOLIO_REPORTING_MONTH_QUERY_PARAM);
  const fromUrl = typeof rawFromUrl === "string" ? rawFromUrl.trim() : "";
  const selected =
    fromUrl &&
    optionValueSet.has(fromUrl) &&
    (isValidReportingMonthYearKey(fromUrl) ||
      (showUnpublishedOption && isUnpublishedReportingMonthParamValue(fromUrl)))
      ? fromUrl
      : (options[0]?.value ?? "");

  useEffect(() => {
    if (monthKeys === null) return;
    const pid = projectId?.trim();
    const unpublishedOnly = monthKeys.length === 0 && showUnpublishedOption && !!pid;
    if (monthKeys.length === 0 && !unpublishedOnly) return;

    const raw = searchParams.get(PORTFOLIO_REPORTING_MONTH_QUERY_PARAM);
    const param = typeof raw === "string" ? raw.trim() : "";
    if (isValidReportingMonthYearKey(param) && monthKeys.includes(param)) return;
    if (showUnpublishedOption && pid && isUnpublishedReportingMonthParamValue(param)) return;

    const next = new URLSearchParams(searchParams.toString());
    const fallback = unpublishedOnly
      ? UNPUBLISHED_REPORTING_MONTH_PARAM_VALUE
      : (monthKeys[0] ?? UNPUBLISHED_REPORTING_MONTH_PARAM_VALUE);
    next.set(PORTFOLIO_REPORTING_MONTH_QUERY_PARAM, fallback);
    router.replace(`${pathname}?${next.toString()}`);
  }, [monthKeys, pathname, projectId, router, searchParams, showUnpublishedOption]);

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
      <div className="ds-app-menu-trigger-skeleton animate-pulse" aria-hidden />
    );
  }

  if (monthKeys.length === 0 && !(showUnpublishedOption && projectId?.trim())) {
    return (
      <div className="flex min-w-0 items-center gap-[var(--ds-space-2)]">
        <span className="hidden shrink-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] sm:inline">
          Report month:
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
        Report month:
      </span>
      <div className="relative flex min-w-0 items-center" ref={menuRef}>
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="ds-app-menu-trigger ds-app-menu-trigger--label-slot min-w-0"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Report month"
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
            className="absolute right-0 top-full z-[100] mt-[var(--ds-space-1)] ds-app-menu-dropdown ds-app-menu-dropdown--min-w-full"
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="menuitem"
                className="ds-app-menu-dropdown__item"
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
