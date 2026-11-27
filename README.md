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
- Bekerja selama Orbit terbuka di browser. Untuk notifikasi saat aplikasi tertutup sepenuhnya, perlu server Web Push (belum ada).
- File tambahan: `notif.js`. SQL perbaikan: `perbaikan-profil.sql`, `perbaikan-izin.sql`.
