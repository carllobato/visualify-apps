"use client";

import { useEffect, type ReactNode } from "react";

type LiquidDialogProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  children: ReactNode;
};

export function LiquidDialog({ open, onClose, titleId, title, children }: LiquidDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="liquid-modal-backdrop absolute inset-0 cursor-pointer bg-black/40 backdrop-blur-md transition-colors duration-200 hover:bg-black/45 dark:bg-black/55 dark:backdrop-blur-lg dark:hover:bg-black/60"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="liquid-modal-panel relative z-10 w-full max-w-md rounded-[1.75rem] border border-white/50 bg-white/82 p-6 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.16),0_0_0_1px_rgba(255,255,255,0.65)_inset] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.14] dark:bg-zinc-950/78 dark:shadow-[0_28px_90px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.1)] sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <p id={titleId} className="text-[13px] font-medium uppercase tracking-[0.16em] text-muted">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-all duration-200 ease-out hover:scale-105 hover:bg-black/[0.08] hover:text-foreground active:scale-95 dark:hover:bg-white/[0.1]"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0">
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.25"
                d="M4 4l8 8M12 4l-8 8"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
