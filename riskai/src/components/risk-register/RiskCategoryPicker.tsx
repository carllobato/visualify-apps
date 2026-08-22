"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  Callout,
  dsNativeSelectFieldClassName,
  dsTextInputFieldClassName,
  FieldError,
} from "@visualify/design-system";
import { useRiskCategoryOptions } from "./RiskCategoryOptionsContext";
import { dlog } from "@/lib/debug";

/** Select this value to type a new category name (inserted on form submit or new-name blur). */
export const NEW_RISK_CATEGORY_SENTINEL = "__risk_category_new__";

/** Stable `<option>` values so category names never collide with `value=""` or duplicate labels. */
const CATEGORY_OPTION_PREFIX = "__risk_category_row_id__:";

function toSelectElementValue(
  selectValue: string,
  categories: { id: string; name: string }[]
): string {
  if (selectValue === NEW_RISK_CATEGORY_SENTINEL) return NEW_RISK_CATEGORY_SENTINEL;
  if (selectValue === "") return "";
  const match = categories.find((c) => c.name === selectValue);
  if (match) return `${CATEGORY_OPTION_PREFIX}${match.id}`;
  return selectValue;
}

function fromSelectElementValue(
  v: string,
  categories: { id: string; name: string }[]
): string {
  if (v === NEW_RISK_CATEGORY_SENTINEL) return NEW_RISK_CATEGORY_SENTINEL;
  if (v === "") return "";
  if (v.startsWith(CATEGORY_OPTION_PREFIX)) {
    const id = v.slice(CATEGORY_OPTION_PREFIX.length);
    return categories.find((c) => c.id === id)?.name ?? "";
  }
  return v;
}

export function getResolvedCategoryPickerValue(
  selectValue: string,
  newNameDraft: string
): string {
  if (selectValue === NEW_RISK_CATEGORY_SENTINEL) return newNameDraft.trim();
  return selectValue.trim();
}

export function shouldPersistNewCategoryOnSubmit(selectValue: string): boolean {
  return selectValue === NEW_RISK_CATEGORY_SENTINEL;
}

type RiskCategoryPickerProps = {
  id: string;
  selectValue: string;
  newNameDraft: string;
  onSelectChange: (next: string) => void;
  onNewNameDraftChange: (next: string) => void;
  /** When the user finishes typing a new category (inline register row). */
  onNewNameInputBlur?: () => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  allowEmptyPlaceholder?: boolean;
};

const fieldStackClass = "flex flex-col gap-[var(--ds-space-2)]";

function mergeSelectClass(className?: string) {
  return [dsNativeSelectFieldClassName(false), className].filter(Boolean).join(" ");
}

function mergeTextFieldClass(className?: string) {
  return [dsTextInputFieldClassName(false), className].filter(Boolean).join(" ");
}

export function RiskCategoryPicker({
  id,
  selectValue,
  newNameDraft,
  onSelectChange,
  onNewNameDraftChange,
  onNewNameInputBlur,
  className,
  style,
  disabled,
  allowEmptyPlaceholder,
}: RiskCategoryPickerProps) {
  const { categories, loading, error, categoriesReadOnly } = useRiskCategoryOptions();
  const fieldDisabled = disabled || categoriesReadOnly;
  const nameSet = useMemo(() => new Set(categories.map((c) => c.name)), [categories]);
  const categoriesForOptions = useMemo(
    () => categories.filter((c) => c.name.trim().length > 0),
    [categories]
  );

  const showLegacyOption =
    selectValue !== "" &&
    selectValue !== NEW_RISK_CATEGORY_SENTINEL &&
    !nameSet.has(selectValue);

  if (loading) {
    return (
      <select
        id={id}
        disabled
        className={mergeSelectClass(className)}
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
      <div className={fieldStackClass}>
        <Callout status="warning" role="status" className="text-[length:var(--ds-text-sm)]">
          Categories unavailable — enter a category name as text.
        </Callout>
        <input
          id={id}
          type="text"
          className={mergeTextFieldClass(className)}
          style={style}
          value={selectValue === NEW_RISK_CATEGORY_SENTINEL ? newNameDraft : selectValue}
          onChange={(e) => {
            const t = e.target.value;
            if (selectValue === NEW_RISK_CATEGORY_SENTINEL) {
              onNewNameDraftChange(t);
            } else {
              onSelectChange(t);
            }
          }}
          disabled={disabled}
          placeholder="Category"
          aria-label="Category"
        />
      </div>
    );
  }

  return (
    <div className={fieldStackClass}>
      {error && categories.length > 0 && (
        <FieldError className="!mt-0">{error}</FieldError>
      )}
      <select
        id={id}
        className={mergeSelectClass(className)}
        style={style}
        value={toSelectElementValue(selectValue, categoriesForOptions)}
        onChange={(e) => {
          const v = e.target.value;
          const logical = fromSelectElementValue(v, categoriesForOptions);
          dlog("[risk category] select change", {
            raw: v,
            logical,
            addNewMode: logical === NEW_RISK_CATEGORY_SENTINEL,
          });
          onSelectChange(logical);
        }}
        disabled={fieldDisabled}
        aria-label="Category"
      >
        {allowEmptyPlaceholder && (
          <option value="" disabled>
            Select category
          </option>
        )}
        {!allowEmptyPlaceholder && <option value="">—</option>}
        {showLegacyOption && (
          <option value={selectValue} key={`legacy-category-${selectValue}`}>
            {selectValue}
          </option>
        )}
        {categoriesForOptions.map((c) => (
          <option key={c.id} value={`${CATEGORY_OPTION_PREFIX}${c.id}`}>
            {c.name}
          </option>
        ))}
        {!categoriesReadOnly && (
          <option value={NEW_RISK_CATEGORY_SENTINEL}>Add new category…</option>
        )}
      </select>
      {selectValue === NEW_RISK_CATEGORY_SENTINEL && !categoriesReadOnly && (
        <input
          id={`${id}-new-name`}
          type="text"
          className={mergeTextFieldClass(className)}
          style={style}
          value={newNameDraft}
          onChange={(e) => onNewNameDraftChange(e.target.value)}
          onBlur={() => onNewNameInputBlur?.()}
          disabled={fieldDisabled}
          placeholder="New category name"
          aria-label="New category name"
        />
      )}
    </div>
  );
}
