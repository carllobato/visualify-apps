/**
 * Mitigation optimisation API: loads risks + neutral snapshot via getSimulationContext() (no body).
 *
 * Verification steps (debug):
 * 1. Open GET /api/simulation-context/status
 * 2. Run simulation in UI
 * 3. Refresh status — expect hasNeutralSnapshot=true and neutralP80>0
 * 4. Hit GET /api/mitigation-optimisation — expect hasNeutralSnapshot=true
 */
import { NextResponse } from "next/server";
import { getSimulationContext, getSimulationContextStatus } from "@/lib/getSimulationContext";
import { requireUser } from "@/lib/auth/requireUser";
import { computeMitigationOptimisation, getNeutralP80Cost } from "@/engine/mitigationOptimisation";
import type { BenefitMetric } from "@/engine/mitigationOptimisation";
import { dlog, dwarn, isDev } from "@/lib/debug";
import type { SimulationSnapshot } from "@/domain/simulation/simulation.types";

/** POST body: only optional spendSteps, budgetCap, benefitMetric. Risks and snapshot loaded internally. */
type Body = {
  spendSteps?: unknown;
  budgetCap?: unknown;
  benefitMetric?: unknown;
  targetPercent?: unknown;
  targetScheduleDays?: unknown;
  risks?: unknown;
  neutralSnapshot?: unknown;
};

function isValidSnapshot(snapshot: unknown): snapshot is SimulationSnapshot {
  if (snapshot == null || typeof snapshot !== "object") return false;
  const s = snapshot as Record<string, unknown>;
  return (
    typeof s.p80Cost === "number" &&
    Number.isFinite(s.p80Cost) &&
    Array.isArray(s.risks)
  );
}

function validateSpendSteps(value: unknown): { ok: true; steps: number[] } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, steps: [0, 25_000, 50_000, 100_000, 200_000] };
  if (!Array.isArray(value)) return { ok: false, error: "spendSteps must be an array" };
  if (value.length < 2) return { ok: false, error: "spendSteps must have at least 2 elements" };
  const steps: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const n = Number(value[i]);
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: `spendSteps[${i}] must be a non-negative number` };
    steps.push(n);
  }
  const sorted = [...steps].sort((a, b) => a - b);
  if (steps.some((v, i) => v !== sorted[i])) return { ok: false, error: "spendSteps must be sorted ascending" };
  if (sorted[0] !== 0) return { ok: false, error: "spendSteps must include 0" };
  return { ok: true, steps };
}

function validateBudgetCap(value: unknown): { ok: true; cap?: number } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "budgetCap must be a non-negative number" };
  return { ok: true, cap: n };
}

function validateBenefitMetric(value: unknown): BenefitMetric | null {
  if (value === "targetCostReduction") return "targetCostReduction";
  if (value === undefined || value === null) return "targetCostReduction";
  return null;
}

function validateTargetPercent(value: unknown): { ok: true; targetPercent: number } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, targetPercent: 80 };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, error: "targetPercent must be a number between 0 and 100" };
  return { ok: true, targetPercent: n };
}

function validateTargetScheduleDays(value: unknown): { ok: true; targetScheduleDays?: number } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "targetScheduleDays must be a non-negative number" };
  return { ok: true, targetScheduleDays: n };
}

function devHeaders(status: ReturnType<typeof getSimulationContextStatus>) {
  if (!isDev()) return undefined;
  const h: Record<string, string> = {
    "x-simctx-risk-count": String(status.riskCount),
    "x-simctx-has-neutral": String(status.hasNeutralSnapshot),
    "x-simctx-neutral-p80": status.neutralP80 != null ? String(status.neutralP80) : "",
    "x-simctx-last-updated": status.lastUpdatedAt != null ? String(status.lastUpdatedAt) : "",
  };
  return h;
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    dlog("[api/mit-opt] POST called");
    let body: Body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }

    const spendResult = validateSpendSteps(body.spendSteps);
    if (!spendResult.ok) {
      return NextResponse.json({ error: spendResult.error }, { status: 400 });
    }

    const budgetResult = validateBudgetCap(body.budgetCap);
    if (!budgetResult.ok) {
      return NextResponse.json({ error: budgetResult.error }, { status: 400 });
    }

    const benefitMetric = validateBenefitMetric(body.benefitMetric);
    if (benefitMetric === null) {
      return NextResponse.json({ error: "benefitMetric must be \"targetCostReduction\" or omitted" }, { status: 400 });
    }
    const targetPercentResult = validateTargetPercent(body.targetPercent);
    if (!targetPercentResult.ok) {
      return NextResponse.json({ error: targetPercentResult.error }, { status: 400 });
    }
    const targetScheduleDaysResult = validateTargetScheduleDays(body.targetScheduleDays);
    if (!targetScheduleDaysResult.ok) {
      return NextResponse.json({ error: targetScheduleDaysResult.error }, { status: 400 });
    }

    const bodyRisks = Array.isArray(body.risks) ? body.risks : null;
    const bodyNeutralSnapshot = isValidSnapshot(body.neutralSnapshot) ? body.neutralSnapshot : null;
    const context = await getSimulationContext();
    const risks = bodyRisks ?? context.risks;
    const neutralSnapshot = bodyNeutralSnapshot ?? context.neutralSnapshot;
    const status = getSimulationContextStatus();
    dlog("[api/mit-opt] ctx", {
      riskCount: risks.length,
      hasSnapshot: !!neutralSnapshot,
      neutralP80: neutralSnapshot ? getNeutralP80Cost(neutralSnapshot) : null,
      lastUpdatedAt: status.lastUpdatedAt,
    });

    if (!neutralSnapshot) {
      dwarn("[api/mit-opt] missing neutral snapshot - run simulation first");
      return NextResponse.json(
        { error: "Neutral snapshot not available. Run simulation first." },
        { status: 400, headers: devHeaders(status) }
      );
    }

    const result = computeMitigationOptimisation({
      risks: risks as Parameters<typeof computeMitigationOptimisation>[0]["risks"],
      neutralSnapshot,
      spendSteps: spendResult.steps,
      benefitMetric,
      targetPercent: targetPercentResult.targetPercent,
      targetScheduleDays: targetScheduleDaysResult.targetScheduleDays,
      budgetCap: budgetResult.cap,
    });

    dlog("[api/mit-opt] ok", {
      neutralTargetCost: result.baseline.neutralTargetCost,
      neutralTargetDays: result.baseline.neutralTargetDays,
      targetPercent: result.baseline.targetPercent,
      rankedCostCount: result.rankedCost.length,
      rankedScheduleCount: result.rankedSchedule.length,
    });

    const headers = devHeaders(getSimulationContextStatus());
    return NextResponse.json(
      { requestId: crypto.randomUUID(), ...result },
      { status: 200, headers }
    );
  } catch {
    return NextResponse.json(
      { error: "Unexpected error during mitigation optimisation" },
      { status: 500 }
    );
  }
}

/** DEV self-test: GET uses same internal loader as POST (no Monte Carlo). */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    dlog("[api/mit-opt] GET called");
    const { risks, neutralSnapshot } = await getSimulationContext();
    const status = getSimulationContextStatus();
    dlog("[api/mit-opt] ctx", {
      riskCount: status.riskCount,
      hasSnapshot: status.hasNeutralSnapshot,
      neutralP80: status.neutralP80,
      lastUpdatedAt: status.lastUpdatedAt,
    });

    if (!neutralSnapshot) {
      return NextResponse.json(
        { ok: true, hasNeutralSnapshot: false },
        { status: 200, headers: devHeaders(status) }
      );
    }

    const neutralP80 = getNeutralP80Cost(neutralSnapshot);
    const result = computeMitigationOptimisation({
      risks: risks as Parameters<typeof computeMitigationOptimisation>[0]["risks"],
      neutralSnapshot,
      targetPercent: 80,
    });

    dlog("[api/mit-opt] ok", {
      neutralTargetCost: result.baseline.neutralTargetCost,
      neutralTargetDays: result.baseline.neutralTargetDays,
      targetPercent: result.baseline.targetPercent,
      rankedCostCount: result.rankedCost.length,
      rankedScheduleCount: result.rankedSchedule.length,
    });

    const headers = devHeaders(getSimulationContextStatus());
    return NextResponse.json(
      {
        ok: true,
        hasNeutralSnapshot: true,
        neutralP80,
        sampleRankedCostCount: result.rankedCost.length,
        sampleRankedScheduleCount: result.rankedSchedule.length,
      },
      { status: 200, headers }
    );
  } catch {
    return NextResponse.json(
      { error: "Unexpected error during mitigation optimisation" },
      { status: 500 }
    );
  }
}
