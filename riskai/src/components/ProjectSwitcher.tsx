"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchProjectsClient, type ProjectRow } from "@/lib/projects";
import { riskaiPath } from "@/lib/routes";
import { Callout } from "@visualify/design-system";

const ACTIVE_PROJECT_KEY = "activeProjectId";
const SUBPAGES = ["project-home", "risks", "run-data", "simulation", "health"] as const;
type Subpage = (typeof SUBPAGES)[number];

function parseProjectRoute(pathname: string): { projectId: string; subpage: Subpage } | null {
  if (typeof pathname !== "string") return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "riskai" || segments[1] !== "projects" || !segments[2]) return null;
  const projectId = segments[2];
  const third = segments[3];
  const subpage: Subpage = third && SUBPAGES.includes(third as Subpage) ? (third as Subpage) : "project-home";
  return { projectId, subpage };
}

const ChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

type ProjectSwitcherProps = { currentProjectId?: string | null };

export function ProjectSwitcher({ currentProjectId: currentProjectIdFromUrl }: ProjectSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectError, setNewProjectError] = useState<string | null>(null);
  const [newProjectLoading, setNewProjectLoading] = useState(false);
  const [activeFromStorage, setActiveFromStorage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const routeInfo = parseProjectRoute(pathname ?? "");
  const subpage = routeInfo?.subpage ?? "project-home";
  const currentProjectId =
    currentProjectIdFromUrl ?? activeFromStorage ?? (projects?.length ? projects[0].id : null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const result = await fetchProjectsClient();
    setLoading(false);
    if (result.ok) setProjects(result.projects);
    else setProjects([]);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Refetch projects when URL project id changes (e.g. after creating a project or switching) so switcher stays in sync.
  useEffect(() => {
    if (routeInfo?.projectId) loadProjects();
  }, [routeInfo?.projectId, loadProjects]);
  useEffect(() => {
    try {
      setActiveFromStorage(typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_PROJECT_KEY) : null);
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    if (!dropdownOpen && !modalOpen) return;
    try {
      setActiveFromStorage(typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_PROJECT_KEY) : null);
    } catch {
      // ignore
    }
  }, [dropdownOpen, modalOpen]);
  useEffect(() => {
    if (!dropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [dropdownOpen]);

  const currentProject = projects?.find((p) => p.id === currentProjectId);
  const displayName = currentProject?.name ?? "Project";
  const showDropdown = (projects?.length ?? 0) >= 1;
  const isOnProjectPage = !!routeInfo;
  const targetSubpage = currentProjectIdFromUrl && routeInfo ? routeInfo.subpage : "project-home";
  const buttonLabel = isOnProjectPage ? `Project: ${displayName}` : "Select project";
  const selectedProjectIdForList = isOnProjectPage ? currentProjectId : null;

  const selectProject = useCallback(
    (projectId: string) => {
      const id = typeof projectId === "string" && projectId !== "undefined" && projectId.trim() ? projectId : null;
      if (!id) return;
      try {
        window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
      } catch {
        // ignore
      }
      setActiveFromStorage(id);
      setDropdownOpen(false);
      const path =
        targetSubpage === "project-home"
          ? riskaiPath("/projects/" + id)
          : riskaiPath("/projects/" + id + "/" + targetSubpage);
      router.replace(path);
    },
    [targetSubpage, router]
  );

  const handleCreateProject = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setNewProjectError(null);
      const name = newProjectName.trim();
      if (!name) {
        setNewProjectError("Name is required.");
        return;
      }
      setNewProjectLoading(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        project?: { id: string };
        error?: string;
      };
      if (!res.ok || !json.project) {
        setNewProjectError(json.error?.trim() || (res.status === 401 ? "Not signed in." : "Could not create project."));
        setNewProjectLoading(false);
        return;
      }
      const newId = json.project.id;
      if (!newId) {
        setNewProjectError("Project created but could not get id.");
        setNewProjectLoading(false);
        return;
      }
      try {
        window.localStorage.setItem(ACTIVE_PROJECT_KEY, newId);
      } catch {
        // ignore
      }
      setModalOpen(false);
      setNewProjectName("");
      setNewProjectLoading(false);
      await loadProjects();
      router.replace(riskaiPath(`/projects/${newId}`));
    },
    [newProjectName, loadProjects, router]
  );

  if (loading) {
    return (
      <div className="h-8 w-32 rounded border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] animate-pulse" aria-hidden />
    );
  }

  if (!projects?.length) return null;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => showDropdown && setDropdownOpen((o) => !o)}
        aria-expanded={dropdownOpen}
        aria-haspopup="listbox"
        aria-label="Switch project"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--ds-radius-sm)] text-sm font-medium text-[var(--ds-text-secondary)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] hover:bg-[var(--ds-surface-hover)] transition-colors truncate max-w-[220px]"
      >
        <span className="truncate">{buttonLabel}</span>
        {showDropdown && <ChevronDown />}
      </button>

      {dropdownOpen && (
        <ul
          role="listbox"
          className="absolute right-0 top-full mt-1 min-w-[200px] max-h-64 overflow-auto rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-lg py-1 z-50"
        >
          {projects.map((p) => (
            <li key={p.id} role="option" aria-selected={p.id === selectedProjectIdForList}>
              <button
                type="button"
                onClick={() => selectProject(p.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)]"
              >
                {p.id === selectedProjectIdForList ? (
                  <span className="text-[var(--ds-status-success-fg)]" aria-hidden>
                    <CheckIcon />
                  </span>
                ) : (
                  <span className="w-[14px]" aria-hidden />
                )}
                <span className="truncate">{p.name || p.id}</span>
              </button>
            </li>
          ))}
          <li className="border-t border-[var(--ds-border)] mt-1 pt-1">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setModalOpen(true);
                setNewProjectError(null);
                setNewProjectName("");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text-primary)]"
            >
              <span className="w-[14px]" aria-hidden />
              + New project
            </button>
          </li>
        </ul>
      )}

      {modalOpen && (
        <div
          className="ds-modal-backdrop z-[100]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
        >
          <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-4 w-full max-w-sm shadow-lg">
            <h2 id="new-project-title" className="text-base font-semibold text-[var(--ds-text-primary)] mb-3">
              New project
            </h2>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full px-3 py-2 rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] text-sm"
                required
                disabled={newProjectLoading}
                autoFocus
              />
              {newProjectError && (
                <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
                  {newProjectError}
                </Callout>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setNewProjectError(null);
                  }}
                  className="px-3 py-1.5 rounded border border-[var(--ds-border)] text-sm font-medium hover:bg-[var(--ds-surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newProjectLoading}
                  className="px-3 py-1.5 rounded bg-[var(--ds-text-primary)] text-[var(--ds-text-inverse)] text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {newProjectLoading ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
