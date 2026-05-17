import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  listFactorsIndicatesVerifiedTotp,
  totpFactorsFromListFactors,
  type MfaListFactorsLike,
} from "@visualify/app-shell";

export type { MfaListFactorsLike };
export { listFactorsIndicatesVerifiedTotp, totpFactorsFromListFactors };

export async function userHasMFAEnabled() {
  const supabase = supabaseBrowserClient();

  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    console.error("MFA list error:", error);
    return false;
  }

  return listFactorsIndicatesVerifiedTotp(data);
}
