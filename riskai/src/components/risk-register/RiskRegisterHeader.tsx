"use client";

import type { ProjectContext } from "@/lib/projectContext";

export type RiskRegisterHeaderProps = {
  projectContext?: ProjectContext | null;
  onAiReviewClick?: () => void;
  aiReviewLoading?: boolean;
  onGenerateAiRiskClick?: () => void;
  onSaveToServer?: () => void | Promise<void>;
  saveToServerLoading?: boolean;
  /** When true, hide mutating actions (viewer / read-only project access). */
  readOnlyContent?: boolean;
};

export function RiskRegisterHeader({
  readOnlyContent = false,
}: RiskRegisterHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      {readOnlyContent ? (
        <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]" role="status">
          View-only access for this project.
        </p>
      ) : null}
    </div>
  );
}
