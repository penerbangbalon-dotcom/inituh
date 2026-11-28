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
- Notifikasi saat aplikasi tertutup memakai Web Push (lihat bagian di bawah).
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

## Cek & uji notifikasi (jika belum muncul saat aplikasi ditutup)
1. Buka `https://ALAMAT-VERCEL-ANDA/api/push` di browser: semua nilai harus `true` (terutama `pasangan_kunci_cocok` dan `supabase_terhubung`). `VAPID_SUBJECT` yang salah ketik (mis. `mailtoxxx@gmail.com`) kini diperbaiki otomatis.
2. Di HP yang akan diuji: Pengaturan > Aktifkan > **Uji notifikasi**. Hasilnya menyebut berapa perangkat yang menerima, atau kode galat dari layanan push.
3. Bila `supabase_terhubung` bernilai `false` dengan galat 403/42501: jalankan `perbaikan-push-izin.sql` di Supabase, dan pastikan `jenis_kunci_supabase` bertuliskan "benar".
4. Bila "tidak menemukan perangkat terdaftar": jalankan `perbaikan-push.sql`, lalu `diagnosa-push.sql` (blok 1-3) di Supabase.
Hemat daya Android: pada HP tertentu (Xiaomi, Oppo, Vivo, Samsung) setel baterai Chrome/Orbit ke "Tanpa batasan".

## Pesan suara
Tombol mikrofon di sebelah kolom pesan (muncul saat kolom kosong): ketuk untuk merekam, ikon tempat sampah untuk batal, panah hijau untuk kirim. Disimpan di bucket `files` (tidak perlu SQL baru). Rekaman Android/Chrome berformat WebM, iPhone M4A; iPhone lama (di bawah iOS 18.4) belum bisa memutar WebM.

## APK Android
Folder `android/` adalah pembungkus TWA (Chrome) untuk `orbit-obrolan.vercel.app`; notifikasi tetap lewat Web Push.
1. Unggah SEMUA isi folder ini ke GitHub (termasuk `.github`, `.well-known`, `android`, `vercel.json`), tunggu Vercel selesai deploy.
2. GitHub > tab **Actions** > **Bangun APK Orbit** > Run workflow. Sekitar 5 menit kemudian APK ada di **Releases > Orbit APK terbaru** (unduh dari HP, izinkan "pasang dari sumber ini").
3. `.well-known/assetlinks.json` berisi sidik jari kunci tanda tangan `android/orbit.jks`; ini yang membuat aplikasi tampil layar penuh tanpa bilah alamat. Jika kunci diganti, perbarui sidik jarinya.
