import { z } from "zod";

export const ACCOUNT_TYPES = [
  "CHECKING",
  "SAVINGS",
  "CASH",
  "CREDIT_CARD",
  "INVESTMENT",
  "LOAN",
] as const;

export const accountSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  type: z.enum(ACCOUNT_TYPES),
  institution: z.string().trim().max(60).optional(),
  last4: z.string().trim().max(4).optional(),
  initialBalance: z.coerce.number().default(0),
  creditLimit: z.coerce.number().min(0).optional().nullable(),
  liquid: z.coerce.boolean().default(true),
  includeInNetWorth: z.coerce.boolean().default(true),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").default("#0a84ff"),
});

export type AccountInput = z.infer<typeof accountSchema>;
