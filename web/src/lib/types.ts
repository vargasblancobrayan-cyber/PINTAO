export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      pintao_orders: {
        Row: {
          id: string;
          customer: { name: string; email: string; phone: string };
          items: { productId: number; name: string; size: string; qty: number; unitPrice: number }[];
          subtotal: number;
          volume_discount: number;
          coupon: string | null;
          coupon_discount: number;
          shipping: number;
          total: number;
          payment_method: string;
          status: string;
          address: { line1: string; line2?: string; city: string; region: string; postalCode?: string } | null;
          shipping_method: string;
          created_at: string;
          payment_status: string | null;
          wompi_transaction_id: string | null;
          paid_at: string | null;
        };
        Insert: {
          id: string;
          customer: { name: string; email: string; phone: string };
          items: { productId: number; name: string; size: string; qty: number; unitPrice: number }[];
          subtotal: number;
          volume_discount: number;
          coupon: string | null;
          coupon_discount: number;
          shipping: number;
          total: number;
          payment_method: string;
          status: string;
          address: { line1: string; line2?: string; city: string; region: string; postalCode?: string } | null;
          shipping_method: string;
          created_at: string;
          payment_status?: string | null;
          wompi_transaction_id?: string | null;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          customer?: { name: string; email: string; phone: string };
          items?: { productId: number; name: string; size: string; qty: number; unitPrice: number }[];
          subtotal?: number;
          volume_discount?: number;
          coupon?: string | null;
          coupon_discount?: number;
          shipping?: number;
          total?: number;
          payment_method?: string;
          status?: string;
          address?: { line1: string; line2?: string; city: string; region: string; postalCode?: string } | null;
          shipping_method?: string;
          created_at?: string;
          payment_status?: string | null;
          wompi_transaction_id?: string | null;
          paid_at?: string | null;
        };
      };
      pintao_payment_attempts: {
        Row: {
          id: string;
          order_id: string;
          result: string;
          created_at: string;
        };
        Insert: {
          id: string;
          order_id: string;
          result: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          result?: string;
          created_at?: string;
        };
      };
      pintao_invoices: {
        Row: {
          id: string;
          order_id: string;
          numero: string;
          estado: string;
          emision: string;
          valida: string | null;
          cantidad_efectivo: number;
          cantidad_credito: number;
          created_at: string;
        };
        Insert: {
          id: string;
          order_id: string;
          numero: string;
          estado: string;
          emision?: string;
          valida?: string | null;
          cantidad_efectivo: number;
          cantidad_credito: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          numero?: string;
          estado?: string;
          emision?: string;
          valida?: string | null;
          cantidad_efectivo?: number;
          cantidad_credito?: number;
          created_at?: string;
        };
      };
      pintao_stock_movements: {
        Row: {
          id: string;
          order_id: string;
          product_id: number;
          size: string;
          qty: number;
          tipo: string;
          created_at: string;
        };
        Insert: {
          id: string;
          order_id: string;
          product_id: number;
          size: string;
          qty: number;
          tipo: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: number;
          size?: string;
          qty?: number;
          tipo?: string;
          created_at?: string;
        };
      };
      pintao_dimensions: {
        Row: {
          id: string;
          order_id: string;
          tipo: string;
          valor: number;
          created_at: string;
        };
        Insert: {
          id: string;
          order_id: string;
          tipo: string;
          valor: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          tipo?: string;
          valor?: number;
          created_at?: string;
        };
      };
      pintao_filing_audit: {
        Row: {
          id: string;
          order_id: string;
          doc_type: string;
          numero: string;
          emision: string;
          estado: string;
          file_ref: string | null;
          enviado_a_cliente: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          order_id: string;
          doc_type: string;
          numero: string;
          emision?: string;
          estado?: string;
          file_ref?: string | null;
          enviado_a_cliente?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          doc_type?: string;
          numero?: string;
          emision?: string;
          estado?: string;
          file_ref?: string | null;
          enviado_a_cliente?: boolean;
          created_at?: string;
        };
      };
      pintao_order_tracking: {
        Row: {
          id: string;
          order_id: string;
          estado: string;
          observacion: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          order_id: string;
          estado: string;
          observacion?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          estado?: string;
          observacion?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pintao_admin_users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          password_hash: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          role?: string;
          created_at?: string;
        };
      };
      pintao_quotes: {
        Row: {
          id: string;
          name: string;
          phone: string;
          quantity: string | null;
          message: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          phone: string;
          quantity: string | null;
          message: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          quantity?: string | null;
          message?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      pintao_newsletter: {
        Row: {
          email: string;
          created_at: string;
        };
        Insert: {
          email: string;
          created_at?: string;
        };
        Update: {
          email?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      decrement_stock: {
        Args: { p_items: { productId: number; size: string; qty: number }[] };
        Returns: void;
      };
      get_active_products: {
        Args: Record<string, never>;
        Returns: { id: number; name: string; price: number; category: string; color: string; sizes: string[]; stock: number }[];
      };
      get_order_by_id: {
        Args: { p_order_id: string };
        Returns: {
          id: string;
          customer: { name: string; email: string; phone: string };
          items: { productId: number; name: string; size: string; qty: number; unitPrice: number }[];
          subtotal: number;
          volume_discount: number;
          coupon: string | null;
          coupon_discount: number;
          shipping: number;
          total: number;
          payment_method: string;
          status: string;
          address: { line1: string; line2?: string; city: string; region: string; postalCode?: string } | null;
          shipping_method: string;
          created_at: string;
        } | null;
      };
      get_stats: {
        Args: Record<string, never>;
        Returns: {
          products: number;
          stock: number;
          orders: number;
          revenue: number;
          pending: number;
        };
      };
    };
    Enums: {
      pintao_order_status:
        | "Pendiente de confirmación"
        | "Pagado"
        | "Enviado"
        | "Completado"
        | "Cancelado";
      pintao_payment_result: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
      pintao_doc_type: "FACTURA" | "GUIA_REMISION" | "TICKET";
      pintao_order_tracking_estado:
        | "CREADO"
        | "PAGO_CONFIRMADO"
        | "ENVIADO"
        | "ENTREGADO"
        | "DEVUELTO";
    };
    Actions: {};
  };
}

export type PintaoOrderStatus = "Pendiente de confirmación" | "Pagado" | "Enviado" | "Completado" | "Cancelado";
export type PintaoPaymentResult = "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
export type PintaoDocType = "FACTURA" | "GUIA_REMISION" | "TICKET";
export type PintaoOrderTrackingEstado = "CREADO" | "PAGO_CONFIRMADO" | "ENVIADO" | "ENTREGADO" | "DEVUELTO";

export interface Order {
  id: string;
  customer: { name: string; email: string; phone: string };
  items: OrderItem[];
  subtotal: number;
  volume_discount: number;
  coupon?: string;
  coupon_discount: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  status: string;
  address?: { line1: string; line2?: string; city: string; region: string; postalCode?: string };
  shippingMethod: string;
  createdAt: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  size: string;
  qty: number;
  unitPrice: number;
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
  gallery: string[];
  description: string;
  variants: { size: string; color: string; stock: number; sku: string }[];
  tag: "NUEVO" | "DESTACADO";
  active: boolean;
}

export interface Variant {
  size: string;
  color: string;
  stock: number;
  sku: string;
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
export interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
}
export interface CartItem {
  productId: number;
  size: string;
  qty: number;
}
export type ShippingMethod = "recoge" | "envio" | "expreso";
export type PaymentMethod = "Transferencia" | "Enlace de pago" | "PSE" | "Contraentrega";
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode?: string;
}
