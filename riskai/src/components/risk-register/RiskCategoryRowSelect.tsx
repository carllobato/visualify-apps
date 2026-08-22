"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NEW_RISK_CATEGORY_SENTINEL,
  RiskCategoryPicker,
  getResolvedCategoryPickerValue,
} from "./RiskCategoryPicker";
import { useRiskCategoryOptions } from "./RiskCategoryOptionsContext";
import { dlog } from "@/lib/debug";

/**
 * Inline category cell: updates the risk when choosing an existing category immediately;
 * for “Add new category…”, inserts on blur of the text field then commits the name.
 */
export function RiskCategoryRowSelect({
  riskId,
  category,
  onCommit,
  className,
}: {
  riskId: string;
  category: string | null | undefined;
  onCommit: (name: string) => void;
  /** Merged onto the field (e.g. `truncate` in narrow table cells). */
  className?: string;
}) {
  const { createRiskCategory, categoriesReadOnly } = useRiskCategoryOptions();
  const normalized = (category ?? "").trim();

  const [selectValue, setSelectValue] = useState(normalized);
  const [newNameDraft, setNewNameDraft] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    setSelectValue(normalized);
    setNewNameDraft("");
    setCreateError(null);
  }, [riskId, normalized]);

  const handleSelectChange = useCallback(
    (next: string) => {
      if (categoriesReadOnly) return;
      setCreateError(null);
      setSelectValue(next);
      if (next !== NEW_RISK_CATEGORY_SENTINEL) {
        setNewNameDraft("");
        onCommit(next.trim());
      }
    },
    [onCommit, categoriesReadOnly]
  );

  const handleNewBlur = useCallback(async () => {
    if (categoriesReadOnly || selectValue !== NEW_RISK_CATEGORY_SENTINEL) return;
    const resolved = getResolvedCategoryPickerValue(selectValue, newNameDraft);
    if (!resolved) return;
    try {
      const canonical = await createRiskCategory(resolved);
      if (!canonical) return;
      setSelectValue(canonical);
      setNewNameDraft("");
      setCreateError(null);
      onCommit(canonical);
      dlog("[risk category] row blur new category", canonical);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Could not save new category. Try again."
      );
    }
  }, [categoriesReadOnly, selectValue, newNameDraft, createRiskCategory, onCommit]);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <RiskCategoryPicker
        id={`risk-row-category-${riskId}`}
        selectValue={selectValue}
        newNameDraft={newNameDraft}
        onSelectChange={handleSelectChange}
        onNewNameDraftChange={setNewNameDraft}
        onNewNameInputBlur={categoriesReadOnly ? undefined : handleNewBlur}
        className={["min-w-0", className].filter(Boolean).join(" ")}
        disabled={categoriesReadOnly}
        allowEmptyPlaceholder={normalized === ""}
      />
      {createError ? (
        <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-status-danger-fg,var(--ds-text-secondary))]">
          {createError}
        </p>
      ) : null}
    </div>
  );
}
