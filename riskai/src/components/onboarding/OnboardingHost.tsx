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
  OPEN_PORTFOLIO_ONBOARDING_EVENT,
} from "@/lib/onboarding/types";
import { ProjectOnboardingCreateModal } from "./ProjectOnboardingCreateModal";
import { ProjectOnboardingInviteModal } from "./ProjectOnboardingInviteModal";
import { PortfolioOnboardingDetailModal } from "./PortfolioOnboardingDetailModal";
import { PortfolioOnboardingInviteModal } from "./PortfolioOnboardingInviteModal";
import { PortfolioSetupModal } from "./PortfolioSetupModal";
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
 * First-run onboarding: profile, then optional portfolio wizard (name → reporting → invite/skip).
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
  const [showPortfolioNameModal, setShowPortfolioNameModal] = useState(false);
  const [showPortfolioReportingModal, setShowPortfolioReportingModal] = useState(false);
  const [showPortfolioInviteModal, setShowPortfolioInviteModal] = useState(false);
  const [showProjectCreateModal, setShowProjectCreateModal] = useState(false);
  const [showProjectInviteModal, setShowProjectInviteModal] = useState(false);
  const [projectCreateInitialStep, setProjectCreateInitialStep] = useState<1 | 5>(1);
  const [projectPreferredPortfolioId, setProjectPreferredPortfolioId] = useState<string | null>(null);
  const [projectWizardId, setProjectWizardId] = useState<string | null>(null);
  const [portfolioWizardId, setPortfolioWizardId] = useState<string | null>(null);
  const [portfolioWizardName, setPortfolioWizardName] = useState("");
  /** When user returns from step 2, step 1 PATCHes name instead of POST create. */
  const [portfolioResumeForNameStep, setPortfolioResumeForNameStep] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [initialFirstName, setInitialFirstName] = useState("");
  const [initialLastName, setInitialLastName] = useState("");
  const [initialCompany, setInitialCompany] = useState("");
  const [initialRole, setInitialRole] = useState("");

  const resetPortfolioWizard = useCallback(() => {
    setPortfolioResumeForNameStep(null);
    setPortfolioWizardId(null);
    setPortfolioWizardName("");
    setShowPortfolioNameModal(false);
    setShowPortfolioReportingModal(false);
    setShowPortfolioInviteModal(false);
  }, []);

  const openPortfolioOnboardingModal = useCallback(() => {
    resetPortfolioWizard();
    setShowPortfolioNameModal(true);
  }, [resetPortfolioWizard]);

  const resetProjectWizard = useCallback(() => {
    setShowProjectCreateModal(false);
    setShowProjectInviteModal(false);
    setProjectCreateInitialStep(1);
    setProjectPreferredPortfolioId(null);
    setProjectWizardId(null);
  }, []);

  const openProjectOnboardingModal = useCallback((portfolioId?: string) => {
    resetProjectWizard();
    setProjectCreateInitialStep(1);
    setProjectPreferredPortfolioId(portfolioId?.trim() ? portfolioId.trim() : null);
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
    const onOpen = () => openPortfolioOnboardingModal();
    window.addEventListener(OPEN_PORTFOLIO_ONBOARDING_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PORTFOLIO_ONBOARDING_EVENT, onOpen);
  }, [openPortfolioOnboardingModal]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ portfolioId?: string }>).detail;
      openProjectOnboardingModal(detail?.portfolioId);
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

      if (searchParams.get("invite_accepted") === "1") {
        inviteAcceptedSuppressRef.current = true;
        const params = new URLSearchParams(searchParams.toString());
        params.delete("invite_accepted");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      }

      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const profileRow = await fetchPublicProfile(supabase, user.id);

      if (!isOnboardingProfileComplete(meta, profileRow)) {
        resetPortfolioWizard();
        resetProjectWizard();
        const settingsAppPath = riskaiPath("/settings");
        const onSettingsRoute =
          pathname === settingsAppPath || (pathname?.startsWith(`${settingsAppPath}/`) ?? false);
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
        setShowProfileModal(!onSettingsRoute);
        setReady(true);
        return;
      }

      setShowProfileModal(false);

      if (searchParams.get(ONBOARDING_PORTFOLIO_QP) === "1") {
        openPortfolioOnboardingModal();
        const params = new URLSearchParams(searchParams.toString());
        params.delete(ONBOARDING_PORTFOLIO_QP);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
        setReady(true);
        return;
      }

      if (inviteAcceptedSuppressRef.current) {
        resetPortfolioWizard();
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
    openPortfolioOnboardingModal,
    pathname,
    profileGateTick,
    resetProjectWizard,
    resetPortfolioWizard,
    router,
    searchParams,
  ]);

  const onProfileComplete = useCallback(() => {
    setShowProfileModal(false);
    router.refresh();
  }, [router]);

  const onDismissPortfolioSetup = useCallback(() => {
    resetPortfolioWizard();
    router.refresh();
  }, [resetPortfolioWizard, router]);

  const onDismissProjectSetup = useCallback(() => {
    resetProjectWizard();
    router.refresh();
  }, [resetProjectWizard, router]);

  const onBackFromPortfolioReporting = useCallback(() => {
    const id = portfolioWizardId;
    const name = portfolioWizardName;
    setShowPortfolioReportingModal(false);
    if (id && name) {
      setPortfolioResumeForNameStep({ id, name });
    }
    setShowPortfolioNameModal(true);
    router.refresh();
  }, [portfolioWizardId, portfolioWizardName, router]);

  const onPortfolioNameContinue = useCallback(
    async ({ id, name }: { id: string; name: string }) => {
      setPortfolioResumeForNameStep(null);
      setPortfolioWizardId(id);
      setPortfolioWizardName(name);
      setShowPortfolioNameModal(false);
      setShowPortfolioReportingModal(true);
      router.refresh();
    },
    [router],
  );

  const onPortfolioReportingContinue = useCallback(() => {
    setShowPortfolioReportingModal(false);
    setShowPortfolioInviteModal(true);
    router.refresh();
  }, [router]);

  const onBackFromPortfolioInvite = useCallback(() => {
    setShowPortfolioInviteModal(false);
    setShowPortfolioReportingModal(true);
    router.refresh();
  }, [router]);

  const onPortfolioWizardFinished = useCallback(() => {
    const id = portfolioWizardId;
    resetPortfolioWizard();
    if (id) {
      router.push(`${riskaiPath(`/portfolios/${id}`)}?onboarding_first_project=1`);
    }
    router.refresh();
  }, [portfolioWizardId, resetPortfolioWizard, router]);

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
      <PortfolioSetupModal
        open={showPortfolioNameModal}
        resumePortfolio={portfolioResumeForNameStep}
        onCreated={onPortfolioNameContinue}
        onDismiss={onDismissPortfolioSetup}
      />
      {portfolioWizardId ? (
        <PortfolioOnboardingDetailModal
          open={showPortfolioReportingModal}
          portfolioId={portfolioWizardId}
          onContinue={onPortfolioReportingContinue}
          onBack={onBackFromPortfolioReporting}
          onDismiss={onDismissPortfolioSetup}
        />
      ) : null}
      {portfolioWizardId ? (
        <PortfolioOnboardingInviteModal
          open={showPortfolioInviteModal}
          portfolioId={portfolioWizardId}
          onFinished={onPortfolioWizardFinished}
          onBack={onBackFromPortfolioInvite}
          onDismiss={onDismissPortfolioSetup}
        />
      ) : null}
      <ProjectOnboardingCreateModal
        open={showProjectCreateModal}
        portfolioId={projectPreferredPortfolioId}
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
