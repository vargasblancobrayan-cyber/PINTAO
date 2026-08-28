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
  paymentMethod: z
    .enum(["Transferencia", "Enlace de pago", "PSE", "Contraentrega"])
    .default("Transferencia"),
  shippingMethod: z.enum(["recoge", "envio", "expreso"]).default("envio"),
  address: z
    .object({
      line1: z.string().trim().min(4, "Dirección muy corta").max(120),
      line2: z.string().trim().max(120).optional(),
      city: z.string().trim().min(2, "Ciudad requerida").max(80),
      region: z.string().trim().min(2, "Departamento requerido").max(80),
      postalCode: z.string().trim().max(12).optional(),
    })
    .optional(),
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