-- Movimientos de inventario
CREATE TABLE IF NOT EXISTS public.pintao_stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text NOT NULL,
    product_id integer NOT NULL,
    size text NOT NULL,
    qty integer NOT NULL,
    type text NOT NULL CHECK (type IN ('DECREMENT', 'INCREMENT', 'ADJUST')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pintao_stock_movements_order_id_idx
    ON public.pintao_stock_movements (order_id);

CREATE INDEX IF NOT EXISTS pintao_stock_movements_product_id_idx
    ON public.pintao_stock_movements (product_id);

COMMENT ON TABLE public.pintao_stock_movements IS 'Auditoría de movimientos de stock. Cada decremento/restock genera un registro.';
