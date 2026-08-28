import type { DateFragment } from "../schemas/profile.js";
import { getPath } from "./normalizer.js";

/** Parses a `{ month, year }` fragment. LinkedIn very often supplies only a year. */
export function parseDateFragment(raw: unknown): DateFragment | null {
  const month = getPath<number>(raw, "month");
  const year = getPath<number>(raw, "year");
  if (typeof month !== "number" && typeof year !== "number") return null;
  return {
    month: typeof month === "number" ? month : null,
    year: typeof year === "number" ? year : null,
  };
}

export interface DateRangeFragments {
  startDate: DateFragment | null;
  endDate: DateFragment | null;
}

/** Parses a LinkedIn `dateRange: { start, end }` object into startDate/endDate fragments. */
export function parseDateRange(dateRange: unknown): DateRangeFragments {
  return {
    startDate: parseDateFragment(getPath(dateRange, "start")),
    endDate: parseDateFragment(getPath(dateRange, "end")),
  };
}

/** durationMonths is computed by this service, not returned by LinkedIn. Uses today when endDate is null. */
export function computeDurationMonths(
  startDate: DateFragment | null,
  endDate: DateFragment | null,
): number | null {
  if (!startDate || startDate.year == null) return null;

  const startYear = startDate.year;
  const startMonth = startDate.month ?? 1;

  let endYear: number;
  let endMonth: number;
  if (endDate?.year != null) {
    endYear = endDate.year;
    endMonth = endDate.month ?? 12;
  } else {
    const today = new Date();
    endYear = today.getUTCFullYear();
    endMonth = today.getUTCMonth() + 1;
  }

  const months = (endYear - startYear) * 12 + (endMonth - startMonth);
  return months < 0 ? null : months;
}
