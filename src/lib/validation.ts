import { z } from "zod";
export const messageSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  companyName: z.string().trim().min(2).max(150),
  contactNumber: z
    .string()
    .trim()
    .regex(/^[+\d\s()\-]{7,25}$/),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
export const publication = z.enum(["Draft", "Published", "Archived"]);
export const releaseSchema = z.object({
  applicationName: z.string().trim().min(2).max(100),
  version: z.string().trim().min(1).max(40),
  description: z.string().trim().min(10).max(3000),
  releaseNotes: z.string().max(5000),
  releaseStatus: z.enum([
    "Coming Soon",
    "Under Development",
    "Internal Testing",
    "Beta Testing",
    "Released",
    "Temporarily Unavailable",
  ]),
  publicationStatus: publication,
  fileId: z.string().nullable().optional(),
  iconPath: z.string().max(200).default(""),
  screenshotPaths: z.array(z.string().max(200)).max(6).default([]),
  releaseDate: z.string().nullable().optional(),
});
export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  category: z.enum([
    "Corporate update",
    "Application development",
    "Release announcement",
    "Important notice",
    "Maintenance",
  ]),
  imagePath: z.string().max(200).default(""),
  status: publication,
});
