/**
 * Onboarding metadata keys (Supabase `user.user_metadata`).
 * Name + company + optional job title (`role`) in `public.visualify_profiles`; step flags (+ legacy `role` copy) in metadata.
 * Keep step IDs stable so guided tours / checklists can layer on later.
 */
export const OnboardingMetaKey = {
  profileComplete: "onboarding_profile_complete",
  /** User chose to continue without creating a portfolio during onboarding. */
  portfolioSkipped: "onboarding_portfolio_skipped",
  /** First-run portfolio → project wizard finished (dashboard unlocked). */
  wizardComplete: "onboarding_wizard_complete",
  /** Optional job title / function — stored in metadata. */
  role: "role",
} as const;

/** Dispatched on `window` after first name / surname / company are saved (settings or welcome modal). */
export const ACCOUNT_PROFILE_UPDATED_EVENT = "riskai-account-profile-updated";

/** Query on `/riskai/dashboard` (and `/riskai/onboarding/portfolio` redirect): opens create-portfolio modal. */
export const ONBOARDING_PORTFOLIO_QP = "onboarding_portfolio";

/** Dispatched on `window` so in-app links can open the portfolio modal without navigation. */
export const OPEN_PORTFOLIO_ONBOARDING_EVENT = "riskai-open-portfolio-onboarding";
/** Dispatched on `window` so links can open project onboarding modal without navigation. */
export const OPEN_PROJECT_ONBOARDING_EVENT = "riskai-open-project-onboarding";

/** Future: drive checklist / product tours without renaming routes. */
export type OnboardingStepId = "profile" | "portfolio" | "dashboard";

/**
 * Shape of a portfolio row insert on the server. `product_id` is always the RiskAI
 * product from `public.visualify_products` (key = 'riskai'); clients do not send it.
 */
export type OnboardingPortfolioInsertPayload = {
  name: string;
  code?: string;
  product_id: string;
  owner_user_id: string;
};
