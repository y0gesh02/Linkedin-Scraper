import type { Education } from "../schemas/profile.js";
import { parseDateRange } from "./dates.js";
import { type UrnIndex, byType, getPath, resolve } from "./normalizer.js";

export function parseEducation(index: UrnIndex): Education[] {
  return byType(index, "profile.Education").map((education) => {
    const school = resolve(index, getPath(education, "*school"));
    const { startDate, endDate } = parseDateRange(getPath(education, "dateRange"));
    const vectorImage = getPath(school, "logo", "vectorImage");
    const rootUrl = getPath<string>(vectorImage, "rootUrl");
    const firstSegment = getPath<string>(
      vectorImage,
      "artifacts",
      "0",
      "fileIdentifyingUrlPathSegment",
    );

    return {
      schoolName:
        getPath<string>(school, "name") ?? getPath<string>(education, "schoolName") ?? null,
      degreeName: getPath<string>(education, "degreeName") ?? null,
      fieldOfStudy: getPath<string>(education, "fieldOfStudy") ?? null,
      grade: getPath<string>(education, "grade") ?? null,
      schoolLogoUrl: rootUrl && firstSegment ? rootUrl + firstSegment : null,
      startDate,
      endDate,
    };
  });
}
