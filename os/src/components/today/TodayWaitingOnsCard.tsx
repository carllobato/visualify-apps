"use client";

import { useState } from "react";
import { formatStreamRelatedDate } from "@/components/streams/stream-related-format";
import type { TodayStreamFilter } from "@/lib/today-stream-filter";
import type { TodayWaitingOn } from "@/lib/today-data";

type TodayWaitingOnsCardProps = {
  waitingOns: TodayWaitingOn[];
  visibleLimit?: number;
  streamFilter: TodayStreamFilter;
  projectNamesById: Record<string, string>;
  streamNamesById: Record<string, string>;
  embedded?: boolean;
};

export function TodayWaitingOnsCard({
  waitingOns,
  visibleLimit = 4,
  streamFilter,
  projectNamesById,
  streamNamesById,
  embedded = false,
}: TodayWaitingOnsCardProps) {
  const focused = streamFilter.kind === "stream";
  const [expanded, setExpanded] = useState(false);
  const visibleWaitingOns = waitingOns.slice(0, visibleLimit);
  const mostUrgent = waitingOns.find((item) => item.expectedResponseAt) ?? waitingOns[0] ?? null;
  const urgentDate = mostUrgent ? formatStreamRelatedDate(mostUrgent.expectedResponseAt) : null;
  const summaryText =
    waitingOns.length === 1 ? "1 active waiting-on" : `${waitingOns.length} active waiting-ons`;

  return (
    <section className={`os-today-secondary ${embedded ? "os-today-secondary--embedded" : ""}`}>
      <h2 className="os-today-secondary__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
        Waiting on
      </h2>
      <div className="os-today-secondary__body">
        {waitingOns.length > 0 ? (
          <div className="os-today-waiting__content">
            <div className="os-today-waiting__summary-row">
              <div className="min-w-0">
                <p className="os-today-waiting__summary text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                  {summaryText}
                </p>
                {mostUrgent ? (
                  <p className="os-today-waiting__summary-meta text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                    {urgentDate ? `Next expected ${urgentDate}: ` : "Keep visible: "}
                    <span className="os-today-waiting__summary-item">{mostUrgent.title}</span>
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="os-today-waiting__toggle"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                aria-label={expanded ? "Hide waiting-ons list" : "Show waiting-ons list"}
              >
                {expanded ? "Hide" : "Show"}
              </button>
            </div>

            {expanded ? (
              <ul className="flex flex-col divide-y divide-[color-mix(in_oklab,var(--ds-border)_55%,transparent)] max-md:divide-y-0">
                {visibleWaitingOns.map((item) => {
                  const projectId = item.projectId?.trim();
                  const streamId = item.streamId?.trim();
                  const projectName = projectId ? projectNamesById[projectId] : null;
                  const streamName = streamId ? streamNamesById[streamId] : null;
                  const expectedDate = formatStreamRelatedDate(item.expectedResponseAt);

                  const contextParts: string[] = [];
                  if (item.waitingOnName?.trim()) contextParts.push(item.waitingOnName.trim());
                  if (projectName) contextParts.push(projectName);
                  if (streamName) contextParts.push(streamName);
                  if (expectedDate) contextParts.push(`Expected ${expectedDate}`);

                  return (
                    <li
                      className="os-today-row os-today-waiting-row py-3 first:pt-0 last:pb-0 max-md:py-0"
                      key={item.id}
                    >
                      <div className="os-today-row__body">
                        <p className="os-today-row__title break-words text-[length:var(--ds-text-sm)] font-medium leading-snug text-[var(--ds-text-primary)]">
                          {item.title}
                        </p>
                        {contextParts.length > 0 ? (
                          <p className="os-today-row__meta text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-secondary)]">
                            {contextParts.join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="os-today-empty-state">
            <p className="os-today-empty-state__title text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
              {focused ? "No active waiting-ons in this stream" : "No active waiting-ons"}
            </p>
            <p className="os-today-empty-state__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
              {focused
                ? "Switch focus to view other follow-ups."
                : "Follow-ups that need a response will appear here."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
