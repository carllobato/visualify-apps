"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchPublicProfile } from "@/lib/profiles/profileDb";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { isOnboardingProfileComplete, isOnboardingWizardComplete } from "@/lib/onboarding/guards";
import {
  ACCOUNT_PROFILE_UPDATED_EVENT,
  OnboardingMetaKey,
  ONBOARDING_PORTFOLIO_QP,
  OPEN_PROJECT_ONBOARDING_EVENT,
  WORKSPACE_INVITE_ACCEPTED_QP,
  WORKSPACE_INVITE_WORKSPACE_ID_QP,
  WORKSPACE_SETUP_PORTFOLIO_QP,
  type OpenProjectOnboardingDetail,
} from "@/lib/onboarding/types";
import { ProjectOnboardingCreateModal } from "./ProjectOnboardingCreateModal";
import { ProjectOnboardingInviteModal } from "./ProjectOnboardingInviteModal";
import { ProfileSetupModal } from "./ProfileSetupModal";
import { riskaiPath } from "@/lib/routes";

async function fetchProjects(): Promise<{ id: string }[]> {
  try {
    const res = await fetch("/api/projects", { cache: "no-store" });
    const data = (await res.json()) as { projects?: { id: string }[] };
    return Array.isArray(data.projects) ? data.projects : [];
  } catch {
    return [];
  }
}

/**
 * First-run onboarding: profile, then project create/invite.
 */
export function OnboardingHost() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** Stays true after `invite_accepted=1` until the user navigates to a different pathname. */
  const inviteAcceptedSuppressRef = useRef(false);
  const prevPathnameRef = useRef<string | null>(null);
  const [profileGateTick, setProfileGateTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProjectCreateModal, setShowProjectCreateModal] = useState(false);
  const [showProjectInviteModal, setShowProjectInviteModal] = useState(false);
  const [projectCreateInitialStep, setProjectCreateInitialStep] = useState<1 | 5>(1);
  const [projectPreferredWorkspaceId, setProjectPreferredWorkspaceId] = useState<string | null>(null);
  const [projectWizardId, setProjectWizardId] = useState<string | null>(null);
  const [initialFirstName, setInitialFirstName] = useState("");
  const [initialLastName, setInitialLastName] = useState("");
  const [initialCompany, setInitialCompany] = useState("");
  const [initialRole, setInitialRole] = useState("");

  const resetProjectWizard = useCallback(() => {
    setShowProjectCreateModal(false);
    setShowProjectInviteModal(false);
    setProjectCreateInitialStep(1);
    setProjectPreferredWorkspaceId(null);
    setProjectWizardId(null);
  }, []);

  const openProjectOnboardingModal = useCallback((detail?: OpenProjectOnboardingDetail) => {
    resetProjectWizard();
    setProjectCreateInitialStep(1);
    const workspaceId = detail?.workspaceId?.trim() ?? "";
    setProjectPreferredWorkspaceId(workspaceId || null);
    setShowProjectCreateModal(true);
  }, [resetProjectWizard]);

  const markWizardCompleteIfHasProjects = useCallback(
    async (
      supabase: ReturnType<typeof supabaseBrowserClient>,
      projectCount: number,
      meta: Record<string, unknown> | undefined,
    ) => {
      if (projectCount === 0 || isOnboardingWizardComplete(meta)) return;
      await supabase.auth.updateUser({
        data: { [OnboardingMetaKey.wizardComplete]: true },
      });
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    const bump = () => setProfileGateTick((n) => n + 1);
    window.addEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, bump);
    return () => window.removeEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, bump);
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenProjectOnboardingDetail>).detail;
      openProjectOnboardingModal(detail);
    };
    window.addEventListener(OPEN_PROJECT_ONBOARDING_EVENT, onOpen as EventListener);
    return () => window.removeEventListener(OPEN_PROJECT_ONBOARDING_EVENT, onOpen as EventListener);
  }, [openProjectOnboardingModal]);

  useEffect(() => {
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      inviteAcceptedSuppressRef.current = false;
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = supabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) {
        if (!cancelled) setReady(true);
        return;
      }

      if (
        searchParams.get("invite_accepted") === "1" ||
        searchParams.get(WORKSPACE_INVITE_ACCEPTED_QP) === "1"
      ) {
        inviteAcceptedSuppressRef.current = true;
        const params = new URLSearchParams(searchParams.toString());
        params.delete("invite_accepted");
        params.delete(WORKSPACE_INVITE_ACCEPTED_QP);
        params.delete(WORKSPACE_SETUP_PORTFOLIO_QP);
        params.delete(WORKSPACE_INVITE_WORKSPACE_ID_QP);
        params.delete(ONBOARDING_PORTFOLIO_QP);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      }

      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const profileRow = await fetchPublicProfile(supabase, user.id);

      if (!isOnboardingProfileComplete(meta, profileRow)) {
        resetProjectWizard();
        const accountAppPath = riskaiPath("/account");
        const onAccountRoute =
          pathname === accountAppPath || (pathname?.startsWith(`${accountAppPath}/`) ?? false);
        setInitialFirstName(
          typeof profileRow?.first_name === "string"
            ? profileRow.first_name
            : typeof meta?.first_name === "string"
              ? meta.first_name
              : "",
        );
        setInitialLastName(
          typeof profileRow?.surname === "string"
            ? profileRow.surname
            : typeof meta?.last_name === "string"
              ? meta.last_name
              : "",
        );
        setInitialCompany(
          typeof profileRow?.company === "string"
            ? profileRow.company
            : typeof meta?.company === "string"
              ? meta.company
              : "",
        );
        setInitialRole(
          typeof profileRow?.role === "string"
            ? profileRow.role
            : typeof meta?.role === "string"
              ? meta.role
              : "",
        );
        setShowProfileModal(!onAccountRoute);
        setReady(true);
        return;
      }

      setShowProfileModal(false);

      if (searchParams.get(ONBOARDING_PORTFOLIO_QP) === "1") {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(ONBOARDING_PORTFOLIO_QP);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
        setReady(true);
        return;
      }

      if (inviteAcceptedSuppressRef.current) {
        resetProjectWizard();
        setReady(true);
        return;
      }

      if (isOnboardingWizardComplete(meta)) {
        setReady(true);
        return;
      }

      const projects = await fetchProjects();
      if (projects.length > 0) {
        await markWizardCompleteIfHasProjects(supabase, projects.length, meta);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    markWizardCompleteIfHasProjects,
    pathname,
    profileGateTick,
    resetProjectWizard,
    router,
    searchParams,
  ]);

  const onProfileComplete = useCallback(() => {
    setShowProfileModal(false);
    router.refresh();
  }, [router]);

  const onDismissProjectSetup = useCallback(() => {
    resetProjectWizard();
    router.refresh();
  }, [resetProjectWizard, router]);

  const onProjectCreateContinue = useCallback(
    async ({ id }: { id: string; name: string }) => {
      setProjectWizardId(id);
      setShowProjectCreateModal(false);
      setShowProjectInviteModal(true);
      router.refresh();
    },
    [router],
  );

  const onBackFromProjectInvite = useCallback(() => {
    setShowProjectInviteModal(false);
    setProjectCreateInitialStep(5);
    setShowProjectCreateModal(true);
    router.refresh();
  }, [router]);

  const onProjectWizardFinished = useCallback(() => {
    const id = projectWizardId;
    resetProjectWizard();
    if (id) {
      router.push(riskaiPath(`/projects/${id}`));
    }
    router.refresh();
  }, [projectWizardId, resetProjectWizard, router]);

  if (!ready) return null;

  return (
    <>
      <ProfileSetupModal
        open={showProfileModal}
        initialFirstName={initialFirstName}
        initialLastName={initialLastName}
        initialCompany={initialCompany}
        initialRole={initialRole}
        onComplete={onProfileComplete}
      />
      <ProjectOnboardingCreateModal
        open={showProjectCreateModal}
        workspaceId={projectPreferredWorkspaceId}
        initialStep={projectCreateInitialStep}
        onCreated={onProjectCreateContinue}
        onDismiss={onDismissProjectSetup}
      />
      {projectWizardId ? (
        <ProjectOnboardingInviteModal
          open={showProjectInviteModal}
          projectId={projectWizardId}
          onFinished={onProjectWizardFinished}
          onBack={onBackFromProjectInvite}
          onDismiss={onDismissProjectSetup}
        />
      ) : null}
    </>
  );
}
