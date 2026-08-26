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

export interface Order {
  id: string;
  customer: { name: string; email: string; phone: string };
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  status: string;
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
