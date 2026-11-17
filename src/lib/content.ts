import { db } from "./db";
export const COMPANY = {
  name: "JAZBA FUELS LLP",
  tagline: "Doorstep Diesel Delivery",
  llpin: "AAV-6067",
  address:
    "Shop No. 9, Ashapura Shopping Center, C.S.C. Road-02, Opposite SVC Bank, Anand Nagar, Dahisar East, Mumbai – 400068.",
  description:
    "Jazba Fuels LLP is a Mumbai-based enterprise focused on modernising commercial fuel logistics through professionalism, technology and customer-centric business practices.",
};
export const settingKeys = [
  "companyDescription",
  "officeAddress",
  "contactEmail",
  "contactPhone",
  "maintenanceNotice",
  "seoTitle",
  "seoDescription",
  "footerInformation",
] as const;
export async function publicContent() {
  const [settings, announcements, release] = await Promise.all([
    db.websiteSetting.findMany(),
    db.announcement.findMany({
      where: { status: "Published" },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    db.applicationRelease.findFirst({
      where: { publicationStatus: "Published" },
      orderBy: { publishedAt: "desc" },
      include: { file: true },
    }),
  ]);
  return {
    settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
    announcements,
    release,
  };
}
