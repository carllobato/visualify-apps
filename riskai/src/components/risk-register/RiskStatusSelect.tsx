"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Callout, dsNativeSelectFieldClassName, FieldError, Input } from "@visualify/design-system";
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
  /** Native tooltip on the control */
  title?: string;
};

function mergeSelectFieldClass(className?: string) {
  return [dsNativeSelectFieldClassName(false), className].filter(Boolean).join(" ");
}

export function RiskStatusSelect({
  id,
  value,
  onChange,
  className,
  style,
  disabled,
  allowEmptyPlaceholder,
  title,
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
        title={title}
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
          title={title}
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
        title={title}
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
