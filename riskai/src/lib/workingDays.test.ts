import { describe, it } from "node:test";
import assert from "node:assert";
import { addWorkingDaysLocal } from "./workingDays";

function isoDay(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

describe("addWorkingDaysLocal", () => {
  it("uses Monday to Friday for a 5-day calendar", () => {
    assert.strictEqual(isoDay(addWorkingDaysLocal(new Date(2025, 0, 3), 1, 5)), "2025-01-06");
    assert.strictEqual(isoDay(addWorkingDaysLocal(new Date(2025, 0, 3), 5, 5)), "2025-01-10");
  });

  it("treats Saturday as half capacity for a 5.5-day calendar", () => {
    assert.strictEqual(isoDay(addWorkingDaysLocal(new Date(2025, 0, 3), 0.5, 5.5)), "2025-01-04");
    assert.strictEqual(isoDay(addWorkingDaysLocal(new Date(2025, 0, 3), 1, 5.5)), "2025-01-06");
  });

  it("uses Monday to Saturday for a 6-day calendar", () => {
    assert.strictEqual(isoDay(addWorkingDaysLocal(new Date(2025, 0, 3), 1, 6)), "2025-01-04");
    assert.strictEqual(isoDay(addWorkingDaysLocal(new Date(2025, 0, 3), 2, 6)), "2025-01-06");
  });

  it("defaults legacy missing calendars to Monday to Friday", () => {
    assert.strictEqual(isoDay(addWorkingDaysLocal(new Date(2025, 0, 3), 1, undefined)), "2025-01-06");
  });
});
