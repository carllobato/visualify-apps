/**
 * Excel file-import preview: normalisation, Draft forcing, duplicate classification, selection.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import type { Risk } from "@/domain/risk/risk.schema";
import {
  buildFileImportPreview,
  classifyImportPreviewRows,
  getDefaultImportSelection,
  normalizeExtractedImportRisks,
  normalizeImportTitleKey,
  resolveImportSelection,
} from "@/domain/risk/fileImportPreview";
import { getRiskRegisterSaveValidationErrors } from "@/domain/risk/riskRegisterSaveValidation";

function makeExistingRisk(title: string, projectTag = "current"): Risk {
  return {
    id: `existing-${title}`,
    title,
    category: "programme",
    status: "open",
    inherentRating: { probability: 3, consequence: 3, score: 9, level: "medium" },
    residualRating: { probability: 3, consequence: 3, score: 9, level: "medium" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    description: projectTag,
  };
}

function draftRow(overrides: Record<string, unknown> = {}) {
  return {
    title: "Imported risk",
    category: "programme",
    probability: 3,
    consequence: 4,
    ...overrides,
  };
}

describe("normalizeImportTitleKey", () => {
  it("trims, collapses whitespace and compares case-insensitively", () => {
    assert.strictEqual(normalizeImportTitleKey("  Foo   Bar  "), "foo bar");
    assert.strictEqual(normalizeImportTitleKey("FOO BAR"), "foo bar");
    assert.strictEqual(normalizeImportTitleKey("foo bar"), "foo bar");
  });
});

describe("normalizeExtractedImportRisks", () => {
  it("always forces Draft status through the draft mapper", () => {
    const rows = normalizeExtractedImportRisks([
      draftRow({ status: "Open", title: "  Status override  " }),
    ]);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].valid, true);
    assert.strictEqual(rows[0].risk?.status, "draft");
    assert.strictEqual(rows[0].risk?.title, "Status override");
  });

  it("source/AI status cannot override Draft even when a full risk shape is returned", () => {
    const rows = normalizeExtractedImportRisks([
      {
        title: "Full risk passthrough attempt",
        category: "programme",
        status: "Monitoring",
        probability: 2,
        consequence: 2,
        inherentRating: { probability: 2, consequence: 2, score: 4, level: "low" },
      },
    ]);
    assert.strictEqual(rows[0].valid, false);
    assert.strictEqual(rows[0].risk, null);
  });

  it("keeps imported risk numbers unset", () => {
    const rows = normalizeExtractedImportRisks([draftRow({ riskNumber: 99 })]);
    assert.strictEqual(rows[0].risk?.riskNumber, undefined);
  });

  it("treats blank titles as invalid", () => {
    const rows = normalizeExtractedImportRisks([draftRow({ title: "   " })]);
    assert.strictEqual(rows[0].valid, false);
    assert.match(rows[0].invalidReason ?? "", /title/i);
  });

  it("keeps workspace-scoped categories when categoryNames are supplied", () => {
    const workspaceCategory = "Environmental Compliance";
    const rows = normalizeExtractedImportRisks(
      [draftRow({ category: workspaceCategory })],
      { categoryNames: [workspaceCategory] },
    );
    assert.strictEqual(rows[0].valid, true);
    assert.strictEqual(rows[0].risk?.category, workspaceCategory);
  });

  it("clears categories outside the default import candidate list when no workspace names supplied", () => {
    const rows = normalizeExtractedImportRisks([
      draftRow({ category: "Environmental Compliance" }),
    ]);
    assert.strictEqual(rows[0].valid, true);
    assert.strictEqual(rows[0].risk?.category, "");
  });
});

describe("duplicate classification", () => {
  it("flags duplicates against current-project risks by normalised title", () => {
    const normalized = normalizeExtractedImportRisks([draftRow({ title: "  Shared Title  " })]);
    const rows = classifyImportPreviewRows(normalized, [makeExistingRisk("shared title")]);
    assert.strictEqual(rows[0].isDuplicate, true);
    assert.ok(rows[0].duplicateReasons.includes("existing_project"));
  });

  it("flags duplicates within the upload batch", () => {
    const normalized = normalizeExtractedImportRisks([
      draftRow({ title: "Batch A" }),
      draftRow({ title: "batch   a" }),
    ]);
    const rows = classifyImportPreviewRows(normalized, []);
    assert.strictEqual(rows[0].isDuplicate, false);
    assert.strictEqual(rows[1].isDuplicate, true);
    assert.ok(rows[1].duplicateReasons.includes("batch"));
  });

  it("ignores same title in another project context (only current register risks supplied)", () => {
    const otherProjectRisk = makeExistingRisk("Only elsewhere", "other-project");
    const normalized = normalizeExtractedImportRisks([draftRow({ title: "Only elsewhere" })]);
    const rows = classifyImportPreviewRows(normalized, []);
    assert.strictEqual(rows[0].isDuplicate, false);
    // When that risk is loaded for the current project, it becomes a duplicate.
    const withCurrent = classifyImportPreviewRows(normalized, [otherProjectRisk]);
    assert.strictEqual(withCurrent[0].isDuplicate, true);
  });
});

describe("import preview selection defaults", () => {
  it("selects unique valid rows by default and leaves duplicates unselected", () => {
    const rows = buildFileImportPreview(
      [draftRow({ title: "Unique" }), draftRow({ title: "unique" }), draftRow({ title: "   " })],
      [makeExistingRisk("Existing")],
    );
    const selected = getDefaultImportSelection(rows);
    const uniqueRow = rows.find((r) => r.title === "Unique");
    const dupBatch = rows.find((r) => r.title === "unique");
    const invalid = rows.find((r) => !r.valid);
    assert.ok(uniqueRow && selected.has(uniqueRow.id));
    assert.ok(dupBatch && !selected.has(dupBatch.id));
    assert.ok(invalid && !selected.has(invalid.id));
  });

  it("allows explicitly selecting a possible duplicate", () => {
    const rows = buildFileImportPreview([draftRow({ title: "Dup" }), draftRow({ title: "dup" })], []);
    const duplicate = rows[1];
    const selected = new Set([duplicate.id]);
    const { risksToAppend, counts } = resolveImportSelection(rows, selected);
    assert.strictEqual(risksToAppend.length, 1);
    assert.strictEqual(risksToAppend[0].title, "dup");
    assert.strictEqual(counts.imported, 1);
  });

  it("invalid blank-title rows cannot be selected", () => {
    const rows = buildFileImportPreview([draftRow({ title: "" })], []);
    const selected = getDefaultImportSelection(rows);
    assert.strictEqual(selected.size, 0);
    for (const row of rows) {
      if (!row.valid) assert.strictEqual(row.defaultSelected, false);
    }
  });
});

describe("resolveImportSelection counts", () => {
  it("appends only selected rows and reports imported, duplicate and invalid counts", () => {
    const rows = buildFileImportPreview(
      [
        draftRow({ title: "Keep me" }),
        draftRow({ title: "keep me" }),
        draftRow({ title: "Also unique" }),
        draftRow({ title: "  " }),
      ],
      [],
    );
    const keep = rows.find((r) => r.title === "Keep me");
    const also = rows.find((r) => r.title === "Also unique");
    assert.ok(keep && also);
    const selected = new Set([keep.id, also.id]);
    const { risksToAppend, counts } = resolveImportSelection(rows, selected);
    assert.strictEqual(risksToAppend.length, 2);
    assert.strictEqual(counts.imported, 2);
    assert.strictEqual(counts.skippedDuplicate, 1);
    assert.strictEqual(counts.invalid, 1);
    assert.strictEqual(risksToAppend.every((r) => r.riskNumber == null), true);
  });
});

describe("Draft save safety", () => {
  it("permits incomplete Draft save without appliesTo, assessment, impact type or pre/post values", () => {
    const errs = getRiskRegisterSaveValidationErrors({
      status: "Draft",
      title: "Imported draft",
      description: "",
      category: "",
      ownerResolved: "",
      appliesTo: "",
      preMitigationProbabilityPct: "",
      preMitigationCostMin: "",
      preMitigationCostML: "",
      preMitigationCostMax: "",
      preMitigationTimeMin: "",
      preMitigationTimeML: "",
      preMitigationTimeMax: "",
      mitigation: "",
      mitigationCost: "",
      postMitigationProbabilityPct: "",
      postMitigationCostMin: "",
      postMitigationCostML: "",
      postMitigationCostMax: "",
      postMitigationTimeMin: "",
      postMitigationTimeML: "",
      postMitigationTimeMax: "",
    });
    assert.deepStrictEqual(errs, []);
  });

  it("non-Draft validation still requires appliesTo and assessment fields", () => {
    const errs = getRiskRegisterSaveValidationErrors({
      status: "Open",
      title: "",
      description: "",
      category: "",
      ownerResolved: "",
      appliesTo: "",
      preMitigationProbabilityPct: "",
      preMitigationCostMin: "",
      preMitigationCostML: "",
      preMitigationCostMax: "",
      preMitigationTimeMin: "",
      preMitigationTimeML: "",
      preMitigationTimeMax: "",
      mitigation: "",
      mitigationCost: "",
      postMitigationProbabilityPct: "",
      postMitigationCostMin: "",
      postMitigationCostML: "",
      postMitigationCostMax: "",
      postMitigationTimeMin: "",
      postMitigationTimeML: "",
      postMitigationTimeMax: "",
    });
    assert.ok(errs.includes("Applies to"));
    assert.ok(errs.includes("Title"));
  });
});
