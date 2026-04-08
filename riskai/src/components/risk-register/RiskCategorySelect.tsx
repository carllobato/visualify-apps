"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Callout, dsNativeSelectFieldClassName, FieldError, Input } from "@visualify/design-system";
import { useRiskCategoryOptions } from "./RiskCategoryOptionsContext";

type RiskCategorySelectProps = {
  id: string;
  value: string;
  onChange: (name: string) => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  /** First option: empty disabled “Select…” (detail modal) */
  allowEmptyPlaceholder?: boolean;
};

function mergeSelectFieldClass(className?: string) {
  return [dsNativeSelectFieldClassName(false), className].filter(Boolean).join(" ");
}

export function RiskCategorySelect({
  id,
  value,
  onChange,
  className,
  style,
  disabled,
  allowEmptyPlaceholder,
}: RiskCategorySelectProps) {
  const { categories, loading, error } = useRiskCategoryOptions();

  const nameSet = useMemo(() => new Set(categories.map((c) => c.name)), [categories]);
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
        aria-label="Category"
        value=""
      >
        <option value="">Loading categories…</option>
      </select>
    );
  }

  if (error && categories.length === 0) {
    return (
      <div className="flex flex-col gap-[var(--ds-space-2)]">
        <Callout status="warning" className="text-[length:var(--ds-text-sm)]">
          Categories unavailable — enter a category name below.
        </Callout>
        <Input
          id={id}
          type="text"
          className={className}
          style={style}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Category"
          aria-label="Category"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--ds-space-2)]">
      {error && categories.length > 0 && (
        <FieldError className="mt-0">{error}</FieldError>
      )}
      <select
        id={id}
        className={mergeSelectFieldClass(className)}
        style={style}
        value={allowEmptyPlaceholder && value === "" ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Category"
      >
        {allowEmptyPlaceholder && (
          <option value="" disabled>
            Select category
          </option>
        )}
        {showLegacyOption && (
          <option value={value} key={`legacy-${value}`}>
            {value}
          </option>
        )}
        {categories.length === 0 ? (
          <option value="">No categories configured</option>
        ) : (
          categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
