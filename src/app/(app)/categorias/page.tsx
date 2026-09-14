import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-[26px] font-semibold">Categorías</h1>
      <CategoriesClient categories={categories} />
    </div>
  );
}
