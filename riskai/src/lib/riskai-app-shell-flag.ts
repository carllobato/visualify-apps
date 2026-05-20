/**
 * Phase 1D — opt-in flag for the future RiskAI `@visualify/app-shell` rail/frame migration.
 *
 * Default is off. Enable only for migration testing:
 * `NEXT_PUBLIC_RISKAI_ENABLE_APP_SHELL=1` (see `riskai/.env.example`).
 *
 * Wired in {@link ProtectedShell} and account settings padding; keep off in production until
 * staging sign-off (see App Shell rollout checklist).
 */
export const RISKAI_ENABLE_APP_SHELL =
  process.env.NEXT_PUBLIC_RISKAI_ENABLE_APP_SHELL === "1";
