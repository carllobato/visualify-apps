export type WorkingDaysPerWeek = 5 | 5.5 | 6;

function normaliseWorkingDaysPerWeek(value: number | null | undefined): WorkingDaysPerWeek {
  return value === 5.5 || value === 6 ? value : 5;
}

function workingCapacityForDate(date: Date, workingDaysPerWeek: WorkingDaysPerWeek): number {
  const day = date.getDay();
  if (day >= 1 && day <= 5) return 1;
  if (day === 6) {
    return workingDaysPerWeek === 6 ? 1 : workingDaysPerWeek === 5.5 ? 0.5 : 0;
  }
  return 0;
}

export function addWorkingDaysLocal(
  startDate: Date,
  workingDays: number,
  workingDaysPerWeek: number | null | undefined = 5
): Date {
  const out = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  if (!Number.isFinite(workingDays) || workingDays <= 0) return out;

  const calendar = normaliseWorkingDaysPerWeek(workingDaysPerWeek);
  let remaining = workingDays;
  while (remaining > 1e-9) {
    out.setDate(out.getDate() + 1);
    remaining -= workingCapacityForDate(out, calendar);
  }
  return out;
}
