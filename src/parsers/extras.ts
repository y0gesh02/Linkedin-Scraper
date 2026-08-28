import type { Honor, Project, Publication, Volunteer } from "../schemas/profile.js";
import { parseDateFragment, parseDateRange } from "./dates.js";
import { type UrnIndex, byType, getPath } from "./normalizer.js";

export function parseVolunteer(index: UrnIndex): Volunteer[] {
  return byType(index, "profile.VolunteerExperience").map((entry) => {
    const { startDate, endDate } = parseDateRange(getPath(entry, "dateRange"));
    return {
      role: getPath<string>(entry, "role") ?? null,
      organizationName: getPath<string>(entry, "companyName") ?? null,
      cause: getPath<string>(entry, "cause") ?? null,
      description: getPath<string>(entry, "description") ?? null,
      startDate,
      endDate,
    };
  });
}

export function parseHonors(index: UrnIndex): Honor[] {
  return byType(index, "profile.Honor").map((entry) => ({
    title: getPath<string>(entry, "title") ?? null,
    issuer: getPath<string>(entry, "issuer") ?? null,
    description: getPath<string>(entry, "description") ?? null,
    issueDate: parseDateFragment(getPath(entry, "issueDate")),
  }));
}

export function parsePublications(index: UrnIndex): Publication[] {
  return byType(index, "profile.Publication").map((entry) => ({
    title: getPath<string>(entry, "name") ?? null,
    publisher: getPath<string>(entry, "publisher") ?? null,
    description: getPath<string>(entry, "description") ?? null,
    url: getPath<string>(entry, "url") ?? null,
    date: parseDateFragment(getPath(entry, "date")),
  }));
}

export function parseProjects(index: UrnIndex): Project[] {
  return byType(index, "profile.Project").map((entry) => {
    const { startDate, endDate } = parseDateRange(getPath(entry, "dateRange"));
    return {
      title: getPath<string>(entry, "title") ?? null,
      description: getPath<string>(entry, "description") ?? null,
      url: getPath<string>(entry, "url") ?? null,
      startDate,
      endDate,
    };
  });
}
