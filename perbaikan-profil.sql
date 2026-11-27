-- =====================================================
-- PERBAIKAN PROFIL (kode teman kosong / tidak bisa tambah teman)
-- Jalankan sekali di: Supabase > SQL Editor > New query > Run
-- Aman dijalankan berulang kali.
-- =====================================================

-- 1. Pembuat kode unik (8 karakter)
create or replace function public.gen_code() returns text
language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text;
begin
  loop
    result := '';
    for i in 1..8 loop
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where code = result);
  end loop;
  return result;
end $$;

-- 2. Trigger profil otomatis untuk pengguna baru (dibuat ulang agar pasti ada)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, code, display_name)
  values (
    new.id,
    public.gen_code(),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, 'pengguna'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 3. Fungsi yang dipanggil aplikasi bila profil belum ada
create or replace function public.ensure_profile() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Belum masuk.';
  end if;
  insert into public.profiles (id, code, display_name)
  select u.id, public.gen_code(),
         coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(coalesce(u.email, 'pengguna'), '@', 1))
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;
end $$;

revoke all on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;

-- 4. Buatkan profil untuk SEMUA akun lama yang belum punya
do $$
declare r record;
begin
  for r in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    where not exists (select 1 from public.profiles p where p.id = u.id)
  loop
    insert into public.profiles (id, code, display_name)
    values (
      r.id,
      public.gen_code(),
      coalesce(nullif(r.raw_user_meta_data->>'full_name', ''), split_part(coalesce(r.email, 'pengguna'), '@', 1))
    );
  end loop;
end $$;

-- Selesai. Muat ulang aplikasi: kode akan muncul di tab Profil.
