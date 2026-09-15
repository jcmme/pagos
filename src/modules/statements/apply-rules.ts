import { prisma } from "@/lib/prisma";
import { matchesPattern } from "@/lib/merchant";

export type RuleSuggestion = {
  categoryId: string;
  ruleId: string;
  confidence: number;
};

// Primero las reglas del usuario (gratis e instantáneas); solo lo que no
// coincide con ninguna regla necesita ayuda de la IA. Con el tiempo, y a
// medida que el usuario corrige, casi todo cae aquí.
export async function buildRuleMatcher() {
  const rules = await prisma.categoryRule.findMany({
    where: { active: true },
    orderBy: [{ priority: "desc" }, { hitCount: "desc" }],
  });

  return function match(description: string): RuleSuggestion | null {
    for (const rule of rules) {
      if (matchesPattern(description, rule.pattern, rule.matchType)) {
        return {
          categoryId: rule.categoryId,
          ruleId: rule.id,
          // Una regla explícita es una decisión del usuario, no una conjetura.
          confidence: 1,
        };
      }
    }
    return null;
  };
}

// Se llama al aprobar la bandeja, para que las reglas más usadas suban en la
// lista y se pueda ver cuáles realmente sirven.
export async function recordRuleHits(ruleIds: string[]) {
  const unique = [...new Set(ruleIds.filter(Boolean))];
  if (unique.length === 0) return;

  await prisma.categoryRule.updateMany({
    where: { id: { in: unique } },
    data: { hitCount: { increment: 1 }, lastUsedAt: new Date() },
  });
}
