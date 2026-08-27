import { z } from "zod";
import { COUPONS } from "./pricing";

/** Schema de la solicitud de pedido enviada por el cliente (checkout). */
export const orderInputSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, "Nombre requerido").max(80),
    email: z.string().trim().email("Correo inválido").max(120).transform((v) => v.toLowerCase()),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v.length >= 7 && v.length <= 20, "WhatsApp inválido"),
  }),
  paymentMethod: z.string().trim().max(60).default("Transferencia"),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        size: z.string().trim().max(20),
        qty: z.number().int().min(1).max(48),
      }),
    )
    .min(1, "El pedido debe tener al menos un producto"),
  coupon: z.string().trim().max(20).optional(),
});