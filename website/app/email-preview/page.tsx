import type { Metadata } from "next";
import Link from "next/link";

/** Temporary dev index — remove or replace when previews are no longer needed. */
export const metadata: Metadata = {
  title: "Email previews",
  robots: { index: false, follow: false },
};

const PREVIEWS = [
  {
    href: "/email-preview/invitation",
    title: "Invitation",
    description:
      "Team/project invite — mirrors buildInvitationEmail in website/supabase/functions/notify-on-insert.",
  },
  {
    href: "/email-preview/confirm-signup",
    title: "Confirm signup",
    description:
      "Supabase auth — matches riskai/supabase/email-templates/confirm_signup.html.",
  },
] as const;

export default function EmailPreviewIndexPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-12 font-sans text-foreground">
      <div className="mx-auto max-w-lg">
        <p className="text-muted mb-2 text-sm font-medium">Temporary</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Email template previews</h1>
        <p className="text-muted mb-8 text-sm">Click a template to open its preview in the browser.</p>
        <ul className="flex flex-col gap-3">
          {PREVIEWS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-xl border border-border bg-background p-4 shadow-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <span className="font-medium">{item.title}</span>
                <span className="text-muted mt-1 block text-sm">{item.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
