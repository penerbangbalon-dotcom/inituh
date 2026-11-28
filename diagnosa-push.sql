-- =====================================================
-- DIAGNOSA NOTIFIKASI (hanya membaca, aman dijalankan kapan saja)
-- Supabase > SQL Editor > New query > Run. Jalankan tiap blok terpisah (blok dipisah baris kosong + komentar).
-- =====================================================

-- 1. Apakah perangkat sudah terdaftar? (harus ada baris untuk akun Anda dan akun teman)
select p.display_name, count(*) as perangkat, max(s.created_at) as terakhir_daftar,
       min(split_part(split_part(s.endpoint,'//',2),'/',1)) as layanan_push
from public.push_subs s join public.profiles p on p.id = s.user_id
group by p.display_name order by terakhir_daftar desc;

-- 2. Apakah trigger masih berisi tulisan GANTI_ (belum diisi)? Hasil harus: false, false
select position('GANTI_' in pg_get_functiondef('public.notify_push'::regproc)) > 0 as masih_placeholder,
       pg_get_functiondef('public.notify_push'::regproc) like '%vercel.app/api/push%' as alamat_vercel_terisi;

-- 3. Balasan server Vercel untuk 15 panggilan terakhir. status_code harus 200.
--    401 = PUSH_SECRET tidak sama, 404 = alamat salah, 500 = lihat kolom content (isi galat), kosong = pg_net belum mengirim.
select r.created, r.status_code, left(r.content, 200) as isi, r.error_msg
from net._http_response r order by r.created desc limit 15;
