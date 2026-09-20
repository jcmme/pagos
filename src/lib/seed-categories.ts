import type { PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "./default-categories";
import { guessIcon } from "./category-icons";

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

// El icono se deduce del nombre y solo se escribe donde no hay ninguno, igual
// que ya se hace con el color: resembrar nunca debe pisar lo que alguien
// eligió a mano. Una categoría con nombre propio, como el de una escuela, no
// casa con ninguna pista y se queda con su inicial, que es lo correcto.
function iconPatch(name: string, current: string | null) {
  if (current) return {};
  const icon = guessIcon(name);
  return icon ? { icon } : {};
}

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
            ...iconPatch(category.name, existing.icon),
          },
        })
      : await prisma.category.create({
          data: {
            name: category.name,
            color: category.color,
            essential: category.essential,
            sortOrder: index,
            ...iconPatch(category.name, null),
          },
        });

    count += 1;

    for (const [childIndex, childName] of category.children.entries()) {
      const child = await prisma.category.findFirst({
        where: { name: childName, parentId: parent.id },
      });

      if (child) {
        const patch = {
          ...(LEGACY_COLORS.has(child.color) ? { color: category.color } : {}),
          ...iconPatch(childName, child.icon),
        };
        if (Object.keys(patch).length > 0) {
          await prisma.category.update({ where: { id: child.id }, data: patch });
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
          ...iconPatch(childName, null),
        },
      });
      count += 1;
    }
  }

  // La marca de ahorro solo se pone si no hay ninguna: si la persona la movió
  // a otra categoría, resembrar no debe devolverla a "Ahorro".
  const marked = await prisma.category.count({ where: { savings: true } });
  if (marked === 0) {
    const fallback = DEFAULT_CATEGORIES.find((category) => category.savings);
    const target = fallback
      ? await prisma.category.findFirst({ where: { name: fallback.name, parentId: null } })
      : null;
    if (target) {
      await prisma.category.update({ where: { id: target.id }, data: { savings: true } });
    }
  }

  // Las categorías que creó el usuario también merecen icono. Solo se tocan
  // las que no tienen ninguno, y las que no casan con ninguna pista —un
  // nombre propio como "Loreto"— se quedan con su inicial.
  const withoutIcon = await prisma.category.findMany({
    where: { icon: null },
    select: { id: true, name: true },
  });
  for (const category of withoutIcon) {
    const icon = guessIcon(category.name);
    if (!icon) continue;
    await prisma.category.update({ where: { id: category.id }, data: { icon } });
  }

  return count;
}
