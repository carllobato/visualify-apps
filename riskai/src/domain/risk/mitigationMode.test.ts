/**
 * Legacy MitigationMode ↔ Pre/Post input-profile mapping (no DB migration).
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  mitigationModeFromInputProfile,
  modellingInputProfileFromMode,
  mitigationModeFromRisk,
} from "@/domain/risk/mitigationMode";
import type { Risk } from "@/domain/risk/risk.schema";

const iso = "2025-01-01T00:00:00.000Z";
const rating = { probability: 3 as const, consequence: 3 as const, score: 9 as const, level: "high" as const };

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    title: "Test",
    category: "programme",
    status: "Open",
    inherentRating: rating,
    residualRating: rating,
    createdAt: iso,
    updatedAt: iso,
    ...overrides,
  };
}

describe("modellingInputProfileFromMode / mitigationModeFromInputProfile", () => {
  it("legacy none loads Pre-mitigation", () => {
    assert.strictEqual(modellingInputProfileFromMode("none"), "pre");
  });

  it("legacy forecast and active load Post-mitigation", () => {
    assert.strictEqual(modellingInputProfileFromMode("forecast"), "post");
    assert.strictEqual(modellingInputProfileFromMode("active"), "post");
  });

  it("selecting Pre maps to none; selecting Post preserves forecast/active", () => {
    assert.strictEqual(mitigationModeFromInputProfile("pre"), "none");
    assert.strictEqual(
      mitigationModeFromInputProfile("post", { previousMode: "forecast", status: "Open" }),
      "forecast"
    );
    assert.strictEqual(
      mitigationModeFromInputProfile("post", { previousMode: "active", status: "Open" }),
      "active"
    );
  });

  it("selecting Post from Pre defaults forecast for Open/Monitoring and active for Mitigating", () => {
    assert.strictEqual(
      mitigationModeFromInputProfile("post", { previousMode: "none", status: "Open" }),
      "forecast"
    );
    assert.strictEqual(
      mitigationModeFromInputProfile("post", { previousMode: "none", status: "Monitoring" }),
      "forecast"
    );
    assert.strictEqual(
      mitigationModeFromInputProfile("post", { previousMode: "none", status: "Mitigating" }),
      "active"
    );
  });

  it("profile mapping never implies a status change (round-trip modes only)", () => {
    for (const status of ["Open", "Monitoring", "Mitigating"] as const) {
      const toPost = mitigationModeFromInputProfile("post", { previousMode: "none", status });
      assert.ok(toPost === "forecast" || toPost === "active");
      assert.strictEqual(mitigationModeFromInputProfile("pre", { previousMode: toPost, status }), "none");
    }
  });
});

describe("mitigationModeFromRisk legacy readability", () => {
  it("profile none → Pre; planned/active profile → Post; Mitigating without profile → Post", () => {
    assert.strictEqual(
      modellingInputProfileFromMode(
        mitigationModeFromRisk(
          makeRisk({ mitigationProfile: { status: "none", effectiveness: 0, confidence: 0, reduces: 0, lagMonths: 0 } })
        )
      ),
      "pre"
    );
    assert.strictEqual(
      modellingInputProfileFromMode(
        mitigationModeFromRisk(
          makeRisk({
            mitigationProfile: { status: "planned", effectiveness: 0.5, confidence: 0.5, reduces: 0.5, lagMonths: 0 },
          })
        )
      ),
      "post"
    );
    assert.strictEqual(
      modellingInputProfileFromMode(
        mitigationModeFromRisk(
          makeRisk({
            status: "Mitigating",
            mitigationProfile: undefined,
          })
        )
      ),
      "post"
    );
  });
});
