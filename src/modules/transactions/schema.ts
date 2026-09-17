import { z } from "zod";

export const TX_KINDS = ["EXPENSE", "INCOME", "TRANSFER"] as const;

const optionalId = z
  .string()
  .optional()
  .nullable()
  .transform((value) => (!value || value === "none" ? null : value));

export const transactionSchema = z
  .object({
    kind: z.enum(TX_KINDS).default("EXPENSE"),
    amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
    date: z.string().min(1, "La fecha es obligatoria"),
    categoryId: optionalId,
    accountId: optionalId,
    transferAccountId: optionalId,
    note: z.string().trim().max(200).optional(),
    description: z.string().trim().max(200).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
    excludeFromStats: z.coerce.boolean().default(false),
  })
  .refine(
    (data) => data.kind !== "TRANSFER" || (!!data.accountId && !!data.transferAccountId),
    {
      message: "Una transferencia necesita cuenta de origen y de destino",
      path: ["transferAccountId"],
    }
  )
  .refine((data) => data.accountId === null || data.accountId !== data.transferAccountId, {
    message: "La cuenta de origen y la de destino no pueden ser la misma",
    path: ["transferAccountId"],
  });

export type TransactionInput = z.infer<typeof transactionSchema>;

// La captura rápida: lo mínimo para no perder un gasto. Sin etiquetas, sin
// nota y sin transferencias, que son justo lo que hace lento el formulario
// largo. La fecha viene con default de hoy porque casi siempre es hoy.
export const quickTransactionSchema = z.object({
  kind: z.enum(["EXPENSE", "INCOME"]).default("EXPENSE"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  date: z.string().min(1, "La fecha es obligatoria"),
  categoryId: optionalId,
  accountId: optionalId,
  description: z.string().trim().max(200).optional(),
});

export type QuickTransactionInput = z.infer<typeof quickTransactionSchema>;

export const transactionFilterSchema = z.object({
  q: z.string().trim().optional(),
  kind: z.enum(TX_KINDS).optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  tag: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
});

export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
