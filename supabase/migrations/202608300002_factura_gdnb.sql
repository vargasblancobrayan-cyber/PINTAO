-- Factura y Guía de Remisión
CREATE TABLE IF NOT EXISTS public.pintao_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text NOT NULL UNIQUE,
    numero text NOT NULL,
    estado text NOT NULL DEFAULT 'PENDIENTE',
    emision timestamp without time zone NOT NULL DEFAULT now(),
    valida timestamp without time zone,
    cantidad_efectivo numeric(10,2) NOT NULL DEFAULT 0,
    cantidad_credito numeric(10,2) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pintao_invoices_order_id_idx
    ON public.pintao_invoices (order_id);

CREATE INDEX IF NOT EXISTS pintao_invoices_estado_idx
    ON public.pintao_invoices (estado);

COMMENT ON TABLE public.pintao_invoices IS 'Facturas de venta y/guía de remisión emitidas para cada pedido. Cumple LOPD 1581. Prefijo: FST-YYYYMMDD-####';
