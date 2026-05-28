"use client";

import { useState, type ReactNode } from "react";

type ProjectDetailTabsProps = {
  workPanel: ReactNode;
  kanbanPanel: ReactNode;
  managePanel: ReactNode;
};

type ProjectDetailTabId = "work" | "kanban" | "manage";

export function ProjectDetailTabs({ workPanel, kanbanPanel, managePanel }: ProjectDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<ProjectDetailTabId>("work");

  return (
    <section className="os-projects-detail-tabs" aria-label="Project sections">
      <div className="os-projects-detail-tabs__nav" role="tablist" aria-label="Project detail tabs">
        <button
          type="button"
          role="tab"
          id="os-projects-tab-work"
          aria-selected={activeTab === "work"}
          aria-controls="os-projects-panel-work"
          className={`os-projects-detail-tabs__btn${activeTab === "work" ? " os-projects-detail-tabs__btn--active" : ""}`}
          onClick={() => setActiveTab("work")}
        >
          Work
        </button>
        <button
          type="button"
          role="tab"
          id="os-projects-tab-kanban"
          aria-selected={activeTab === "kanban"}
          aria-controls="os-projects-panel-kanban"
          className={`os-projects-detail-tabs__btn${activeTab === "kanban" ? " os-projects-detail-tabs__btn--active" : ""}`}
          onClick={() => setActiveTab("kanban")}
        >
          Kanban
        </button>
        <button
          type="button"
          role="tab"
          id="os-projects-tab-manage"
          aria-selected={activeTab === "manage"}
          aria-controls="os-projects-panel-manage"
          className={`os-projects-detail-tabs__btn${activeTab === "manage" ? " os-projects-detail-tabs__btn--active" : ""}`}
          onClick={() => setActiveTab("manage")}
        >
          Manage
        </button>
      </div>

      <div
        id="os-projects-panel-work"
        role="tabpanel"
        aria-labelledby="os-projects-tab-work"
        hidden={activeTab !== "work"}
        className="os-projects-detail-tabs__panel"
      >
        {workPanel}
      </div>

      <div
        id="os-projects-panel-kanban"
        role="tabpanel"
        aria-labelledby="os-projects-tab-kanban"
        hidden={activeTab !== "kanban"}
        className="os-projects-detail-tabs__panel"
      >
        {kanbanPanel}
      </div>

      <div
        id="os-projects-panel-manage"
        role="tabpanel"
        aria-labelledby="os-projects-tab-manage"
        hidden={activeTab !== "manage"}
        className="os-projects-detail-tabs__panel"
      >
        {managePanel}
      </div>
    </section>
  );
}
