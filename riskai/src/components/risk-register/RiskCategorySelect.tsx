"use client";

/**
 * @deprecated Prefer {@link RiskCategoryPicker} / {@link RiskCategoryRowSelect}.
 * Thin re-export kept for any leftover imports during the Category create sprint.
 */
export {
  RiskCategoryPicker as RiskCategorySelect,
  getResolvedCategoryPickerValue,
  shouldPersistNewCategoryOnSubmit,
  NEW_RISK_CATEGORY_SENTINEL,
} from "./RiskCategoryPicker";
