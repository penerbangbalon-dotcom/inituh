-- =====================================================
-- APLIKASI ANDROID (APK) - Firebase Cloud Messaging
-- Jalankan sekali di: Supabase > SQL Editor > New query > Run. Aman diulang.
-- =====================================================

create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists fcm_tokens_user_idx on public.fcm_tokens (user_id);
alter table public.fcm_tokens enable row level security;
-- Tanpa kebijakan langsung: aplikasi hanya lewat dua fungsi di bawah; server memakai service_role.

create or replace function public.save_fcm_token(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'harus masuk dulu'; end if;
  delete from public.fcm_tokens where token = p_token;   -- HP yang sama berganti akun: token dipindah
  insert into public.fcm_tokens (user_id, token) values (auth.uid(), p_token);
end $$;

create or replace function public.drop_fcm_token(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.fcm_tokens where token = p_token and user_id = auth.uid();
end $$;

grant execute on function public.save_fcm_token(text) to authenticated;
grant execute on function public.drop_fcm_token(text) to authenticated;

-- Izin untuk server push di Vercel
grant usage on schema public to service_role;
grant select, insert, update, delete on public.fcm_tokens to service_role;

-- Panggilan dibatalkan penelepon -> hentikan dering di HP penerima (selain "invite")
drop trigger if exists push_calls on public.call_signals;
create trigger push_calls after insert on public.call_signals
  for each row when (NEW.kind in ('invite', 'cancel')) execute function public.notify_push();
