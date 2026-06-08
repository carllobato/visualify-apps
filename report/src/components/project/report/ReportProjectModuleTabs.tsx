"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tab, Tabs } from "@visualify/design-system";
import {
  REPORT_MODULE_MORE_TABS,
  REPORT_MODULE_PRIMARY_TABS,
  type ReportModuleTabId,
} from "@/components/project/report/report-module-tabs";

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

type ReportProjectModuleTabsProps = {
  activeTab: ReportModuleTabId;
  onTabChange: (tabId: ReportModuleTabId) => void;
};

type MoreMenuPosition = {
  top: number;
  left: number;
};

export function ReportProjectModuleTabs({
  activeTab,
  onTabChange,
}: ReportProjectModuleTabsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MoreMenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const moreTriggerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreTabActive = REPORT_MODULE_MORE_TABS.some((tab) => tab.id === activeTab);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const trigger = moreTriggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      left: rect.right,
    });
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();

    const onMove = () => updateMenuPosition();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [menuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        moreTriggerRef.current?.contains(target) ||
        moreMenuRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
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

  const tabClassName = "max-md:px-2 max-md:py-1.5";

  return (
    <Tabs
      className="h-10 !flex-nowrap !items-center max-md:w-max"
      aria-label="Report module views"
    >
      {REPORT_MODULE_PRIMARY_TABS.map((tab) => (
        <Tab
          key={tab.id}
          className={tabClassName}
          active={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </Tab>
      ))}

      <div ref={moreTriggerRef} className="inline-flex shrink-0">
        <Tab
          active={moreTabActive}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={`${tabClassName} inline-flex items-center gap-0.5`}
          onClick={() => setMenuOpen((open) => !open)}
        >
          More
          <IconChevronDownSubtle />
        </Tab>
      </div>

      {mounted && menuOpen && menuPosition
        ? createPortal(
            <div
              ref={moreMenuRef}
              role="menu"
              aria-label="More report module views"
              className="fixed z-[200] min-w-[8.5rem] -translate-x-full ds-app-menu-dropdown"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              {REPORT_MODULE_MORE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="menuitem"
                  aria-current={activeTab === tab.id ? "true" : undefined}
                  className="ds-app-menu-dropdown__item text-left"
                  onClick={() => {
                    onTabChange(tab.id);
                    setMenuOpen(false);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </Tabs>
  );
}
