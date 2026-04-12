/**
 * Regression: formatDurationDays(10) must be "10 days" everywhere (no 10 → "1 week").
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { formatDurationDays, formatDurationDaysBarLabel, formatDurationWholeDays } from "./formatDuration";

describe("formatDurationDays", () => {
  it("10 days displays as '10 days' (not 1 week)", () => {
    assert.strictEqual(formatDurationDays(10), "10 days");
  });

  it("1 day singular", () => {
    assert.strictEqual(formatDurationDays(1), "1 day");
  });

  it("0 days", () => {
    assert.strictEqual(formatDurationDays(0), "0 days");
  });

  it("14+ days shows weeks with one decimal", () => {
    assert.strictEqual(formatDurationDays(14), "2.0 weeks");
    assert.strictEqual(formatDurationDays(7), "7 days"); // under 14
  });

  it("14+ days can use two decimals for ranked lists", () => {
    assert.strictEqual(formatDurationDays(14, { weekDecimals: 2 }), "2.00 weeks");
    assert.strictEqual(formatDurationDays(24, { weekDecimals: 2 }), "3.43 weeks");
  });

  it("undefined/NaN returns dash", () => {
    assert.strictEqual(formatDurationDays(undefined), "—");
    assert.strictEqual(formatDurationDays(NaN), "—");
  });
});

describe("formatDurationDaysBarLabel", () => {
  it("uses wk for 14+ days", () => {
    assert.strictEqual(formatDurationDaysBarLabel(88), "12.6 wk");
  });

  it("uses d under 14 days", () => {
    assert.strictEqual(formatDurationDaysBarLabel(10), "10 d");
    assert.strictEqual(formatDurationDaysBarLabel(1), "1 d");
  });
});

describe("formatDurationWholeDays", () => {
  it("large values stay as days (not weeks)", () => {
    assert.strictEqual(formatDurationWholeDays(88), "88 days");
  });

  it("matches sub-14 wording", () => {
    assert.strictEqual(formatDurationWholeDays(10), "10 days");
    assert.strictEqual(formatDurationWholeDays(1), "1 day");
    assert.strictEqual(formatDurationWholeDays(0), "0 days");
  });

  it("invalid returns dash", () => {
    assert.strictEqual(formatDurationWholeDays(NaN), "—");
    assert.strictEqual(formatDurationWholeDays(-1), "—");
  });
});
