import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
  password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 14) {
  console.error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 14 characters) in your environment.",
  );
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const db = new PrismaClient();
try {
  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing && !process.argv.includes("--reset"))
    throw new Error(
      "Administrator exists. Use --reset to explicitly rotate the password and revoke sessions.",
    );
  await db.$transaction(async (tx) => {
    const user = await tx.adminUser.upsert({
      where: { email },
      create: {
        email,
        passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
      },
      update: {
        passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
      },
    });
    await tx.adminSession.deleteMany({ where: { adminId: user.id } });
    await tx.auditLog.create({
      data: {
        administratorId: user.id,
        action: existing
          ? "Password reset via CLI"
          : "Administrator provisioned",
        entityType: "AdminUser",
        entityId: user.id,
      },
    });
  });
  console.log("Administrator provisioned. Credentials were not printed.");
} finally {
  await db.$disconnect();
}
