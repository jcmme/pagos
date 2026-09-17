import { prisma } from "@/lib/prisma";

// Una cuenta que llega como id desde un formulario puede ser de otra persona.
// Devuelve el id solo si de verdad es tuyo; si no, null, que equivale a "sin
// cuenta asignada" y nunca a la cuenta de alguien más.
export async function statementImportOwner(
  userId: string,
  accountId: string | null
): Promise<string | null> {
  if (!accountId) return null;
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });
  return account?.id ?? null;
}
