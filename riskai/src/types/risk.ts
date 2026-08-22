/**
 * DB row shape for `public.risks` / `public.riskai_risks` (Supabase).
 * Must match table columns exactly.
 *
 * Nullability: blank/null = unassessed; explicit 0 = assessed as zero.
 * Incomplete Drafts may persist null on pre/post numeric assessment fields.
 */
export type RiskRow = {
  id: string;
  project_id: string;
  risk_number: number | null;
  title: string;
  description: string | null;
  category: string;
  owner: string | null;
  applies_to: string | null;
  status: string;
  pre_probability: number | null;
  pre_probability_pct: number | null;
  pre_cost_min: number | null;
  pre_cost_ml: number | null;
  pre_cost_max: number | null;
  pre_time_min: number | null;
  pre_time_ml: number | null;
  pre_time_max: number | null;
  mitigation_description: string | null;
  mitigation_cost: number | null;
  post_probability: number | null;
  post_probability_pct: number | null;
  post_cost_min: number | null;
  post_cost_ml: number | null;
  post_cost_max: number | null;
  post_time_min: number | null;
  post_time_ml: number | null;
  post_time_max: number | null;
  created_at: string;
  updated_at: string;
  /** Closure note required when entering Closed; may be null on legacy Closed rows. */
  closure_note: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string | null;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  last_review_month: string | null;
};

/**
 * UI-editable fields for a risk (id optional for new rows; all fields needed for form/insert).
 * tempId used for stable React keys when id not yet set.
 */
export type RiskInput = {
  id?: string;
  tempId?: string;
  title: string;
  description: string | null;
  category: string;
  owner: string | null;
  status: string;
  pre_probability: number | null;
  pre_cost_ml: number | null;
  pre_time_ml: number | null;
  mitigation_description: string | null;
  mitigation_cost: number | null;
  post_probability: number | null;
  post_cost_ml: number | null;
  post_time_ml: number | null;
};
