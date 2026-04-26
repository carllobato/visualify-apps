/**
 * Regression: schedule durations must stay in working days everywhere.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { formatDurationDays, formatDurationDaysBarLabel, formatDurationWholeDays } from "./formatDuration";

describe("formatDurationDays", () => {
  it("10 days displays as working days", () => {
    assert.strictEqual(formatDurationDays(10), "10 working days");
  });

  it("1 working day singular", () => {
    assert.strictEqual(formatDurationDays(1), "1 working day");
  });

  it("0 working days", () => {
    assert.strictEqual(formatDurationDays(0), "0 working days");
  });

  it("14+ days stays in working days", () => {
    assert.strictEqual(formatDurationDays(14), "14 working days");
    assert.strictEqual(formatDurationDays(7), "7 working days");
  });

  it("ignores legacy week-decimal options", () => {
    assert.strictEqual(formatDurationDays(14, { weekDecimals: 2 }), "14 working days");
    assert.strictEqual(formatDurationDays(24, { weekDecimals: 2 }), "24 working days");
  });

  it("undefined/NaN returns dash", () => {
    assert.strictEqual(formatDurationDays(undefined), "—");
    assert.strictEqual(formatDurationDays(NaN), "—");
  });
});

describe("formatDurationDaysBarLabel", () => {
  it("uses wd for 14+ days", () => {
    assert.strictEqual(formatDurationDaysBarLabel(88), "88 wd");
  });

  it("uses wd under 14 days", () => {
    assert.strictEqual(formatDurationDaysBarLabel(10), "10 wd");
    assert.strictEqual(formatDurationDaysBarLabel(1), "1 wd");
  });
});

describe("formatDurationWholeDays", () => {
  it("large values stay as working days", () => {
    assert.strictEqual(formatDurationWholeDays(88), "88 working days");
  });

  it("matches working-day wording", () => {
    assert.strictEqual(formatDurationWholeDays(10), "10 working days");
    assert.strictEqual(formatDurationWholeDays(1), "1 working day");
    assert.strictEqual(formatDurationWholeDays(0), "0 working days");
  });

  it("invalid returns dash", () => {
    assert.strictEqual(formatDurationWholeDays(NaN), "—");
    assert.strictEqual(formatDurationWholeDays(-1), "—");
  });
});
