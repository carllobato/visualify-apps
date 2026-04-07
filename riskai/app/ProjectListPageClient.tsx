"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OpenProjectOnboardingLink } from "@/components/onboarding/OpenProjectOnboardingLink";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import type { ProjectRow } from "@/lib/projects";
import { fetchProjectsClient } from "@/lib/projects";
import { riskaiPath } from "@/lib/routes";
import { Callout, Card, CardBody } from "@visualify/design-system";
import { LoadingPlaceholder } from "@/components/ds/LoadingPlaceholder";

const PROJECTS_PATH = riskaiPath("/projects");

export function ProjectListPageClient() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = supabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (!user) {
        router.replace("/?next=" + encodeURIComponent(PROJECTS_PATH));
        return;
      }

      const result = await fetchProjectsClient();
      if (cancelled) return;
      if (!result.ok) {
        setStatus("error");
        return;
      }
      setProjects(result.projects);
      setStatus("ready");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === "loading") {
    return (
      <main className="mx-auto flex min-h-[40vh] w-full max-w-lg flex-col justify-center px-4 py-10">
        <LoadingPlaceholder label="Loading projects" />
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto flex min-h-[40vh] w-full max-w-lg flex-col justify-center px-4 py-10">
        <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
          Failed to load projects.
        </Callout>
        <Link
          href={PROJECTS_PATH}
          className="mt-3 text-center text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] underline hover:no-underline"
        >
          Try again
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-[var(--ds-text-primary)] mb-1">
        Projects
      </h1>
      <p className="text-sm text-[var(--ds-text-secondary)] mb-8">
        Your projects. Open one to manage risks or create a new project.
      </p>

      {projects.length === 0 ? (
        <Card variant="inset" className="text-center">
          <CardBody className="py-8">
            <p className="m-0 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)]">
              No projects yet
            </p>
            <p className="m-0 mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
              Create a project to manage risks and simulations.
            </p>
            <OpenProjectOnboardingLink
              className="mt-6 inline-flex h-9 items-center justify-center rounded-[var(--ds-radius-sm)] px-4 text-[length:var(--ds-text-sm)] font-medium no-underline transition-all duration-150 ease-out bg-[var(--ds-primary)] text-[var(--ds-primary-text)] shadow-[var(--ds-shadow-sm)] hover:brightness-[1.07] active:brightness-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
            >
              Create your first project
            </OpenProjectOnboardingLink>
          </CardBody>
        </Card>
      ) : (
        <>
          <ul className="space-y-2 mb-6">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={riskaiPath(`/projects/${p.id}`)}
                  className="block px-4 py-3 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] transition-colors"
                >
                  <span className="font-medium">{p.name || p.id}</span>
                </Link>
              </li>
            ))}
          </ul>
          <OpenProjectOnboardingLink
            className="inline-flex px-4 py-2 text-sm font-medium rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)]"
          >
            + New project
          </OpenProjectOnboardingLink>
        </>
      )}
    </main>
  );
}
