/**
 * Phase 1D — opt-in flag for the future RiskAI `@visualify/app-shell` rail/frame migration.
 *
 * Default is off. Enable only for migration testing:
 * `NEXT_PUBLIC_RISKAI_ENABLE_APP_SHELL=1` (see `riskai/.env.example`).
 *
 * Not wired into `ProtectedShell` yet; consumers should branch on {@link RISKAI_ENABLE_APP_SHELL}
 * when the migration is ready.
 */
export const RISKAI_ENABLE_APP_SHELL =
  process.env.NEXT_PUBLIC_RISKAI_ENABLE_APP_SHELL === "1";
