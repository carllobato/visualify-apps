import type { ReactNode } from "react";
import { appLoginFormErrorClassName, appLoginFormErrorStackClassName } from "./classes";

export type AppLoginFormErrorProps = {
  message?: string | null;
  /** Optional content below the message (e.g. “Trouble signing in?”). */
  afterMessage?: ReactNode;
};

/**
 * Inline form error — renders nothing when `message` is empty (no extra gap before submit).
 */
export function AppLoginFormError({ message, afterMessage }: AppLoginFormErrorProps) {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) {
    return null;
  }

  return (
    <div className={appLoginFormErrorStackClassName}>
      <p role="alert" className={appLoginFormErrorClassName}>
        {text}
      </p>
      {afterMessage}
    </div>
  );
}
