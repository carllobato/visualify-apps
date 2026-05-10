"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, Tab, Tabs } from "@visualify/design-system";

type WorkspaceOverviewTab = "apps" | "users" | "billing" | "settings";

const cardClass =
  "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

export function WorkspaceOverviewTabs() {
  const [activeTab, setActiveTab] = useState<WorkspaceOverviewTab>("apps");

  return (
    <>
      <div className="mb-4 border-b border-[var(--ds-border)]">
        <Tabs>
          <Tab active={activeTab === "apps"} onClick={() => setActiveTab("apps")}>
            Apps
          </Tab>
          <Tab active={activeTab === "users"} onClick={() => setActiveTab("users")}>
            Users
          </Tab>
          <Tab active={activeTab === "billing"} onClick={() => setActiveTab("billing")}>
            Billing
          </Tab>
          <Tab active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>
            Settings
          </Tab>
        </Tabs>
      </div>

      {activeTab === "apps" ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Apps</h2>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            <p className="mb-4 text-sm text-[var(--ds-text-secondary)]">
              Open product apps provisioned for this workspace.
            </p>
            <Link
              href="/apps"
              className="inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]"
            >
              Go to Apps
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "users" ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Users</h2>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            <p className="mb-4 text-sm text-[var(--ds-text-secondary)]">
              Manage people, invitations, and roles for this workspace.
            </p>
            <Link
              href="/users"
              className="inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]"
            >
              Go to Users
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "billing" ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Billing</h2>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            <p className="mb-4 text-sm text-[var(--ds-text-secondary)]">
              Review subscriptions, payment method, and invoices for this workspace.
            </p>
            <Link
              href="/billing"
              className="inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]"
            >
              Go to Billing
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "settings" ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Settings</h2>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            <p className="text-sm text-[var(--ds-text-secondary)]">
              Workspace preferences and controls are not available yet.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
