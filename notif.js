/* Orbit: pengaturan, notifikasi (pesan, undangan teman) dan nada dering panggilan.
   Dimuat setelah app.js; memakai variabel/fungsi milik app.js (me, P, peer, M, nm, av, $, toast, sb, refresh, inc). */

/* ----- Pengaturan (disimpan di perangkat ini) ----- */
const SK="orbit-set";
let S={notif:true,snd:true,ring:true,vol:.8,tone:"klasik"};
try{Object.assign(S,JSON.parse(localStorage.getItem(SK)||"{}"))}catch{}
const saveS=()=>{try{localStorage.setItem(SK,JSON.stringify(S))}catch{}};

/* ----- Suara (WebAudio, tanpa file) ----- */
let AC;
function ac(){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume()}catch{}return AC}
["pointerdown","keydown","touchstart"].forEach(e=>addEventListener(e,()=>ac(),{passive:true}));
function tone(f,at,d,type="sine",v=1){
  const c=ac();if(!c)return;
  const t=c.currentTime+at,o=c.createOscillator(),g=c.createGain(),m=Math.max(.0002,S.vol*.5*v);
  o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(m,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d+.05);
}
const ding=()=>{tone(880,0,.2,"sine");tone(1318,.13,.35,"sine")};
const TONES={
  klasik:{n:"Klasik",len:3,play:()=>[0,.55].forEach(t=>{tone(440,t,.42,"sine");tone(480,t,.42,"sine")})},
  ceria:{n:"Ceria",len:2,play:()=>[523,659,784,1047,784,659].forEach((f,i)=>tone(f,i*.16,.2,"triangle"))},
  lembut:{n:"Lembut",len:2.6,play:()=>{tone(659,0,.8,"sine");tone(523,.5,1,"sine")}}
};
let rt=null;
function ringStart(){
  ringStop();const T=TONES[S.tone]||TONES.klasik;
  const go=()=>{T.play();try{navigator.vibrate?.([400,200,400])}catch{}};
  go();rt=setInterval(go,T.len*1000);
}
function ringStop(){clearInterval(rt);rt=null;try{navigator.vibrate?.(0)}catch{}}
function ringTest(){if(typeof CL!=="undefined"&&CL)return;ringStart();setTimeout(()=>{if(!CL)ringStop()},3500)}

/* ----- Notifikasi sistem ----- */
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
async function sysNotify(title,body,tag){
  if(!S.notif||!("Notification" in window)||Notification.permission!=="granted")return;
  const o={body,tag,renotify:true};
  try{const r=await navigator.serviceWorker?.getRegistration();if(r){await r.showNotification(title,o);return}}catch{}
  try{new Notification(title,o)}catch{}
}
async function askPerm(){
  if(!("Notification" in window))return toast("Browser ini tidak mendukung notifikasi.");
  const r=await Notification.requestPermission();
  setOpen(true);
  if(r!=="granted")toast("Izin ditolak. Aktifkan lewat ikon gembok di kolom alamat browser.");
}
const away=()=>document.hidden||!document.hasFocus();
async function who(id){
  if(!P[id]){const {data}=await sb.from("profiles").select("id,code,username,display_name,avatar_url").eq("id",id).maybeSingle();if(data)P[id]=data}
  return nm(id);
}

/* ----- Judul tab: jumlah belum dibaca ----- */
function badge(){
  if(!me)return;
  const n=M.filter(x=>x.recipient===me.id&&!x.read_at).length+inc().length;
  document.title=n?`(${n}) Orbit`:"Orbit";
}

/* ----- Kejadian realtime ----- */
async function onMsg(p){
  if(p.eventType!=="INSERT"||!me)return;
  const m=p.new;if(m.recipient!==me.id)return;
  const name=await who(m.sender);
  if(/^📞 Panggilan (suara|video) ·/.test(m.body||""))return;
  if(peer===m.sender&&!away())return;
  const txt=m.file_path?"📎 "+(m.file_name||"File"):m.body;
  if(S.snd)ding();
  if(away())sysNotify(name,txt,"msg-"+m.sender);else toast("💬 "+name+": "+txt);
}
async function onFriend(p){
  if(!me)return;
  const r=p.new||{};
  if(p.eventType==="INSERT"&&r.addressee===me.id&&r.status==="pending"){
    const name=await who(r.requester);
    if(S.snd)ding();
    if(away())sysNotify("Undangan pertemanan",name+" ingin berteman denganmu","fr-"+r.requester);else toast("👋 "+name+" mengundangmu berteman. Buka tab ➕ Teman.");
  }else if(p.eventType==="UPDATE"&&r.status==="accepted"&&r.requester===me.id){
    const name=await who(r.addressee);
    if(S.snd)ding();
    if(away())sysNotify("Undangan diterima",name+" menerima permintaan pertemananmu","fr-"+r.addressee);else toast("✅ "+name+" menerima permintaan pertemananmu.");
  }
}

/* ----- Layar pengaturan ----- */
function permText(){
  if(!("Notification" in window))return "Tidak didukung browser ini";
  return {granted:"Aktif di perangkat ini",denied:"Diblokir di browser",default:"Belum diizinkan"}[Notification.permission];
}
function setOpen(v){
  $("#set").hidden=!v;if(!v)return;
  $("#ns").textContent=permText();
  $("#nbtn").hidden=!("Notification" in window)||Notification.permission==="granted";
  $("#s-notif").checked=S.notif;$("#s-snd").checked=S.snd;$("#s-ring").checked=S.ring;
  $("#s-vol").value=Math.round(S.vol*100);
  const sel=$("#s-tone");sel.innerHTML=Object.entries(TONES).map(([k,t])=>`<option value="${k}">${t.n}</option>`).join("");sel.value=S.tone;
}
function chg(){
  S.notif=$("#s-notif").checked;S.snd=$("#s-snd").checked;S.ring=$("#s-ring").checked;
  S.vol=Math.max(.1,Math.min(1,$("#s-vol").value/100));S.tone=$("#s-tone").value;
  saveS();
}
