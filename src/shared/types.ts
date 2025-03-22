import { z } from "zod";

// Esquema para os parâmetros do Odoo
export const OdooParamsSchema = z.object({
  enderecoOdoo: z.string().url(),
  database: z.string(),
  userId: z.number(),
  password: z.string(),
  model: z.string(),
  method: z.string(),
  fields: z.array(z.string())
});

export type OdooParams = z.infer<typeof OdooParamsSchema>;

// Resposta do Odoo
export interface OdooResponse {
  result: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}