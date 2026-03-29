import * as React from "react";
import { Card, CardContent } from "./Card";

export interface StatBlockProps {
  label: string;
  value: string;
  helperText?: string;
  className?: string;
}

export function StatBlock({ label, value, helperText, className = "" }: StatBlockProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
          {label}
        </div>
        <div className="mt-1 text-[length:var(--ds-text-2xl)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
          {value}
        </div>
        {helperText != null && helperText !== "" ? (
          <div className="mt-0.5 text-[length:var(--ds-text-xs)] font-normal normal-case tracking-normal text-[var(--ds-text-muted)]">
            {helperText}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
