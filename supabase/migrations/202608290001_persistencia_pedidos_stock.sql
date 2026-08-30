-- PINTAO — persistencia real (Fase 1).
-- Pedidos, cotizaciones, newsletter y decremento atómico de stock.

-- ---------------------------------------------------------------------------
-- 1. Pedidos
-- ---------------------------------------------------------------------------
create table if not exists public.pintao_orders (
  id text primary key,
  customer jsonb not null,
  items jsonb not null,
  subtotal bigint not null,
  volume_discount bigint not null default 0,
  coupon text,
  coupon_discount bigint not null default  ​0,
  shipping bigint not null default  ​0,
  total bigint not null,
  payment_method text not null,
  status text not null,
  address jsonb,
  shipping_method text not null,
  created_at timestamptz not null default now()
);

create index if not exists pintao_orders_created_at_idx
  on public.pintao_orders (created_at desc);

create index if not exists pintao_orders_customer_email_idx
  on public.pintao_orders ((customer ->> 'email'));

alter table public.pintao_orders enable row level security;
revoke all on table public.pintao_orders from anon, authenticated;
grant select, insert, update on table public.pintao_orders to service_role;

-- ---------------------------------------------------------------------------
-- 2. Cotizaciones (mayorista)
-- ---------------------------------------------------------------------------
create table if not exists public.pintao_quotes (
  id text primary key,
  name text not null,
  phone text not null,
  quantity text,
  message text,
  status text not null default 'Nueva',
  created_at timestamptz not null default now()
);

alter table public.pintao_quotes enable row level security;
revoke all on table public.pintao_quotes from anon, authenticated;
grant select, insert on table public.pintao_quotes to service_role;

-- ---------------------------------------------------------------------------
-- 3. Newsletter
-- ---------------------------------------------------------------------------
create table if not exists public.pintao_newsletter (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.pintao_newsletter enable row level security;
revoke all on table public.pintao_newsletter from anon, authenticated;
grant select, insert on table public.pintao_newsletter to service_role;

-- ---------------------------------------------------------------------------
-- 4. Decremento atómico de stock (evita sobreventa).
--
-- Los productos viven en pintao_store.data -> 'products' como JSONB.
-- Esta función recorre el pedido y descuenta stock por producto+talla,
-- fallando si algún SKU no tiene inventario suficiente. El update condicional
-- garantiza que dos pedidos concurrentes no puedan vender el mismo stock..
-- ---------------------------------------------------------------------------
create or replace function public.decrement_stock(p_items jsonb)
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
  v_new_variants jsonb := '[]'::jsonb;
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

        for v_j in  ​0..jsonb_array_length(v_variants) - 1 loop
          if v_variants -> v_j ->> 'size' = v_size then
            v_stock := (v_variants -> v_j ->> 'stock')::int;
            if v_stock < v_qty then
              raise exception 'INSUFFICIENT_STOCK_%_%', v_id, v_size;
            end if;
            v_new_variants := v_new_variants || jsonb_build_object(
              'size', v_size,
              'color', v_variants -> v_j -> 'color',
              'stock', v_stock - v_qty,
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

  exception
  when others then
    raise;
end;
$$;