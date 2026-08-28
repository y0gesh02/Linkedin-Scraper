import type { Experience } from "../schemas/profile.js";
import { computeDurationMonths, parseDateRange } from "./dates.js";
import { type UrnIndex, byType, getPath, resolve } from "./normalizer.js";

export function parseExperience(index: UrnIndex): Experience[] {
  return byType(index, "profile.Position").map((position) => {
    const company = resolve(index, getPath(position, "*company"));
    const { startDate, endDate } = parseDateRange(getPath(position, "dateRange"));

    return {
      title: getPath<string>(position, "title") ?? null,
      companyName:
        getPath<string>(company, "name") ?? getPath<string>(position, "companyName") ?? null,
      companyUrn: getPath<string>(position, "*company") ?? null,
      companyLinkedinUrl: getPath<string>(company, "url") ?? null,
      companyLogoUrl: resolveCompanyLogo(company),
      employmentType: getPath<string>(position, "employmentType") ?? null,
      location: getPath<string>(position, "locationName") ?? null,
      description: getPath<string>(position, "description") ?? null,
      startDate,
      endDate,
      isCurrent: endDate === null,
      durationMonths: computeDurationMonths(startDate, endDate),
    };
  });
}

function resolveCompanyLogo(company: ReturnType<typeof resolve>): string | null {
  const vectorImage = getPath(company, "logo", "vectorImage");
  const rootUrl = getPath<string>(vectorImage, "rootUrl");
  const firstSegment = getPath<string>(
    vectorImage,
    "artifacts",
    "0",
    "fileIdentifyingUrlPathSegment",
  );
  return rootUrl && firstSegment ? rootUrl + firstSegment : null;
}
