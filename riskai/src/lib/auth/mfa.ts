import { supabaseBrowserClient } from "@/lib/supabase/browser";

export type MfaListFactorsLike = {
  all?: { factor_type?: string; status?: string }[];
  totp?: { factor_type?: string; status?: string }[];
};

/** TOTP rows from `totp`, or from `all` when `totp` is empty (Supabase quirk). */
export function totpFactorsFromListFactors(data: MfaListFactorsLike | null | undefined) {
  if (!data) return [];
  const rawTotp = data.totp ?? [];
  const all = data.all ?? [];
  return rawTotp.length > 0 ? rawTotp : all.filter((f) => f.factor_type === "totp");
}

/** True when the user has at least one TOTP factor that counts as enrolled (verified, or legacy without status). */
export function listFactorsIndicatesVerifiedTotp(data: MfaListFactorsLike | null | undefined): boolean {
  const list = totpFactorsFromListFactors(data);
  if (list.length === 0) return false;
  const allHaveStatus = list.every((f) => typeof f.status === "string");
  if (allHaveStatus) {
    return list.some((f) => f.status === "verified");
  }
  return true;
}

export async function userHasMFAEnabled() {
  const supabase = supabaseBrowserClient();

  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    console.error("MFA list error:", error);
    return false;
  }

  return listFactorsIndicatesVerifiedTotp(data);
}
