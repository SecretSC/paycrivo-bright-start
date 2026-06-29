import { prisma } from "../src/lib/prisma.js";
import { DEFAULT_SETTINGS } from "../src/lib/settings.js";

async function main() {
  await prisma.settings.upsert({
    where: { id: "global" },
    create: { id: "global", json: DEFAULT_SETTINGS },
    update: {},
  });
  console.log("Settings seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());