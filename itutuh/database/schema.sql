-- =====================================================
-- Aplikasi Chat (kode unik + username) - Skema Supabase
-- Jalankan sekali di: Supabase > SQL Editor > New query
-- =====================================================

-- 1. PROFIL ------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  username text unique,
  display_name text not null default 'Pengguna',
  avatar_url text,
  username_changed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[a-z0-9_]{4,20}$')
);

-- Kode acak 8 karakter tanpa huruf/angka yang mudah tertukar (O,0,I,1,L)
create function public.gen_code() returns text
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

-- Profil dibuat otomatis saat pengguna baru mendaftar
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, code, display_name)
  values (
    new.id,
    public.gen_code(),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, 'pengguna'), '@', 1))
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 2. PERTEMANAN & BLOKIR ----------------------------------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index friendships_pair_uq
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

create table public.blocks (
  blocker uuid not null references public.profiles(id) on delete cascade,
  blocked uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles(id) on delete cascade,
  reported uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);

-- 3. PESAN -------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.profiles(id) on delete cascade,
  recipient uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender <> recipient)
);
create index messages_pair_idx on public.messages (sender, recipient, created_at desc);
create index messages_inbox_idx on public.messages (recipient, sender, created_at desc);

-- 4. FUNGSI BANTU ------------------------------------------
create function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

-- Pencarian hanya cocok PERSIS dengan kode atau username (tidak ada daftar pengguna)
create function public.find_profile(q text)
returns table (id uuid, code text, username text, display_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.code, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where (p.code = upper(trim(q)) or p.username = lower(trim(q)))
    and p.id <> auth.uid()
    and not public.is_blocked(auth.uid(), p.id)
  limit 1;
$$;

-- Ganti username: format, kata terlarang, dan batas 30 hari
create function public.set_username(new_name text) returns void
language plpgsql security definer set search_path = public as $$
declare
  n text := lower(trim(new_name));
begin
  if n !~ '^[a-z0-9_]{4,20}$' then
    raise exception 'Username 4-20 karakter: huruf kecil, angka, dan garis bawah.';
  end if;
  if n ~ '(admin|support|official|moderator|system|root|supabase)' then
    raise exception 'Username ini tidak diperbolehkan.';
  end if;
  update public.profiles
     set username = n, username_changed_at = now()
   where id = auth.uid()
     and (username_changed_at is null or username_changed_at < now() - interval '30 days');
  if not found then
    raise exception 'Username hanya bisa diganti sekali setiap 30 hari.';
  end if;
end $$;

-- Batas permintaan pertemanan: 20 per hari
create function public.limit_friend_requests() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.friendships
       where requester = new.requester and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Batas permintaan pertemanan harian tercapai.';
  end if;
  return new;
end $$;

create trigger friendships_rate_limit
before insert on public.friendships
for each row execute function public.limit_friend_requests();

-- 5. KEAMANAN (Row Level Security) -------------------------
alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks      enable row level security;
alter table public.reports     enable row level security;
alter table public.messages    enable row level security;

-- Profil: hanya milik sendiri, teman, atau pihak dalam permintaan pertemanan
create policy profiles_select on public.profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where (f.requester = auth.uid() and f.addressee = profiles.id)
       or (f.addressee = auth.uid() and f.requester = profiles.id)
  )
);

-- Profil: hanya nama tampilan dan foto yang boleh diubah langsung
create policy profiles_update on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- Pertemanan
create policy friendships_select on public.friendships for select to authenticated
using (requester = auth.uid() or addressee = auth.uid());

create policy friendships_insert on public.friendships for insert to authenticated
with check (
  requester = auth.uid() and status = 'pending'
  and not public.is_blocked(requester, addressee)
);

create policy friendships_accept on public.friendships for update to authenticated
using (addressee = auth.uid() and status = 'pending')
with check (addressee = auth.uid() and status = 'accepted');
revoke update on public.friendships from authenticated, anon;
grant update (status) on public.friendships to authenticated;

create policy friendships_delete on public.friendships for delete to authenticated
using (requester = auth.uid() or addressee = auth.uid());

-- Blokir & laporan
create policy blocks_all on public.blocks for all to authenticated
using (blocker = auth.uid()) with check (blocker = auth.uid());

create policy reports_insert on public.reports for insert to authenticated
with check (reporter = auth.uid());

-- Pesan: hanya antar teman yang saling tidak memblokir
create policy messages_select on public.messages for select to authenticated
using (sender = auth.uid() or recipient = auth.uid());

create policy messages_insert on public.messages for insert to authenticated
with check (
  sender = auth.uid()
  and public.are_friends(sender, recipient)
  and not public.is_blocked(sender, recipient)
);

create policy messages_mark_read on public.messages for update to authenticated
using (recipient = auth.uid()) with check (recipient = auth.uid());
revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;

-- 6. REALTIME ----------------------------------------------
alter publication supabase_realtime add table public.messages, public.friendships;

-- Selesai.
