import { redirect } from "next/navigation";
import {
  AccountSettingsPage,
  listFactorsIndicatesVerifiedTotp,
} from "@visualify/app-shell";
import { supabaseServerClient } from "@/lib/supabase/server";
import { ReportAccountSettingsClient } from "./report-account-settings-client";

export const dynamic = "force-dynamic";

/** Account route — canonical settings shell composition for Report. */
export default async function ReportAccountPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const firstName = (meta?.first_name as string | undefined) ?? null;
  const lastName = (meta?.last_name as string | undefined) ?? null;
  const company = (meta?.company as string | undefined) ?? null;
  const role = (meta?.role as string | undefined) ?? null;

  const { data: sessionRow, error: sessionError } = await supabase
    .from("visualify_user_sessions")
    .select("updated_at, last_seen_at, user_agent")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: mfaFactors, error: mfaError } = await supabase.auth.mfa.listFactors();
  const totpAlreadyEnabled = mfaError
    ? false
    : listFactorsIndicatesVerifiedTotp(mfaFactors ?? null);

  return (
    <AccountSettingsPage>
      <ReportAccountSettingsClient
        email={user.email ?? null}
        userId={user.id}
        firstName={firstName}
        lastName={lastName}
        company={company}
        role={role}
        totpAlreadyEnabled={totpAlreadyEnabled}
        sessionUpdatedAt={sessionError ? null : (sessionRow?.updated_at ?? null)}
        sessionLastSeenAt={sessionError ? null : (sessionRow?.last_seen_at ?? null)}
        sessionUserAgent={sessionError ? null : (sessionRow?.user_agent ?? null)}
      />
    </AccountSettingsPage>
  );
}
