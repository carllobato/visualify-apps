"use client";

import Link from "next/link";
import { formatStreamRelatedDate } from "@/components/streams/stream-related-format";
import { OS_ROUTES } from "@/lib/os-routes";
import type { OsWaitingOn } from "@/lib/os/waiting-ons-data";

type ProjectWaitingOnRowProps = {
  waitingOn: OsWaitingOn;
};

export function ProjectWaitingOnRow({ waitingOn }: ProjectWaitingOnRowProps) {
  const description = waitingOn.description?.trim();
  const waitingOnName = waitingOn.waitingOnName?.trim();
  const expectedDate = formatStreamRelatedDate(waitingOn.expectedResponseAt);

  return (
    <li className="os-projects-task-list__item">
      <div className="os-projects-task-row os-projects-task-row--waiting-on">
        <div className="os-projects-task-row__body">
          <p className="os-projects-task-row__title">{waitingOn.title}</p>
          {description ? <p className="os-projects-task-row__description">{description}</p> : null}
          <p className="os-projects-task-row__meta">
            {waitingOnName ? (
              <span className="os-projects-task-row__waiting-contact">{waitingOnName}</span>
            ) : null}
            {waitingOnName && expectedDate ? (
              <span className="os-projects-task-row__meta-sep" aria-hidden>
                ·
              </span>
            ) : null}
            {expectedDate ? (
              <span className="os-projects-task-row__due">Expected {expectedDate}</span>
            ) : null}
            {(waitingOnName || expectedDate) && waitingOn.sourceInboxItemId ? (
              <span className="os-projects-task-row__meta-sep" aria-hidden>
                ·
              </span>
            ) : null}
            {waitingOn.sourceInboxItemId ? <Link href={OS_ROUTES.inbox}>From Inbox</Link> : null}
          </p>
        </div>
      </div>
    </li>
  );
}
