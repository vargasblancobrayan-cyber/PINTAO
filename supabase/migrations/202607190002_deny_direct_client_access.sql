create policy "deny direct storefront access"
  on public.pintao_store for all to anon, authenticated
  using (false) with check (false);

create policy "deny direct session access"
  on public.pintao_sessions for all to anon, authenticated
  using (false) with check (false);

create policy "deny direct admin access"
  on public.pintao_admin_users for all to anon, authenticated
  using (false) with check (false);

create policy "deny direct login-attempt access"
  on public.pintao_login_attempts for all to anon, authenticated
  using (false) with check (false);
