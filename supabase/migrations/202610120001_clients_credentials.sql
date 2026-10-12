-- PINTAO — credenciales de cliente.
--
-- Decisión (AUDIT.md §6.2 y DECISIONS.md): almacén propio con PBKDF2-SHA256 en
-- lugar de Supabase Auth. Motivos: un solo modelo de sesión (`pintao_sessions`
-- ya soporta role = 'customer'), el historial de pedidos sigue vinculado por
-- `customer.email` y no conviven dos sistemas de cookies en el mismo `/acceso`.
-- Contrapartida asumida: no hay verificación de correo ni restablecimiento de
-- contraseña; quedan anotados en AUDIT.md §6.2.
--
-- El formato del hash es idéntico al de `pintao_admin_users` (sal hex de
-- 16 bytes, 210000 iteraciones por defecto), así que se reutiliza el mismo
-- verificador de `web/src/lib/auth.ts`.

create table if not exists public.pintao_clients (
  email text primary key,
  name text not null,
  phone text,
  password_salt text not null,
  password_hash text not null,
  password_iterations integer not null default 210000,
  created_at timestamptz not null default now()
);

alter table public.pintao_clients enable row level security;

-- Sólo el backend (service_role) toca la tabla: ni el rol anónimo ni el
-- autenticado pueden leer hashes ni dar de alta cuentas directamente.
create policy "deny direct client-credentials access"
  on public.pintao_clients for all to anon, authenticated
  using (false) with check (false);

revoke all on table public.pintao_clients from anon, authenticated;
grant select, insert, update on table public.pintao_clients to service_role;
