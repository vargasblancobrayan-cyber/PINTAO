-- Dimensiones de ventas
CREATE TABLE IF NOT EXISTS public.pintao_dimensions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('CANTIDAD', 'FACTURA', 'TOTAL')),
    valor numeric(12,2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pintao_dimensions_order_id_idx
    ON public.pintao_dimensions (order_id);

CREATE INDEX IF NOT EXISTS pintao_dimensions_tipo_idx
    ON public.pintao_dimensions (tipo);

COMMENT ON TABLE public.pintao_dimensions IS 'Dimensiones de ventas por pedido: cantidad, factura, total. Usadas para reportes.';
