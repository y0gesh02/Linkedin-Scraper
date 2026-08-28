import { type Entity, getPath } from "./normalizer.js";

export interface ImageVariant {
  url: string;
  width: number;
  height: number;
}

export interface ResolvedImage {
  url: string;
  width: number;
  height: number;
  variants: ImageVariant[];
}

interface Artifact {
  width: number;
  height: number;
  fileIdentifyingUrlPathSegment: string;
}

/**
 * LinkedIn returns a vector image (a rootUrl plus a ladder of sized
 * artifacts), not a single URL. Returns the largest artifact by width as
 * the primary url, and the full ladder as variants. These are signed
 * media.licdn.com URLs that expire, typically within weeks.
 */
export function resolveImage(vectorImage: unknown): ResolvedImage | null {
  const entity = vectorImage as Entity | undefined;
  const rootUrl = getPath<string>(entity, "rootUrl");
  const artifactsRaw = getPath<unknown[]>(entity, "artifacts");

  if (typeof rootUrl !== "string" || !Array.isArray(artifactsRaw)) {
    return null;
  }

  const artifacts = artifactsRaw
    .filter(isArtifact)
    .map((artifact) => ({
      url: rootUrl + artifact.fileIdentifyingUrlPathSegment,
      width: artifact.width,
      height: artifact.height,
    }))
    .sort((a, b) => b.width - a.width);

  const largest = artifacts[0];
  if (!largest) return null;

  return {
    url: largest.url,
    width: largest.width,
    height: largest.height,
    variants: artifacts,
  };
}

function isArtifact(value: unknown): value is Artifact {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Artifact).width === "number" &&
    typeof (value as Artifact).height === "number" &&
    typeof (value as Artifact).fileIdentifyingUrlPathSegment === "string"
  );
}
