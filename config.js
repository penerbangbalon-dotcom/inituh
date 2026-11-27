/* Pengaturan server TURN untuk panggilan (Metered, workspace orbit-obrolan).
   Password sudah terisi.
   Catatan: file ini dibaca terbuka oleh browser. Itu memang cara kerja TURN di sisi klien;
   pemakaian bisa dibatasi atau kredensialnya diganti kapan saja dari dasbor Metered. */
const _TU="8fe5f2822613260720558802",_TP="KpEjQSRAdyyFjA4e";
window.ORBIT_TURN_API="";
window.ORBIT_TURN=[
  {urls:"turn:global.relay.metered.ca:80",username:_TU,credential:_TP},
  {urls:"turn:global.relay.metered.ca:80?transport=tcp",username:_TU,credential:_TP},
  {urls:"turn:global.relay.metered.ca:443",username:_TU,credential:_TP},
  {urls:"turns:global.relay.metered.ca:443?transport=tcp",username:_TU,credential:_TP}
];
