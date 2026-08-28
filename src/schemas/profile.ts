import { z } from "zod";

export const DateFragment = z.object({
  month: z.number().int().min(1).max(12).nullable(),
  year: z.number().int().nullable(),
});
export type DateFragment = z.infer<typeof DateFragment>;

export const Location = z.object({
  full: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
});
export type Location = z.infer<typeof Location>;

export const Basics = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  fullName: z.string().nullable(),
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  location: Location.nullable(),
  industry: z.string().nullable(),
  pronouns: z.string().nullable(),
  followerCount: z.number().int().nullable(),
  connectionCount: z.number().int().nullable(),
  isPremium: z.boolean().nullable(),
  isInfluencer: z.boolean().nullable(),
  isOpenToWork: z.boolean().nullable(),
});
export type Basics = z.infer<typeof Basics>;

export const ImageVariant = z.object({
  url: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});
export type ImageVariant = z.infer<typeof ImageVariant>;

export const ResolvedImage = z.object({
  url: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  variants: z.array(ImageVariant).default([]),
});
export type ResolvedImage = z.infer<typeof ResolvedImage>;

export const Images = z.object({
  profilePicture: ResolvedImage.nullable(),
  backgroundImage: ResolvedImage.nullable(),
});
export type Images = z.infer<typeof Images>;

export const Experience = z.object({
  title: z.string().nullable(),
  companyName: z.string().nullable(),
  companyUrn: z.string().nullable(),
  companyLinkedinUrl: z.string().nullable(),
  companyLogoUrl: z.string().nullable(),
  employmentType: z.string().nullable(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  startDate: DateFragment.nullable(),
  endDate: DateFragment.nullable(),
  isCurrent: z.boolean(),
  durationMonths: z.number().int().nullable(),
});
export type Experience = z.infer<typeof Experience>;

export const Education = z.object({
  schoolName: z.string().nullable(),
  degreeName: z.string().nullable(),
  fieldOfStudy: z.string().nullable(),
  grade: z.string().nullable(),
  schoolLogoUrl: z.string().nullable(),
  startDate: DateFragment.nullable(),
  endDate: DateFragment.nullable(),
});
export type Education = z.infer<typeof Education>;

export const Skill = z.object({
  name: z.string().nullable(),
  endorsementCount: z.number().int().nullable(),
});
export type Skill = z.infer<typeof Skill>;

export const Certification = z.object({
  name: z.string().nullable(),
  authority: z.string().nullable(),
  licenseNumber: z.string().nullable(),
  url: z.string().nullable(),
  startDate: DateFragment.nullable(),
  endDate: DateFragment.nullable(),
});
export type Certification = z.infer<typeof Certification>;

export const Language = z.object({
  name: z.string().nullable(),
  proficiency: z.string().nullable(),
});
export type Language = z.infer<typeof Language>;

export const Volunteer = z.object({
  role: z.string().nullable(),
  organizationName: z.string().nullable(),
  cause: z.string().nullable(),
  description: z.string().nullable(),
  startDate: DateFragment.nullable(),
  endDate: DateFragment.nullable(),
});
export type Volunteer = z.infer<typeof Volunteer>;

export const Honor = z.object({
  title: z.string().nullable(),
  issuer: z.string().nullable(),
  description: z.string().nullable(),
  issueDate: DateFragment.nullable(),
});
export type Honor = z.infer<typeof Honor>;

export const Publication = z.object({
  title: z.string().nullable(),
  publisher: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  date: DateFragment.nullable(),
});
export type Publication = z.infer<typeof Publication>;

export const Project = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  startDate: DateFragment.nullable(),
  endDate: DateFragment.nullable(),
});
export type Project = z.infer<typeof Project>;

export const Meta = z.object({
  sectionsParsed: z.array(z.string()).default([]),
  sectionsFailed: z.array(z.string()).default([]),
  sourceEndpoint: z.string().nullable(),
  parseWarnings: z.array(z.string()).default([]),
});
export type Meta = z.infer<typeof Meta>;

export const ProfileResponse = z.object({
  profileUrl: z.string(),
  publicIdentifier: z.string(),
  urn: z.string().nullable(),
  fetchedAt: z.string().datetime(),
  cached: z.boolean(),
  basics: Basics,
  images: Images,
  experience: z.array(Experience).default([]),
  education: z.array(Education).default([]),
  skills: z.array(Skill).default([]),
  certifications: z.array(Certification).default([]),
  languages: z.array(Language).default([]),
  volunteer: z.array(Volunteer).default([]),
  honors: z.array(Honor).default([]),
  publications: z.array(Publication).default([]),
  projects: z.array(Project).default([]),
  meta: Meta,
});
export type ProfileResponse = z.infer<typeof ProfileResponse>;

export const ProfileRequestBody = z.object({
  url: z.string(),
  refresh: z.boolean().optional().default(false),
});
export type ProfileRequestBody = z.infer<typeof ProfileRequestBody>;
