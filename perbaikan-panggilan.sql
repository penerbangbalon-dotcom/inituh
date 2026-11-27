-- =====================================================
-- PANGGILAN SUARA/VIDEO DI DALAM APLIKASI
-- Jalankan sekali di: Supabase > SQL Editor > New query > Run
-- Aman dijalankan berulang kali.
-- =====================================================

create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user   uuid not null references public.profiles(id) on delete cascade,
  cid uuid not null,
  kind text not null check (kind in ('offer','answer','ice','ring','decline','cancel','end','busy')),
  data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists call_signals_to_idx on public.call_signals (to_user, created_at desc);

alter table public.call_signals enable row level security;

drop policy if exists call_signals_insert on public.call_signals;
drop policy if exists call_signals_select on public.call_signals;
create policy call_signals_insert on public.call_signals for insert to authenticated
with check (
  from_user = auth.uid()
  and public.are_friends(from_user, to_user)
  and not public.is_blocked(from_user, to_user)
);
create policy call_signals_select on public.call_signals for select to authenticated
using (to_user = auth.uid());

grant select, insert on public.call_signals to authenticated;

-- Sinyal hanya perlu hidup beberapa menit: bersihkan otomatis
create or replace function public.purge_call_signals() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.call_signals where created_at < now() - interval '10 minutes';
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
