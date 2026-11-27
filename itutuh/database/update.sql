-- Jalankan SETELAH schema.sql (Supabase > SQL Editor > New query > Run)

-- Kolom lampiran pada pesan
alter table public.messages
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_type text;

-- Bucket: avatars (publik, maks 2 MB) dan files (privat, maks 20 MB)
insert into storage.buckets (id, name, public, file_size_limit) values
  ('avatars', 'avatars', true, 2097152),
  ('files', 'files', false, 20971520)
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- Foto profil: hanya boleh diubah di folder milik sendiri
create policy avatars_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- File chat: path = pengirim/penerima/namafile
-- Unggah hanya ke teman yang tidak diblokir; baca hanya oleh pengirim dan penerima
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
