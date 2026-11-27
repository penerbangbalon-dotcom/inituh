-- =====================================================
-- PERBAIKAN KIRIM FILE / FOTO
-- (error: violates check constraint "messages_file_chk")
-- Jalankan sekali di: Supabase > SQL Editor > New query > Run
-- Aman dijalankan berulang kali.
-- =====================================================

-- 1. Kolom lampiran
alter table public.messages
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_type text;

-- 2. Ganti aturan lama yang menolak pesan berisi file
alter table public.messages drop constraint if exists messages_file_chk;
alter table public.messages
  add constraint messages_file_chk
  check (file_path is null or file_name is not null);

-- 3. Bucket penyimpanan: avatars (publik, 2 MB) dan files (privat, 20 MB)
insert into storage.buckets (id, name, public, file_size_limit) values
  ('avatars', 'avatars', true, 2097152),
  ('files', 'files', false, 20971520)
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- 4. Izin penyimpanan (dibuat ulang agar pasti benar)
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;
drop policy if exists files_insert   on storage.objects;
drop policy if exists files_select   on storage.objects;
drop policy if exists files_delete   on storage.objects;

create policy avatars_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy files_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'files'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.are_friends(auth.uid(), ((storage.foldername(name))[2])::uuid)
  and not public.is_blocked(auth.uid(), ((storage.foldername(name))[2])::uuid)
);
create policy files_select on storage.objects for select to authenticated
using (
  bucket_id = 'files'
  and auth.uid()::text in ((storage.foldername(name))[1], (storage.foldername(name))[2])
);
create policy files_delete on storage.objects for delete to authenticated
using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Fungsi pengecek pertemanan harus bisa dipanggil saat unggah
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;
