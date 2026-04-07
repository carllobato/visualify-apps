/** Primary domain for Visualify staff — used to gate internal debug nav. */
const VISUALIFY_STAFF_EMAIL_SUFFIX = "@visualify.com.au";

export function isVisualifyStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(VISUALIFY_STAFF_EMAIL_SUFFIX);
}
