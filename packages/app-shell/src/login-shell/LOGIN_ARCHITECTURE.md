# Login UI architecture (`@visualify/app-shell`)

Visualify product apps share one login **structure** from app-shell. Apps own auth logic and copy; they must not fork shell, card, or Suspense wrappers locally.

## Canonical component tree (login routes)

```
AppLoginScreen                    ← route shell (required)
  └── AppLoginCardSuspense        ← card + Suspense boundary (required)
        └── <AppLoginForm />      ← app-owned client component
              ├── AppLoginCardHeader
              ├── AppLoginTabsSection
              ├── <form> + appLoginFormClassName
              │     ├── fields (Input / AppLoginPasswordField)
              │     ├── AppLoginFormError
              │     ├── AppLoginSubmitRow
              │     ├── AppLoginTrustLine
              │     └── AppLoginCardLegalFooter
              └── …
```

`AppLoginScreen` already composes `AppLoginFramedShell` → `AppLoginPage` → copyright. Do not reassemble those for standard sign-in/sign-up pages.

## Public API tiers

### Canonical (use on every login route)

| Export | Role |
|--------|------|
| `AppLoginScreen` | Full-page login shell: framed canvas, rail brand, centered column, copyright |
| `AppLoginCardSuspense` | Card chrome + stable Suspense fallback (prevents layout shift) |
| `AppLoginCardHeader` | Card title / optional mark |
| `AppLoginTabsSection` | Sign in / Sign up tab row + divider |
| `AppLoginPasswordField` | Password + show/hide |
| `AppLoginFormError` | Inline errors |
| `AppLoginSubmitRow` | Primary submit button row |
| `appLoginSubmitLabelsForMode` | Sign-in vs sign-up button labels |
| `AppLoginTrustLine` | Security reassurance line |
| `AppLoginCardLegalFooter` | In-card privacy / terms row |
| `appLoginFormClassName` | Vertical rhythm between fields |
| `appLoginCardLegalLinkClassName` | Legal link styling when passing custom `Link` nodes |

### Low-level (special flows only — not standard login pages)

| Export | When to use |
|--------|-------------|
| `AppLoginFramedShell` | Non-login auth surfaces (e.g. MFA verify) that need the rail/frame but not the full login card |
| `AppLoginPage` | With `AppLoginFramedShell` when you need the centered column + copyright without `AppLoginScreen` |
| `AppLoginCard` | **Do not** use on login routes — use `AppLoginCardSuspense` |
| `AppLoginSuspenseFallback` | **Do not** import in apps — owned by `AppLoginCardSuspense` |
| `AppLoginCopyright` | Prefer `copyrightHolder` / `year` on `AppLoginScreen` |
| `appLogin*ClassName` tokens | Form/footer fine-tuning only — not for rebuilding shell or card |

### App-owned (stay in the product repo)

- Route `page.tsx` (redirects, `searchParams`, server errors)
- Client form component (Supabase, server actions, MFA redirect, invite `next`, etc.)
- Legal link targets (`Link`, `LegalDocumentLink`, hrefs)
- Product strings: `brandTitle`, `brandAriaLabel`, optional `copyrightHolder`

## Do not duplicate in apps

- `AppLoginCard` + `<Suspense fallback={…}>` — use `AppLoginCardSuspense`
- Local “login page shell” wrappers that copy `AppLoginFramedShell` / `AppLoginPage` layout
- Custom `min-h-dvh` centered layouts with a raw `Card` for auth (legacy `HqPublicShell` / `LoginChrome` were removed — do not recreate)
- Re-exporting app-shell login layout under another name without adding behavior

## Examples

### HQ (`hq/app/login/page.tsx`)

```tsx
import { AppLoginCardSuspense, AppLoginScreen } from "@visualify/app-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  return (
    <AppLoginScreen brandHref="/" brandTitle="Visualify HQ" brandAriaLabel="Visualify HQ">
      <AppLoginCardSuspense>
        <LoginForm serverError={serverError} />
      </AppLoginCardSuspense>
    </AppLoginScreen>
  );
}
```

### RiskAI (`riskai/app/login/RiskAiLoggedOutLoginScreen.tsx`)

```tsx
import { AppLoginCardSuspense, AppLoginScreen } from "@visualify/app-shell";
import { LoginClient } from "./LoginClient";

export function RiskAiLoggedOutLoginScreen() {
  return (
    <AppLoginScreen brandHref="/" brandTitle="Visualify RiskAI" brandAriaLabel="Visualify RiskAI">
      <AppLoginCardSuspense>
        <LoginClient />
      </AppLoginCardSuspense>
    </AppLoginScreen>
  );
}
```

### Template App (`template-app/app/login/page.tsx`)

```tsx
import { AppLoginCardSuspense, AppLoginScreen } from "@visualify/app-shell";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  return (
    <AppLoginScreen
      brandHref="/"
      brandTitle="Visualify Template App"
      brandAriaLabel="Visualify Template App"
    >
      <AppLoginCardSuspense>
        <LoginForm />
      </AppLoginCardSuspense>
    </AppLoginScreen>
  );
}
```

## Review checklist (PRs touching login UI)

1. Login route uses `AppLoginScreen` → `AppLoginCardSuspense` → client form.
2. No new app-local shell/card/Suspense wrapper.
3. Form fields use shared `AppLogin*` primitives and `appLoginFormClassName`.
4. Brand/copyright/legal hrefs are the only intentional per-app differences.
