import type { Language } from "../schemas/profile.js";
import { type UrnIndex, byType, getPath } from "./normalizer.js";

export function parseLanguages(index: UrnIndex): Language[] {
  return byType(index, "profile.Language").map((language) => ({
    name: getPath<string>(language, "name") ?? null,
    proficiency: getPath<string>(language, "proficiency") ?? null,
  }));
}
