import { z } from "zod";

const month = z.coerce.number().int().min(1).max(12);
const year = z.coerce.number().int().min(2000).max(2100);

export const monthIncomeSchema = z.object({
  amount: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  month,
  year,
});

export const baseIncomeSchema = z.object({
  amount: z.coerce.number().positive("El sueldo debe ser mayor a 0"),
});

export const incomeModeSchema = z.enum(["FIJO", "VARIABLE"]);
