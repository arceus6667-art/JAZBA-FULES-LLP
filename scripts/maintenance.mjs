import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  await db.$transaction([
    db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    db.visitorSession.deleteMany({
      where: { lastSeenAt: { lt: new Date(Date.now() - 90 * 86400000) } },
    }),
  ]);
  console.log(
    "Expired sessions, rate-limit counters and analytics older than 90 days removed.",
  );
} finally {
  await db.$disconnect();
}
