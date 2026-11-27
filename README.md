# Orbit

Aplikasi chat web: kode unik, foto profil, kirim foto/dokumen/video (maks. 20 MB), dan ajakan panggilan lewat Jitsi.

## Isi folder
- `index.html`, `style.css`, `app.js` : aplikasi (tanpa proses build)
- `database/schema.sql` : skema dasar (sudah dijalankan sebelumnya)
- `database/update.sql` : tambahan untuk foto profil dan file (**jalankan dulu**)

## Langkah pemasangan
1. **Supabase**: SQL Editor > New query > tempel isi `database/update.sql` > Run.
2. **GitHub**: buat repository baru, klik *Add file > Upload files*, tarik semua isi folder ini (termasuk folder `database`), lalu *Commit changes*.
3. **Vercel**: *Add New > Project*, pilih repository tadi. Framework: **Other**. Kosongkan Build Command, lalu *Deploy*.
4. **Supabase**: Authentication > URL Configuration > isi *Site URL* dengan alamat Vercel.

Setiap kali file di GitHub diubah, Vercel otomatis memperbarui aplikasi.

## Fitur notifikasi & pengaturan
- Tombol ⚙️ di pojok kanan atas daftar obrolan: izin notifikasi, suara pesan, nada dering (3 pilihan), volume.
- Notifikasi muncul untuk pesan baru, undangan pertemanan, dan penerimaan undangan. Panggilan masuk menampilkan layar Terima/Tolak dengan nada dering.
- Panggilan suara & video langsung di dalam aplikasi (WebRTC, file `calls.js`), tanpa Jitsi. Penghubung memakai tabel `call_signals` + Supabase Realtime (**jalankan `perbaikan-panggilan.sql` dulu**). Untuk jaringan yang ketat, isi `TURN` di bagian atas `calls.js`.
- Bekerja selama Orbit terbuka di browser. Untuk notifikasi saat aplikasi tertutup sepenuhnya, perlu server Web Push (belum ada).
- File tambahan: `notif.js`. SQL perbaikan: `perbaikan-profil.sql`, `perbaikan-izin.sql`.

## Panggilan grup & cadangan notifikasi
- Menu Kontak > tombol "Panggilan grup": pilih sampai 4 teman (maks. 5 orang), suara atau video. Peserta tidak harus saling berteman, cukup sama-sama diundang.
- Panggilan, pesan, dan undangan teman dicek berkala (2-4 detik) sebagai cadangan bila Realtime Supabase tidak sampai.
- Jalankan ulang `perbaikan-panggilan.sql` (aman diulang) agar tabel `call_signals` mendukung grup.

## Server TURN (agar suara tersambung di jaringan seluler)
Buka `config.js`, ikuti petunjuk di dalamnya (daftar gratis di metered.ca, tempel alamat kredensial di `ORBIT_TURN_API`), lalu unggah ulang ke GitHub.

## Notifikasi saat aplikasi tertutup (Web Push)
Perlu 3 langkah satu kali:
1. **Vercel** > Settings > Environment Variables, isi: `VAPID_PUBLIC` (sama dengan `ORBIT_VAPID` di `config.js`), `VAPID_PRIVATE`, `VAPID_SUBJECT` (mis. `mailto:emailanda@gmail.com`), `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (kunci *service_role*, rahasia), `PUSH_SECRET`. Lalu **Redeploy**.
2. **Supabase** > SQL Editor: tempel `perbaikan-push.sql`, ganti `v_url` dan `v_secret`, Run.
3. Buka Orbit di tiap perangkat, Pengaturan > Aktifkan notifikasi.
Di iPhone, Orbit harus dipasang dulu ke Layar Utama (Bagikan > Tambah ke Layar Utama).
