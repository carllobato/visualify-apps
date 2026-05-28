"use client";

import Link from "next/link";
import { formatStreamRelatedDate } from "@/components/streams/stream-related-format";
import { OS_ROUTES } from "@/lib/os-routes";
import type { OsWaitingOn } from "@/lib/os/waiting-ons-data";

type ProjectWaitingOnBoardCardProps = {
  waitingOn: OsWaitingOn;
};

export function ProjectWaitingOnBoardCard({ waitingOn }: ProjectWaitingOnBoardCardProps) {
  const waitingOnName = waitingOn.waitingOnName?.trim();
  const expectedDate = formatStreamRelatedDate(waitingOn.expectedResponseAt);

  return (
    <article className="os-projects-board__card os-projects-board__card--waiting-on">
      <p className="os-projects-board__card-title">{waitingOn.title}</p>
      <p className="os-projects-board__card-meta">
        {waitingOnName ? (
          <span className="os-projects-board__card-priority">{waitingOnName}</span>
        ) : null}
        {waitingOnName && expectedDate ? (
          <span className="os-projects-board__card-meta-sep" aria-hidden>
            ·
          </span>
        ) : null}
        {expectedDate ? <span className="os-projects-board__card-due">Expected {expectedDate}</span> : null}
      </p>
      {waitingOn.sourceInboxItemId ? (
        <p className="os-projects-board__card-meta">
          <Link href={OS_ROUTES.inbox}>From Inbox</Link>
        </p>
      ) : null}
    </article>
  );
}
