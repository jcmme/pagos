import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { RulesClient } from "./RulesClient";

export const dynamic = "force-dynamic";

export default async function ReglasPage() {
  const [rules, categories] = await Promise.all([
    prisma.categoryRule.findMany({
      include: { category: { include: { parent: { include: { parent: true } } } } },
      orderBy: [{ priority: "desc" }, { hitCount: "desc" }],
    }),
    prisma.category.findMany({
      where: { archived: false },
      include: { parent: { include: { parent: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return <RulesClient rules={serialize(rules)} categories={serialize(categories)} />;
}
