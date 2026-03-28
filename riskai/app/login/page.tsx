import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAppHost } from "@/lib/host";
import { LoginPageShell } from "./LoginPageShell";

type LoginSearchParams = Record<string, string | string[] | undefined>;

/** Sign-in on the marketing host only; app host uses `/` (see app/page.tsx). */
export default async function LoginPage({ searchParams }: { searchParams: Promise<LoginSearchParams> }) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  if (isAppHost(host)) {
    const params = await searchParams;
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          sp.append(key, v);
        }
      } else {
        sp.append(key, value);
      }
    }
    const qs = sp.toString();
    redirect(qs ? `/?${qs}` : "/");
  }
  return <LoginPageShell />;
}
