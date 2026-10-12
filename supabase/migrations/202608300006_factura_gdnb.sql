-- Números de factura y emisión
CREATE TABLE IF NOT EXISTS public.factura_seq (
    seq integer PRIMARY KEY DEFAULT 1
);

INSERT INTO public.factura_seq (seq) VALUES (1)
ON CONFLICT (seq) DO NOTHING;

COMMENT ON TABLE public.factura_seq IS 'Secuencia de numeración de facturas.';
