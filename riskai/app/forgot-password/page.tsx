import { ForgotPasswordClient } from "./ForgotPasswordClient";

const t = "transition-[background-color,border-color,box-shadow,opacity,color] duration-[250ms] ease-in-out";

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-full flex-col items-center justify-center px-4 py-8">
      <div
        className={[
          "relative w-full max-w-md overflow-hidden rounded-[var(--ds-radius-md)] border border-[var(--ds-border-auth-shell)]",
          "shadow-[var(--ds-shadow-auth-card)]",
          t,
        ].join(" ")}
      >
        <div
          className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity duration-[250ms] ease-in-out dark:opacity-0`}
          style={{ background: "var(--ds-gradient-glass-vignette-light)" }}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-[250ms] ease-in-out dark:opacity-100`}
          style={{ background: "var(--ds-gradient-glass-vignette-dark)" }}
          aria-hidden
        />

        <div
          className={`relative z-10 bg-[var(--ds-surface-glass)] p-5 backdrop-blur-[20px] dark:bg-[var(--ds-surface-glass-dark)] ${t}`}
        >
          <h1 className={`mb-4 text-center text-xl font-semibold tracking-tight text-[var(--ds-text-primary)] ${t}`}>
            Reset password
          </h1>
          <ForgotPasswordClient />
        </div>
      </div>
    </main>
  );
}
