/** Primary domain for Visualify staff — internal tools and full catalog access. */
const VISUALIFY_STAFF_EMAIL_SUFFIX = "@visualify.com.au";

/** True when the signed-in user is Visualify staff (`@visualify.com.au`). */
export function isVisualifyStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(VISUALIFY_STAFF_EMAIL_SUFFIX);
}
