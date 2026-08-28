import type { Skill } from "../schemas/profile.js";
import { type UrnIndex, byType, getPath } from "./normalizer.js";

export function parseSkills(index: UrnIndex): Skill[] {
  return byType(index, "profile.Skill").map((skill) => ({
    name: getPath<string>(skill, "name") ?? null,
    endorsementCount: getPath<number>(skill, "endorsementCount") ?? null,
  }));
}
