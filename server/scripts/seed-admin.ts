import { prisma } from "../src/lib/prisma.js";
import { env } from "../src/lib/env.js";
import { hashPassword } from "../src/lib/password.js";

async function main() {
  if (!env.admin.email || !env.admin.password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }
  const email = env.admin.email.toLowerCase();
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }
  await prisma.adminUser.create({
    data: {
      email,
      passwordHash: await hashPassword(env.admin.password),
      name: env.admin.name,
      role: "super_admin",
    },
  });
  console.log(`Seeded super_admin: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());