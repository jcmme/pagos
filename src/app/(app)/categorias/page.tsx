import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categories = await prisma.category.findMany({
    include: { parent: true, _count: { select: { transactions: true, children: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return <CategoriesClient categories={serialize(categories)} />;
}
