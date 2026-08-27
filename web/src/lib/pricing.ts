import { volumeDiscount } from "./format";

/** Envío: gratis a partir de este subtotal (tras descuentos), si no tarifa plana. */
export const FREE_SHIPPING_THRESHOLD = 250000;
export const FLAT_SHIPPING_COP = 8990;

/** Cupones promocionales válidos (código → % de descuento sobre el total tras volumen). */
export const COUPONS: Record<string, number> = {
  PINTAO10: 0.1,
  DROP01: 0.08,
};

export interface Coupon {
  code: string;
  rate: number;
}

export interface PricingArgs {
  subtotal: number; // suma de precios base (sin ningún descuento)
  totalQty: number;
  couponCode?: string;
}

export interface PricingResult {
  unitRate: number; // descuento por volumen aplicado (0-1)
  volumeDiscount: number; // descuento por volumen (COP)
  afterVolume: number; // subtotal tras descuento por volumen
  coupon?: Coupon;
  couponDiscount: number; // descuento del cupón (COP)
  afterCoupon: number; // subtotal tras volumen + cupón
  shipping: number; // costo de envío (0 si hay envío gratis)
  freeShipping: boolean;
  total: number; // total final a pagar
}

/**
 * Pricing unificado del pedido: descuento por volumen + cupón + envío.
 * Se usa en el carrito y en el checkout para que siempre cuadren.
 */
export function computePricing({ subtotal, totalQty, couponCode }: PricingArgs): PricingResult {
  const unitRate = volumeDiscount(totalQty);
  const afterVolume = Math.round(subtotal * (1 - unitRate));
  const volumeDiscountTotal = subtotal - afterVolume;

  const couponRate = couponCode?.trim().toUpperCase() && COUPONS[couponCode.trim().toUpperCase()];
  const coupon: Coupon | undefined = couponRate
    ? { code: couponCode!.trim().toUpperCase(), rate: couponRate }
    : undefined;
  const couponDiscount = coupon ? Math.round(afterVolume * coupon.rate) : 0;
  const afterCoupon = afterVolume - couponDiscount;

  const freeShipping = afterCoupon >= FREE_SHIPPING_THRESHOLD;
  const shipping = freeShipping ? 0 : FLAT_SHIPPING_COP;

  return {
    unitRate,
    volumeDiscount: volumeDiscountTotal,
    afterVolume,
    coupon,
    couponDiscount,
    afterCoupon,
    shipping,
    freeShipping,
    total: afterCoupon + shipping,
  };
}