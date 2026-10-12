-- Función: refund_stock
-- Restaura el stock de un pedido cuando se cancela o se reembolsa.
DROP FUNCTION IF EXISTS public.refund_stock;
CREATE OR REPLACE FUNCTION public.refund_stock(p_order_id text)
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT i.product_id, i.size, i.qty
        FROM pintao_orders o
        CROSS JOIN LATERAL unnest(o.items) i
        WHERE o.id = p_order_id
    LOOP
        UPDATE pintao_store
        SET data = jsonb_set(
            data,
            ARRAY['variants'],
            (
                SELECT jsonb_agg(
                    CASE WHEN v.size = r.size
                         THEN jsonb_set(v::jsonb, ARRAY['stock'], to_jsonb((v.stock + r.qty)::int)::jsonb)
                         ELSE v END
                )
                FROM jsonb_array_elements(data->'variants') v
            )::jsonb
        )
        WHERE id = 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
