import type { Certification } from "../schemas/profile.js";
import { parseDateRange } from "./dates.js";
import { type UrnIndex, byType, getPath } from "./normalizer.js";

export function parseCertifications(index: UrnIndex): Certification[] {
  return byType(index, "profile.Certification").map((certification) => {
    const { startDate, endDate } = parseDateRange(getPath(certification, "dateRange"));
    return {
      name: getPath<string>(certification, "name") ?? null,
      authority: getPath<string>(certification, "authority") ?? null,
      licenseNumber: getPath<string>(certification, "licenseNumber") ?? null,
      url: getPath<string>(certification, "url") ?? null,
      startDate,
      endDate,
    };
  });
}
