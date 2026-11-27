-- =====================================================
-- PANGGILAN SUARA/VIDEO (1 LAWAN 1 DAN GRUP) DI DALAM APLIKASI
-- Jalankan sekali di: Supabase > SQL Editor > New query > Run
-- Aman dijalankan berulang kali (juga bila versi sebelumnya sudah dijalankan).
-- =====================================================

create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user   uuid not null references public.profiles(id) on delete cascade,
  cid uuid not null,
  kind text not null,
  data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists call_signals_to_idx  on public.call_signals (to_user, created_at desc);
create index if not exists call_signals_cid_idx on public.call_signals (cid);

-- Jenis sinyal yang diizinkan (diperbarui untuk panggilan grup)
alter table public.call_signals drop constraint if exists call_signals_kind_check;
alter table public.call_signals add constraint call_signals_kind_check
  check (kind in ('invite','hello','offer','answer','ice','ring','decline','cancel','leave','busy','end'));

-- Dua orang dianggap satu panggilan bila keduanya sama-sama diundang ke panggilan (cid) yang sama
create or replace function public.in_call_with(c uuid, a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (
    select count(distinct to_user) from public.call_signals
    where cid = c and kind = 'invite' and to_user in (a, b)
  ) = 2;
$$;
grant execute on function public.in_call_with(uuid, uuid, uuid) to authenticated;

alter table public.call_signals enable row level security;

drop policy if exists call_signals_insert on public.call_signals;
drop policy if exists call_signals_select on public.call_signals;

-- Kirim sinyal: ke teman, atau ke sesama peserta undangan panggilan yang sama; tidak boleh bila saling blokir
create policy call_signals_insert on public.call_signals for insert to authenticated
with check (
  from_user = auth.uid()
  and not public.is_blocked(from_user, to_user)
  and (public.are_friends(from_user, to_user) or public.in_call_with(cid, from_user, to_user))
);
-- Hanya penerima yang bisa membaca sinyalnya
create policy call_signals_select on public.call_signals for select to authenticated
using (to_user = auth.uid());

grant select, insert on public.call_signals to authenticated;

-- Sinyal hanya perlu hidup beberapa jam: bersihkan otomatis
create or replace function public.purge_call_signals() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.call_signals where created_at < now() - interval '6 hours';
  return null;
end $$;

drop trigger if exists call_signals_purge on public.call_signals;
create trigger call_signals_purge after insert on public.call_signals
for each statement execute function public.purge_call_signals();

-- Realtime (abaikan bila sudah terdaftar)
do $$
begin
  begin alter publication supabase_realtime add table public.call_signals;
  exception when others then null; end;
end $$;
