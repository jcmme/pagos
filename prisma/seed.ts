import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { seedCategories } from "../src/lib/seed-categories";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash },
      update: { passwordHash },
    });
    console.log(`Usuario admin listo: ${email}`);
  } else {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD no definidos, no se creó usuario.");
  }

  const categories = await seedCategories(prisma);
  console.log(`Categorías por defecto listas (${categories}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
