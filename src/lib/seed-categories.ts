import type { PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "./default-categories";

// Los colores que traían las categorías iniciales antes de que la paleta se
// validara para daltonismo. Se reemplazan al resembrar; un color que el
// usuario haya elegido a mano no está en esta lista y no se toca.
const LEGACY_COLORS = new Set([
  "#0a84ff",
  "#30d158",
  "#ff9f0a",
  "#ff453a",
  "#bf5af2",
  "#64d2ff",
  "#ffd60a",
  "#ff375f",
]);

// Idempotente: se puede correr las veces que haga falta sin duplicar nada ni
// pisar las categorías que el usuario haya creado.
export async function seedCategories(prisma: PrismaClient): Promise<number> {
  let count = 0;

  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    const existing = await prisma.category.findFirst({
      where: { name: category.name, parentId: null },
    });

    const parent = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: {
            essential: category.essential,
            sortOrder: index,
            ...(LEGACY_COLORS.has(existing.color) ? { color: category.color } : {}),
          },
        })
      : await prisma.category.create({
          data: {
            name: category.name,
            color: category.color,
            essential: category.essential,
            sortOrder: index,
          },
        });

    count += 1;

    for (const [childIndex, childName] of category.children.entries()) {
      const child = await prisma.category.findFirst({
        where: { name: childName, parentId: parent.id },
      });

      if (child) {
        if (LEGACY_COLORS.has(child.color)) {
          await prisma.category.update({
            where: { id: child.id },
            data: { color: category.color },
          });
        }
        continue;
      }

      await prisma.category.create({
        data: {
          name: childName,
          color: category.color,
          essential: category.essential,
          parentId: parent.id,
          sortOrder: childIndex,
        },
      });
      count += 1;
    }
  }

  return count;
}
