-- =====================================================
-- PERBAIKAN IZIN SERVER PUSH (galat 403 / 42501 "permission denied")
-- Server Vercel memakai role service_role; role ini harus punya izin ke tabel yang dibacanya.
-- Jalankan sekali di Supabase > SQL Editor > New query > Run. Aman diulang.
-- =====================================================
grant usage on schema public to service_role;
grant select, insert, update, delete on public.push_subs to service_role;
grant select on public.profiles to service_role;
-- (opsional, jaga-jaga untuk pengembangan berikutnya)
grant select on public.messages, public.friendships, public.call_signals to service_role;
