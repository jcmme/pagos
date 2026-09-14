import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "Comida", color: "#0a84ff" },
  { name: "Transporte", color: "#30d158" },
  { name: "Vivienda", color: "#ff9f0a" },
  { name: "Servicios", color: "#ff453a" },
  { name: "Ocio", color: "#bf5af2" },
  { name: "Salud", color: "#64d2ff" },
  { name: "Otros", color: "#a1a1a6" },
];

export async function GET(req: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET;
  const provided = req.nextUrl.searchParams.get("secret");
  if (!setupSecret || provided !== setupSecret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      { error: "ADMIN_EMAIL/ADMIN_PASSWORD no configurados" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      create: category,
      update: {},
    });
  }

  return NextResponse.json({ ok: true, user: email, categories: DEFAULT_CATEGORIES.length });
}
