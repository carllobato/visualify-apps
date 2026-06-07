import { getProductOrigin, joinOriginPath } from "@visualify/urls";

/** HQ account settings path — matches `HQ_ROUTES.account` in the HQ app. */
const HQ_ACCOUNT_PATH = "/account";

/**
 * Absolute URL for HQ-managed account settings.
 * Origin resolves via `NEXT_PUBLIC_HQ_ORIGIN` or the `@visualify/urls` HQ default.
 */
export function getReportHqAccountSettingsUrl(): string {
  return joinOriginPath(getProductOrigin("hq"), HQ_ACCOUNT_PATH);
}
