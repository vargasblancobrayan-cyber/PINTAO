-- PINTAO — Fase 2: campos de pago Wompi en pedidos.
alter table if exists public.pintao_orders
  add column if not exists wompi_transaction_id text,
  add column if not exists payment_status text not null default 'PENDIENTE',
  add column if not exists paid_at timestamptz;

create index if not exists pintao_orders_payment_status_idx
  on public.pintao_orders (payment_status);

create index if not exists pintao_orders_wompi_transaction_id_idx
  on public.pintao_orders (wompi_transaction_id);