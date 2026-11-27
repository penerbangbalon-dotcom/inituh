/* Pengaturan server TURN untuk panggilan (opsional tapi SANGAT disarankan).
   Tanpa TURN, panggilan sering macet di "Menyambungkan…" bila dua HP berada di jaringan seluler/WiFi berbeda.

   Cara termudah (gratis 20 GB/bulan, cukup untuk ratusan jam panggilan suara):
   1. Daftar di https://www.metered.ca  (menu: Open Relay / TURN Server)
   2. Buat aplikasi, lalu salin "API Key" dan nama aplikasi (subdomain)
   3. Tempel di ORBIT_TURN_API di bawah, contoh:
      "https://namaaplikasi.metered.live/api/v1/turn/credentials?apiKey=KUNCIKAMU"
   Kunci ini memang dipakai di sisi browser; Metered membatasi pemakaiannya dari dasbor mereka. */
window.ORBIT_TURN_API="";

/* Alternatif: isi server TURN manual (dari layanan apa pun), contoh:
   window.ORBIT_TURN=[{urls:"turn:nama-server.com:443?transport=tcp",username:"USER",credential:"PASSWORD"}]; */
window.ORBIT_TURN=[];
