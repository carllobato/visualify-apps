# RiskAI database migration workflow

RiskAI production database changes must be reproducible from source control.

## Standard workflow

1. Create and review the local SQL migration file first.
2. Obtain approval before any live database change.
3. ChatGPT applies the exact reviewed SQL through the Supabase connection.
4. Validate the live schema, migrated data and relevant advisors.
5. Commit the application and migration changes together.

Cursor must not connect to or modify Supabase.

## Data boundary

Migration files record schema, constraints, indexes, policies, functions, triggers and controlled data transformations. They must not contain production row exports, customer records, user data, authentication data, secrets or database credentials.

## Sprint 5 recovery

The dated Sprint 5 files preserve the database changes already made and validated in production.

These two files originated from the earlier manual-SQL workflow and are not represented in Supabase’s recorded migration history:

- `20260820120000_riskai_risks_null_vs_zero_persistence.sql`
- `20260821180000_riskai_risks_closure_and_review_persistence.sql`

Do not run or repair migration history from Cursor. Any remote history reconciliation must be separately reviewed and performed through the approved Supabase workflow.
