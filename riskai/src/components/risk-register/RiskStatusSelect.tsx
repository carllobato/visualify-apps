"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Callout, FieldError, Input } from "@visualify/design-system";
import { useRiskStatusOptions } from "./RiskStatusOptionsContext";

type RiskStatusSelectProps = {
  id: string;
  value: string;
  onChange: (name: string) => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  /** First option: empty disabled “Select…” */
  allowEmptyPlaceholder?: boolean;
};

/** Mirrors `fieldClass(false)` in `@visualify/design-system` Form.tsx for native `<select>`. */
const DS_NATIVE_FIELD_SELECT =
  "w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 " +
  "text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] transition-colors duration-150 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] " +
  "disabled:cursor-not-allowed disabled:bg-[var(--ds-surface-muted)] disabled:text-[var(--ds-text-muted)]";

function mergeSelectFieldClass(className?: string) {
  return [DS_NATIVE_FIELD_SELECT, className].filter(Boolean).join(" ");
}

export function RiskStatusSelect({
  id,
  value,
  onChange,
  className,
  style,
  disabled,
  allowEmptyPlaceholder,
}: RiskStatusSelectProps) {
  const { statuses, loading, error } = useRiskStatusOptions();

  const nameSet = useMemo(() => new Set(statuses.map((s) => s.name)), [statuses]);
  const hasCurrentInList = value !== "" && nameSet.has(value);
  const showLegacyOption = value !== "" && !hasCurrentInList;

  if (loading) {
    return (
      <select
        id={id}
        disabled
        className={mergeSelectFieldClass(className)}
        style={style}
        aria-busy="true"
        aria-label="Status"
        value=""
      >
        <option value="">Loading statuses…</option>
      </select>
    );
  }

  if (error && statuses.length === 0) {
    return (
      <div className="flex flex-col gap-[var(--ds-space-2)]">
        <Callout status="warning" className="text-[length:var(--ds-text-sm)]">
          Statuses unavailable — enter a status name below.
        </Callout>
        <Input
          id={id}
          type="text"
          className={className}
          style={style}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Status"
          aria-label="Status"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--ds-space-2)]">
      {error && statuses.length > 0 && (
        <FieldError className="mt-0">{error}</FieldError>
      )}
      <select
        id={id}
        className={mergeSelectFieldClass(className)}
        style={style}
        value={allowEmptyPlaceholder && value === "" ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Status"
      >
        {allowEmptyPlaceholder && (
          <option value="" disabled>
            Select status
          </option>
        )}
        {showLegacyOption && (
          <option value={value} key={`legacy-${value}`}>
            {value}
          </option>
        )}
        {statuses.length === 0 ? (
          <option value="">No statuses configured</option>
        ) : (
          statuses.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
