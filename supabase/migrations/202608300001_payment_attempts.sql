-- Payment attempts table
CREATE TABLE IF NOT EXISTS public.pintao_payment_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text NOT NULL,
    result text NOT NULL CHECK (result IN ('APPROVED', 'DECLINED', 'VOIDED', 'ERROR')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pintao_payment_attempts_order_id_idx
    ON public.pintao_payment_attempts (order_id);

CREATE INDEX IF NOT EXISTS pintao_payment_attempts_result_idx
    ON public.pintao_payment_attempts (result);

COMMENT ON TABLE public.pintao_payment_attempts IS 'Registro de intentos de pago por pedido (Wompi/Webhooks).';
