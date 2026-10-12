-- Seguimiento de pedidos y notificación automática
CREATE TABLE IF NOT EXISTS public.pintao_order_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text NOT NULL,
    estado text NOT NULL DEFAULT 'CREADO',
    observacion text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pintao_order_tracking_order_id_idx
    ON public.pintao_order_tracking (order_id);

COMMENT ON TABLE public.pintao_order_tracking IS 'Seguimiento de estado de pedidos: CREADO, PAGO_CONFIRMADO, ENVIADO, ENTREGADO, DEVUELTO.';
