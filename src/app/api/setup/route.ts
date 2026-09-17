import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { seedCategories } from "@/lib/seed-categories";

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
  // Quien arranca la instalación es el administrador: es el único que puede
  // dar de alta a los demás. Al reejecutar el setup no se le quita el rol.
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, role: "ADMIN", active: true },
    update: { passwordHash, role: "ADMIN", active: true },
  });

  const categories = await seedCategories(prisma);

  return NextResponse.json({ ok: true, user: email, categories });
}
