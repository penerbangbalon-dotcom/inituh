-- =====================================================
-- NOTIFIKASI SAAT APLIKASI TERTUTUP (Web Push)
-- Jalankan di: Supabase > SQL Editor > New query > Run
--
-- PENTING: ganti dua nilai di bawah ("GANTI_..." pada baris 'v_url' dan 'v_secret')
-- LANGSUNG DI SQL EDITOR. Jangan simpan nilai asli di file yang diunggah ke GitHub.
--   v_url    = alamat Vercel + /api/push   (contoh: https://orbit-anda.vercel.app/api/push)
--   v_secret = sama persis dengan variabel PUSH_SECRET di Vercel
-- Aman dijalankan berulang kali.
-- =====================================================

create extension if not exists pg_net;

-- Langganan push tiap perangkat
create table if not exists public.push_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subs_user_idx on public.push_subs (user_id);
alter table public.push_subs enable row level security;
-- Tanpa kebijakan langsung: aplikasi hanya boleh lewat fungsi di bawah; server memakai service key.

create or replace function public.save_push_sub(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'harus masuk dulu'; end if;
  delete from public.push_subs where endpoint = p_endpoint;
  insert into public.push_subs (user_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth);
end $$;
grant execute on function public.save_push_sub(text, text, text) to authenticated;

-- Pemicu: kirim kejadian ke server push (tidak menghambat pengiriman pesan bila gagal)
create or replace function public.notify_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url    text := 'GANTI_DENGAN_https://ALAMAT-VERCEL-ANDA/api/push';
  v_secret text := 'GANTI_DENGAN_PUSH_SECRET';
begin
  begin
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      body := jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP, 'record', to_jsonb(NEW))
    );
  exception when others then
    null;
  end;
  return NEW;
end $$;

drop trigger if exists push_messages on public.messages;
create trigger push_messages after insert on public.messages
  for each row execute function public.notify_push();

drop trigger if exists push_calls on public.call_signals;
create trigger push_calls after insert on public.call_signals
  for each row when (NEW.kind = 'invite') execute function public.notify_push();

drop trigger if exists push_friends on public.friendships;
create trigger push_friends after insert or update on public.friendships
  for each row execute function public.notify_push();

-- Izin untuk server push (tanpa ini Vercel menerima galat 403 saat membaca push_subs)
grant usage on schema public to service_role;
grant select, insert, update, delete on public.push_subs to service_role;
grant select on public.profiles to service_role;
