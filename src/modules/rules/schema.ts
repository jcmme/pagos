import { z } from "zod";

export const RULE_MATCH_TYPES = ["CONTAINS", "STARTS_WITH", "EXACT", "REGEX"] as const;

export const ruleSchema = z.object({
  pattern: z.string().trim().min(2, "El texto a buscar es muy corto").max(80),
  matchType: z.enum(RULE_MATCH_TYPES).default("CONTAINS"),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  priority: z.coerce.number().int().min(0).max(100).default(0),
});

export type RuleInput = z.infer<typeof ruleSchema>;
