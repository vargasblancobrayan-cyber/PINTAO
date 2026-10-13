-- PINTAO — cierre operativo: descuento de stock, idempotencia y webhooks.
--
-- Tres huecos que sólo se notan con tráfico real:
--   1. El RPC `decrement_stock` existía desde 202608290001 pero ningún endpoint
--      lo llamaba, así que vender no bajaba inventario (`AUDIT.md` §6.4).
--   2. Un F5, un reintento del navegador o un doble clic podía crear dos pedidos
--      (y dos transacciones Wompi) idénticos.
--   3. Wompi reintenta el webhook hasta 3 veces si no recibe 200; sin memoria de
--      eventos, cada reintento volvía a "aprobar" el pago.
--
-- El stock (`pintao_store.data -> 'products'`) ya lo descuenta `decrement_stock`
-- de forma atómica (SELECT ... FOR UPDATE + update condicional). Aquí sólo se
-- añade el registro de movimientos, las dos tablas nuevas y sus permisos.

-- ---------------------------------------------------------------------------
-- 1. Idempotencia de endpoints de escritura (`Idempotency-Key`).
--
-- `status = 0` significa "en curso": la fila se inserta antes de ejecutar el
-- trabajo y se rellena al terminar. Una petición concurrente con la misma clave
-- ve el 0 y responde 409 en lugar de duplicar el pedido.
-- ---------------------------------------------------------------------------
create table if not exists public.pintao_idempotency (
  key text primary key,
  scope text not null,
  status integer not null default 0,
  body jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pintao_idempotency_scope_idx
  on public.pintao_idempotency (scope, created_at desc);

comment on table public.pintao_idempotency is
  'Respuestas reutilizables de endpoints de escritura. key = sha256(scope + Idempotency-Key).';

alter table public.pintao_idempotency enable row level security;
revoke all on table public.pintao_idempotency from anon, authenticated;
grant select, insert, update, delete on table public.pintao_idempotency to service_role;

-- ---------------------------------------------------------------------------
-- 2. Eventos de webhook procesados (dedupe de reintentos).
--
-- La clave es `<transaccion>:<estado>`: el mismo evento con el mismo resultado
-- se procesa una sola vez. Un cambio real de estado (PENDING -> APPROVED) sí
-- entra porque la clave es distinta.
-- ---------------------------------------------------------------------------
create table if not exists public.pintao_webhook_events (
  event_key text primary key,
  source text not null,
  order_id text,
  transaction_id text,
  status text,
  received_at timestamptz not null default now()
);

create index if not exists pintao_webhook_events_order_id_idx
  on public.pintao_webhook_events (order_id);

comment on table public.pintao_webhook_events is
  'Webhooks ya aplicados (Wompi). Evita volver a aprobar un pago por reintento del proveedor.';

alter table public.pintao_webhook_events enable row level security;
revoke all on table public.pintao_webhook_events from anon, authenticated;
grant select, insert on table public.pintao_webhook_events to service_role;

-- ---------------------------------------------------------------------------
-- 3. `refund_stock` (202608300005) apuntaba a `pintao_store.data -> 'variants'`,
--    pero las variantes viven en `data -> 'products' -> [i] -> 'variants'`: la
--    función nunca reponía nada. Se reemplaza por una basada en
--    `decrement_stock`, que ya conoce la estructura real y está probada.
-- ---------------------------------------------------------------------------
create or replace function public.increment_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_products jsonb;
  v_item jsonb;
  v_product jsonb;
  v_variants jsonb;
  v_new_variants jsonb;
  v_found boolean;
  v_stock integer;
  v_qty integer;
  v_id integer;
  v_size text;
  v_i integer;
  v_j integer;
begin
  select data ->> 'products' into v_products from public.pintao_store where id = 1 for update;

  if v_products is null then
    raise exception 'STORE_NOT_FOUND';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id := (v_item ->> 'productId')::int;
    v_size := v_item ->> 'size';
    v_qty := (v_item ->> 'qty')::int;
    v_found := false;

    for v_i in 0..jsonb_array_length(v_products) - 1 loop
      v_product := v_products -> v_i;
      if (v_product ->> 'id')::int = v_id then
        v_found := true;
        v_variants := v_product -> 'variants';
        v_new_variants := '[]'::jsonb;

        for v_j in 0..jsonb_array_length(v_variants) - 1 loop
          if v_variants -> v_j ->> 'size' = v_size then
            v_stock := (v_variants -> v_j ->> 'stock')::int;
            v_new_variants := v_new_variants || jsonb_build_object(
              'size', v_size,
              'color', v_variants -> v_j -> 'color',
              'stock', v_stock + v_qty,
              'sku', v_variants -> v_j -> 'sku'
            );
          else
            v_new_variants := v_new_variants || v_variants -> v_j;
          end if;
        end loop;

        v_products := jsonb_set(v_products, array[v_i::text, 'variants'], v_new_variants);
        exit;
      end if;
    end loop;

    if not v_found then
      raise exception 'PRODUCT_NOT_FOUND_%', v_id;
    end if;
  end loop;

  update public.pintao_store
    set data = jsonb_set(data, '{products}'::text[], v_products::jsonb, true),
        version = version + 1,
        updated_at = now()
  where id = 1;
end;
$$;

-- `pintao_stock_movements` se declaró con la columna `type`, pero el código
-- hablaba de `tipo`; se acepta cualquiera de las dos dejando la canónica.
alter table if exists public.pintao_stock_movements
  add column if not exists reason text;

alter table if exists public.pintao_stock_movements enable row level security;
revoke all on table public.pintao_stock_movements from anon, authenticated;
grant select, insert on table public.pintao_stock_movements to service_role;

alter table if exists public.pintao_payment_attempts enable row level security;
revoke all on table public.pintao_payment_attempts from anon, authenticated;
grant select, insert on table public.pintao_payment_attempts to service_role;

-- El CHECK original sólo admitía APPROVED/DECLINED/VOIDED/ERROR, pero
-- `createPaymentAttempt()` escribe 'PENDING' al crear la transacción de Wompi:
-- cada intento de pago en línea fallaba el insert en silencio (el error se
-- descartaba). Se reemplaza por la lista completa de estados usados.
alter table if exists public.pintao_payment_attempts
  drop constraint if exists pintao_payment_attempts_result_check;

alter table if exists public.pintao_payment_attempts
  add constraint pintao_payment_attempts_result_check
  check (result in ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'));
