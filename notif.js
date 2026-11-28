/* Orbit: pengaturan, notifikasi (pesan, undangan teman) dan nada dering panggilan.
   Dimuat setelah app.js; memakai variabel/fungsi milik app.js (me, P, peer, M, nm, av, $, toast, sb, refresh, inc). */

/* ----- Pengaturan (disimpan di perangkat ini) ----- */
const SK="orbit-set";
let S={notif:true,snd:true,ring:true,vol:.8,tone:"klasik",out:"",mic:"",theme:"dark"};
try{Object.assign(S,JSON.parse(localStorage.getItem(SK)||"{}"))}catch{}
const saveS=()=>{try{localStorage.setItem(SK,JSON.stringify(S))}catch{}};
const applyTheme=()=>{document.documentElement.dataset.theme=S.theme||"dark";document.querySelector('meta[name=theme-color]')?.setAttribute("content",S.theme==="light"?"#ffffff":"#161717")};
applyTheme();

/* ----- Suara (WebAudio, tanpa file) ----- */
let AC;
function ac(){
  try{
    if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();if(effOut()&&AC.setSinkId)AC.setSinkId(effOut()).catch(()=>{})}
    if(AC.state==="suspended")AC.resume();
  }catch{}
  return AC;
}
/* ----- Pilihan perangkat suara (headset/speaker/mikrofon) ----- */
const canSink=()=>"setSinkId" in HTMLMediaElement.prototype;
const BADID=["default","communications"];
/* Keluaran otomatis: bila pengguna belum memilih manual, suara mengikuti perangkat mikrofon yang dipakai
   (headset dengan mic -> suara juga ke headset), bukan speaker bawaan laptop. */
let AUTO="";
const effOut=()=>S.out||AUTO||"";
function applyOut(){
  const o=effOut();
  document.querySelectorAll("#grid video").forEach(v=>{v.dataset.sk=o;v.setSinkId&&v.setSinkId(o).catch(()=>{})});
  if(AC?.setSinkId)AC.setSinkId(o).catch(()=>{});
}
async function pairOut(stream){
  try{
    if(S.out||!canSink()){AUTO="";return applyOut()}
    const t=stream?.getAudioTracks?.()[0];if(!t)return;
    const st=t.getSettings?.()||{};
    const d=await navigator.mediaDevices.enumerateDevices();
    let gid=st.groupId;
    if(!gid){const mic=d.find(x=>x.kind==="audioinput"&&x.deviceId===st.deviceId);gid=mic?.groupId}
    const m=gid&&d.find(x=>x.kind==="audiooutput"&&x.groupId===gid&&!BADID.includes(x.deviceId));
    AUTO=m?m.deviceId:"";
    applyOut();
  }catch(e){console.warn("pairOut",e)}
}
async function loadDevs(ask){
  if(!navigator.mediaDevices?.enumerateDevices)return {o:[],m:[]};
  let d=await navigator.mediaDevices.enumerateDevices();
  if(ask&&!d.some(x=>x.label)){
    try{(await navigator.mediaDevices.getUserMedia({audio:true})).getTracks().forEach(t=>t.stop());d=await navigator.mediaDevices.enumerateDevices()}catch{}
  }
  return {o:d.filter(x=>x.kind==="audiooutput"),m:d.filter(x=>x.kind==="audioinput")};
}
const devName=(x,i)=>x.label||("Perangkat "+(i+1));
async function fillDevs(ask){
  const {o,m}=await loadDevs(ask);
  const opt=(l,sel)=>l.map((x,i)=>`<option value="${esc(x.deviceId)}"${x.deviceId===sel?" selected":""}>${esc(devName(x,i))}</option>`).join("");
  $("#s-out").innerHTML=`<option value="">Otomatis (ikuti headset/mikrofon)</option>`+opt(o.filter(x=>x.deviceId!=="default"),S.out);
  $("#s-mic").innerHTML=`<option value="">Otomatis (ikuti headset/mikrofon)</option>`+opt(m.filter(x=>x.deviceId!=="default"),S.mic);
  $("#s-out").disabled=!canSink();
  $("#dv-note").textContent=canSink()?(o.length&&!o.some(x=>x.label)?"Ketuk \"Muat daftar perangkat\" dan izinkan mikrofon agar nama perangkat tampil.":""):"Browser ini tidak bisa memilih keluaran suara; ganti lewat pengaturan perangkat/Bluetooth.";
}
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

/* ----- Web Push: notifikasi tetap muncul saat aplikasi tertutup (butuh server, lihat README) ----- */
const b64u=s=>{const r=(s+"=".repeat((4-s.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/"),a=atob(r);return Uint8Array.from(a,c=>c.charCodeAt(0))};
let PS={ok:false,msg:"Server notifikasi: belum dicek"};
const sameKey=(sub)=>{try{const k=sub.options?.applicationServerKey;if(!k)return true;const a=new Uint8Array(k),b=b64u(window.ORBIT_VAPID);return a.length===b.length&&a.every((v,i)=>v===b[i])}catch{return true}};
/* Aplikasi Android (APK Orbit): token FCM diberikan oleh aplikasi lewat window.OrbitNative */
async function subscribeNative(){
  try{
    let t="";
    for(let i=0;i<8&&!t;i++){t=window.OrbitNative.getToken();if(!t)await new Promise(r=>setTimeout(r,1500))}
    if(!t){PS={ok:false,msg:"Android belum memberi token notifikasi (cek internet dan Google Play Services)"};return PS}
    const {error}=await sb.rpc("save_fcm_token",{p_token:t});
    PS=error?{ok:false,msg:"Gagal menyimpan token: "+error.message+(/save_fcm_token/.test(error.message)?" — jalankan perbaikan-fcm.sql di Supabase.":"")}:{ok:true,msg:"Perangkat Android terdaftar ✓"};
  }catch(e){PS={ok:false,msg:"Gagal mendaftar: "+(e.message||e)}}
  return PS;
}
async function subscribePush(){
  if(window.OrbitNative&&me)return subscribeNative();
  try{
    if(!me||!window.ORBIT_VAPID||!("PushManager" in window)||!("serviceWorker" in navigator)||!("Notification" in window)||Notification.permission!=="granted"){PS={ok:false,msg:"Notifikasi belum aktif di perangkat ini"};return PS}
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    /* langganan lama dengan kunci berbeda tidak akan pernah menerima kiriman: buat ulang */
    if(sub&&!sameKey(sub)){await sub.unsubscribe();sub=null}
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(window.ORBIT_VAPID)});
    const j=sub.toJSON();
    const {error}=await sb.rpc("save_push_sub",{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth});
    if(error){PS={ok:false,msg:"Gagal menyimpan langganan: "+error.message};console.warn(PS.msg);return PS}
    PS={ok:true,msg:"Perangkat terdaftar di server notifikasi ✓"};
  }catch(e){PS={ok:false,msg:"Gagal mendaftar push: "+(e.message||e)};console.warn("push",e)}
  return PS;
}
/* Uji lewat server: Vercel mengirim notifikasi sungguhan ke semua perangkat akun ini */
async function pushTest(){
  const set=t=>{const e=$("#ps");if(e)e.textContent=t};
  set("Menguji…");
  if(!window.OrbitNative&&(!("Notification" in window)||Notification.permission!=="granted"))return set("Izinkan notifikasi dulu (tombol Aktifkan).");
  const r=await subscribePush();if(!r.ok)return set(r.msg);
  try{
    const {data:{session}}=await sb.auth.getSession();
    const res=await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({test:true})});
    const j=await res.json().catch(()=>({}));
    if(!res.ok)return set("Server menolak ("+res.status+"): "+(j.error||"cek Environment Variables Vercel"));
    if(!j.devices)return set("Server tidak menemukan perangkat terdaftar untuk akunmu.");
    if(j.sent)return set("Terkirim ke "+j.sent+" dari "+j.devices+" perangkat. Notifikasi harus muncul beberapa detik lagi.");
    const f=j.results?.[0];set("Gagal kirim ("+(f?.status||"?")+"): "+(f?.error||"tidak diketahui"));
  }catch(e){set("Gagal menghubungi server: "+e.message)}
}
navigator.serviceWorker?.addEventListener("message",e=>{if(e.data?.t==="resub")subscribePush()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&me)subscribePush()});
/* Ajakan mengaktifkan notifikasi bila belum diizinkan */
function notifBanner(){
  const b=$("#nbn");if(!b)return;
  const need=!window.OrbitNative&&"Notification" in window&&Notification.permission!=="granted";
  b.hidden=!need;
  if(need)b.innerHTML=Notification.permission==="denied"?`<span class="sp">Notifikasi diblokir. Izinkan lewat ikon gembok/pengaturan situs, lalu muat ulang.</span>`:`<span class="sp">Aktifkan notifikasi agar pesan & panggilan masuk walau Orbit ditutup.</span><button onclick="askPerm()">Aktifkan</button>`;
}

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
  if(r==="granted")await subscribePush();notifBanner();if(!$("#set").hidden)setOpen(true);
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
  document.title=n?`(${n}) Orbit`:"Orbit";notifBanner();try{navigator.setAppBadge?.(n)}catch{}
}

/* ----- Pesan & undangan: lewat Realtime, dengan pengecekan berkala sebagai cadangan ----- */
const NM=new Set(),NF=new Set();let seeded=false,lastSig="",pollM=null;
async function notifyMsg(m){
  if(!me||m.recipient!==me.id||NM.has(m.id))return;NM.add(m.id);
  if(!seeded)return;
  const name=await who(m.sender);
  if(/^📞 Panggilan (suara|video) ·/.test(m.body||""))return;
  if(peer===m.sender&&!away())return;
  const txt=lbl(m);
  if(S.snd)ding();
  if(away())sysNotify(name,txt,"msg-"+m.sender);else toast("💬 "+name+": "+txt);
}
async function notifyFriend(r,kind){
  const key=r.id+":"+r.status;if(NF.has(key))return;NF.add(key);
  if(!seeded)return;
  if(kind==="in"){
    const name=await who(r.requester);
    if(S.snd)ding();
    if(away())sysNotify("Undangan pertemanan",name+" ingin berteman denganmu","fr-"+r.requester);else toast("👋 "+name+" mengundangmu berteman. Buka tab ➕ Tambah.");
  }else{
    const name=await who(r.addressee);
    if(S.snd)ding();
    if(away())sysNotify("Undangan diterima",name+" menerima permintaan pertemananmu","fr-"+r.addressee);else toast("✅ "+name+" menerima permintaan pertemananmu.");
  }
}
function onMsg(p){if(p.eventType==="INSERT"&&me)notifyMsg(p.new)}
function onFriend(p){
  if(!me)return;const r=p.new||{};
  if(p.eventType==="INSERT"&&r.addressee===me.id&&r.status==="pending")notifyFriend(r,"in");
  else if(p.eventType==="UPDATE"&&r.status==="accepted"&&r.requester===me.id)notifyFriend(r,"ok");
}
async function pollAll(){
  if(!me)return;
  const [m,f]=await Promise.all([sb.from("messages").select("*").order("created_at",{ascending:false}).limit(30),sb.from("friendships").select("*")]);
  if(m.error||f.error)return;
  const ms=(m.data||[]).slice().reverse(),fs=f.data||[];
  const sg=ms.map(x=>x.id+(x.read_at?"r":"")).join()+"|"+fs.map(x=>x.id+x.status).join();
  for(const x of ms)await notifyMsg(x);
  for(const x of fs){
    if(x.status==="pending"&&x.addressee===me.id)await notifyFriend(x,"in");
    else if(x.status==="accepted"&&x.requester===me.id)await notifyFriend(x,"ok");
  }
  const first=!seeded;seeded=true;
  if(sg!==lastSig){lastSig=sg;if(!first)refresh()}
}
function startPolling(){stopPolling();seeded=false;lastSig="";NM.clear();NF.clear();pollAll();pollM=setInterval(pollAll,4000)}
function stopPolling(){clearInterval(pollM);pollM=null}

/* ----- Layar pengaturan ----- */
function permText(){
  if(window.OrbitNative)return "Aplikasi Android Orbit (diatur di pengaturan Android)";
  if(!("Notification" in window))return "Tidak didukung browser ini";
  return {granted:"Aktif di perangkat ini",denied:"Diblokir di browser",default:"Belum diizinkan"}[Notification.permission];
}
function setOpen(v){
  $("#set").hidden=!v;if(!v)return;
  $("#ns").textContent=permText();
  $("#nbtn").hidden=!!window.OrbitNative||!("Notification" in window)||Notification.permission==="granted";
  $("#s-notif").checked=S.notif;$("#s-snd").checked=S.snd;$("#s-ring").checked=S.ring;
  $("#s-vol").value=Math.round(S.vol*100);$("#s-theme").value=S.theme||"dark";$("#ps").textContent=PS.msg;
  fillDevs(false);
  const sel=$("#s-tone");sel.innerHTML=Object.entries(TONES).map(([k,t])=>`<option value="${k}">${t.n}</option>`).join("");sel.value=S.tone;
}
function chg(){
  S.notif=$("#s-notif").checked;S.snd=$("#s-snd").checked;S.ring=$("#s-ring").checked;
  S.vol=Math.max(.1,Math.min(1,$("#s-vol").value/100));S.tone=$("#s-tone").value;
  S.out=$("#s-out").value;S.mic=$("#s-mic").value;S.theme=$("#s-theme").value;applyTheme();applyOut();
  saveS();
}
