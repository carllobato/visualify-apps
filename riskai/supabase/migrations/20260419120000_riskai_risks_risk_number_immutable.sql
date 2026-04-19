-- Per-project stable risk_number: fill when missing on insert; never change after first persisted value.
-- Upserts from the app send full rows; this trigger prevents stale clients from renumbering rows.
-- SECURITY DEFINER: MAX(risk_number) must see all rows for the project (not limited by RLS).

CREATE OR REPLACE FUNCTION public.riskai_risks_enforce_risk_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_n integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.risk_number IS NOT NULL THEN
      NEW.risk_number := OLD.risk_number;
      RETURN NEW;
    END IF;
    -- Legacy row still NULL: assign once when the client saves without a number
    IF NEW.risk_number IS NULL THEN
      PERFORM pg_advisory_xact_lock(87201401, hashtext(NEW.project_id::text));
      SELECT COALESCE(MAX(risk_number), 0) + 1 INTO next_n
      FROM public.riskai_risks
      WHERE project_id = NEW.project_id
        AND id <> NEW.id;
      NEW.risk_number := next_n;
    END IF;
    RETURN NEW;
  END IF;

  -- INSERT
  IF NEW.risk_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(87201401, hashtext(NEW.project_id::text));
  SELECT COALESCE(MAX(risk_number), 0) + 1 INTO next_n
  FROM public.riskai_risks
  WHERE project_id = NEW.project_id;
  NEW.risk_number := next_n;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.riskai_risks_enforce_risk_number() FROM PUBLIC;

DROP TRIGGER IF EXISTS riskai_risks_enforce_risk_number ON public.riskai_risks;
CREATE TRIGGER riskai_risks_enforce_risk_number
  BEFORE INSERT OR UPDATE ON public.riskai_risks
  FOR EACH ROW
  EXECUTE PROCEDURE public.riskai_risks_enforce_risk_number();

-- Enforce uniqueness for non-null numbers (multiple NULLs remain possible for legacy rows until backfilled).
CREATE UNIQUE INDEX IF NOT EXISTS riskai_risks_project_id_risk_number_uq
  ON public.riskai_risks (project_id, risk_number)
  WHERE risk_number IS NOT NULL;
