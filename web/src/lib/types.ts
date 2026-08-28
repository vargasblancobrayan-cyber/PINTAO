export interface Variant {
  size: string;
  color: string;
  stock: number;
  sku: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  category: string;
  color: string;
  sizes: string[];
  stock: number;
  img: string;
  /** Galería multi-imagen del producto (la primera es la principal). */
  gallery: string[];
  description: string;
  variants: Variant[];
  tag: "NUEVO" | "DESTACADO";
  active: boolean;
}

export interface CartItem {
  productId: number;
  size: string;
  qty: number;
}

export interface OrderItem {
  productId: number;
  name: string;
  size: string;
  qty: number;
  unitPrice: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode?: string;
}

export type ShippingMethod = "recoge" | "envio" | "expreso";

export type PaymentMethod = "Transferencia" | "Enlace de pago" | "PSE" | "Contraentrega";

export interface Order {
  id: string;
  customer: { name: string; email: string; phone: string };
  items: OrderItem[];
  subtotal: number;
  volumeDiscount: number;
  coupon?: string;
  couponDiscount: number;
  shipping: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: string;
  /** Dirección de destino (aplica cuando shippingMethod es envío. */
  address?: Address;
  shippingMethod: ShippingMethod;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
}

export interface Quote {
  id: string;
  name: string;
  phone: string;
  quantity: string;
  message: string;
  status: string;
  createdAt: string;
}
