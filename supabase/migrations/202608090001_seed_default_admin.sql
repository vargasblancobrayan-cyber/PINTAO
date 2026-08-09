-- PINTAO — siembra la cuenta administradora por defecto para producción.
-- Credenciales de demostración (admin@pintao.local / Pintao2026!) con hash PBKDF2-SHA256
-- a 210000 iteraciones, igual que supabase/functions/store-api/index.ts.
-- CÁMBIALAS en producción lo antes posible (rota el hash desde un proceso seguro).

insert into public.pintao_admin_users (email, password_salt, password_hash, password_iterations)
values (
  'admin@pintao.local',
  'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  '1daeb86c9709f0d1acef65ac116e3f906d572bb0b2c6ec86003e107f2b0c1e1e',
  210000
)
on conflict (email) do nothing;
