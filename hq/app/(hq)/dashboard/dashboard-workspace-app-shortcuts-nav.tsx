"use client";

import type { MouseEvent, PointerEvent } from "react";
import type { WorkspaceAppNav } from "@/lib/dashboard-launcher-data";

function stopLauncherEventPropagation(event: MouseEvent | PointerEvent) {
  event.stopPropagation();
}

function InlineAppLauncherRow({ app }: { app: WorkspaceAppNav }) {
  const nameNode = app.launchHref ? (
    <a
      href={app.launchHref}
      target="_blank"
      rel="noopener noreferrer"
      className="ds-hq-workspace-launcher-tile__app-name"
      onClick={stopLauncherEventPropagation}
      onPointerDown={stopLauncherEventPropagation}
    >
      {app.productName}
    </a>
  ) : (
    <span className="ds-hq-workspace-launcher-tile__app-name">{app.productName}</span>
  );

  return (
    <p className="ds-hq-workspace-launcher-tile__app-line">
      {nameNode}
      {app.lines.map((line) => (
        <span key={line.label}>
          <span className="ds-hq-workspace-launcher-tile__app-sep" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <a
            href={line.href}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-hq-workspace-launcher-tile__app-count-link"
            onClick={stopLauncherEventPropagation}
            onPointerDown={stopLauncherEventPropagation}
          >
            {line.label}
          </a>
        </span>
      ))}
    </p>
  );
}

/** App shortcut rows inside a workspace launcher tile (client — link click isolation). */
export function WorkspaceAppShortcutsNav({
  apps,
  workspaceName,
}: {
  apps: WorkspaceAppNav[];
  workspaceName: string;
}) {
  if (apps.length === 0) return null;

  return (
    <nav
      className="ds-hq-workspace-launcher-tile__apps"
      aria-label={`Apps in ${workspaceName}`}
      onClick={stopLauncherEventPropagation}
      onPointerDown={stopLauncherEventPropagation}
    >
      <ul className="ds-hq-workspace-launcher-tile__apps-list">
        {apps.map((app) => (
          <li key={app.productKey} className="min-w-0">
            <InlineAppLauncherRow app={app} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
