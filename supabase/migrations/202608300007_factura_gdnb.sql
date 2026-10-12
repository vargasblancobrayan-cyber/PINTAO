-- Copia de auditoría de facturación
CREATE TABLE IF NOT EXISTS public.pintao_filing_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text NOT NULL,
    doc_type text NOT NULL CHECK (doc_type IN ('FACTURA', 'GUIA_REMISION', 'TICKET')),
    numero text NOT NULL,
    emision timestamp without time zone NOT NULL DEFAULT now(),
    estado text NOT NULL DEFAULT 'PENDIENTE',
    file_ref text,
    enviado_a_cliente boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pintao_filing_audit_order_id_idx
    ON public.pintao_filing_audit (order_id);

CREATE INDEX IF NOT EXISTS pintao_filing_audit_doc_type_idx
    ON public.pintao_filing_audit (doc_type);

COMMENT ON TABLE public.pintao_filing_audit IS 'Registro de archivos emitidos (factura, guía de remisión, ticket) y estado de envío al cliente.';
