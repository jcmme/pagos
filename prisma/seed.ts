import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_CATEGORIES = [
  { name: "Comida", color: "#0a84ff" },
  { name: "Transporte", color: "#30d158" },
  { name: "Vivienda", color: "#ff9f0a" },
  { name: "Servicios", color: "#ff453a" },
  { name: "Ocio", color: "#bf5af2" },
  { name: "Salud", color: "#64d2ff" },
  { name: "Otros", color: "#a1a1a6" },
];

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

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      create: category,
      update: {},
    });
  }
  console.log("Categorías por defecto listas.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
