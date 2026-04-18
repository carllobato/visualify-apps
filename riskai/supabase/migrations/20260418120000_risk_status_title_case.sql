-- Align `riskai_risk_statuses.name` and `riskai_risks.status` with app constants (Title Case).
-- Legacy rows stored lowercase from the original seed; free-text status must match lookup display names.

BEGIN;

UPDATE public.riskai_risks SET status = 'Draft' WHERE lower(trim(status)) = 'draft';
UPDATE public.riskai_risks SET status = 'Open' WHERE lower(trim(status)) = 'open';
UPDATE public.riskai_risks SET status = 'Monitoring' WHERE lower(trim(status)) = 'monitoring';
UPDATE public.riskai_risks SET status = 'Mitigating' WHERE lower(trim(status)) = 'mitigating';
UPDATE public.riskai_risks SET status = 'Mitigated' WHERE lower(trim(status)) = 'mitigated';
UPDATE public.riskai_risks SET status = 'Closed' WHERE lower(trim(status)) = 'closed';
UPDATE public.riskai_risks SET status = 'Archived' WHERE lower(trim(status)) = 'archived';

UPDATE public.riskai_risk_statuses SET name = 'Draft' WHERE name = 'draft';
UPDATE public.riskai_risk_statuses SET name = 'Open' WHERE name = 'open';
UPDATE public.riskai_risk_statuses SET name = 'Monitoring' WHERE name = 'monitoring';
UPDATE public.riskai_risk_statuses SET name = 'Mitigating' WHERE name = 'mitigating';
UPDATE public.riskai_risk_statuses SET name = 'Closed' WHERE name = 'closed';
UPDATE public.riskai_risk_statuses SET name = 'Archived' WHERE name = 'archived';

COMMIT;
