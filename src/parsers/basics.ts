import type { Basics, Images } from "../schemas/profile.js";
import { resolveImage } from "./images.js";
import { type UrnIndex, byType, getPath, resolve } from "./normalizer.js";

function findProfileEntity(index: UrnIndex) {
  return byType(index, "profile.Profile")[0];
}

export function parseBasics(index: UrnIndex): Basics {
  const profile = findProfileEntity(index);

  const firstName = getPath<string>(profile, "firstName") ?? null;
  const lastName = getPath<string>(profile, "lastName") ?? null;
  const fullName = firstName || lastName ? [firstName, lastName].filter(Boolean).join(" ") : null;

  const city = getPath<string>(profile, "geoLocationName") ?? null;
  const country = getPath<string>(profile, "geoCountryName") ?? null;
  const full =
    getPath<string>(profile, "locationName") ?? (city && country ? `${city}, ${country}` : city);

  return {
    firstName,
    lastName,
    fullName,
    headline: getPath<string>(profile, "headline") ?? null,
    summary: getPath<string>(profile, "summary") ?? null,
    location: city || country || full ? { full: full ?? null, city, country } : null,
    industry: getPath<string>(profile, "industryName") ?? null,
    pronouns: getPath<string>(profile, "pronoun") ?? null,
    followerCount: getPath<number>(profile, "followersCount") ?? null,
    connectionCount: getPath<number>(profile, "connectionsCount") ?? null,
    isPremium: getPath<boolean>(profile, "premium") ?? false,
    isInfluencer: getPath<boolean>(profile, "influencer") ?? false,
    isOpenToWork: getPath<boolean>(profile, "openToWork") ?? false,
  };
}

export function parseImages(index: UrnIndex): Images {
  const profile = findProfileEntity(index);

  const profilePictureEntity = resolve(index, getPath(profile, "*profilePicture"));
  const backgroundImageEntity = resolve(index, getPath(profile, "*backgroundImage"));

  return {
    profilePicture: resolveImage(
      getPath(profilePictureEntity, "displayImageReference", "vectorImage"),
    ),
    backgroundImage: resolveImage(getPath(backgroundImageEntity, "backgroundImage", "vectorImage")),
  };
}
