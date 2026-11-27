/* Orbit: pengaturan, notifikasi (pesan, undangan teman) dan nada dering panggilan.
   Dimuat setelah app.js; memakai variabel/fungsi milik app.js (me, P, peer, M, nm, av, $, toast, sb, refresh, inc). */

/* ----- Pengaturan (disimpan di perangkat ini) ----- */
const SK="orbit-set";
let S={notif:true,snd:true,ring:true,vol:.8,tone:"klasik",out:"",mic:""};
try{Object.assign(S,JSON.parse(localStorage.getItem(SK)||"{}"))}catch{}
const saveS=()=>{try{localStorage.setItem(SK,JSON.stringify(S))}catch{}};

/* ----- Suara (WebAudio, tanpa file) ----- */
let AC;
function ac(){
  try{
    if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();if(S.out&&AC.setSinkId)AC.setSinkId(S.out).catch(()=>{})}
    if(AC.state==="suspended")AC.resume();
  }catch{}
  return AC;
}
/* ----- Pilihan perangkat suara (headset/speaker/mikrofon) ----- */
const canSink=()=>"setSinkId" in HTMLMediaElement.prototype;
function applyOut(){
  document.querySelectorAll("#grid video").forEach(v=>v.setSinkId&&v.setSinkId(S.out||"").catch(()=>{}));
  if(AC?.setSinkId)AC.setSinkId(S.out||"").catch(()=>{});
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
  $("#s-out").innerHTML=`<option value="">Otomatis (default sistem)</option>`+opt(o.filter(x=>x.deviceId!=="default"),S.out);
  $("#s-mic").innerHTML=`<option value="">Otomatis (default sistem)</option>`+opt(m.filter(x=>x.deviceId!=="default"),S.mic);
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

/* ----- Pesan & undangan: lewat Realtime, dengan pengecekan berkala sebagai cadangan ----- */
const NM=new Set(),NF=new Set();let seeded=false,lastSig="",pollM=null;
async function notifyMsg(m){
  if(!me||m.recipient!==me.id||NM.has(m.id))return;NM.add(m.id);
  if(!seeded)return;
  const name=await who(m.sender);
  if(/^📞 Panggilan (suara|video) ·/.test(m.body||""))return;
  if(peer===m.sender&&!away())return;
  const txt=m.file_path?"📎 "+(m.file_name||"File"):m.body;
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
  if(!("Notification" in window))return "Tidak didukung browser ini";
  return {granted:"Aktif di perangkat ini",denied:"Diblokir di browser",default:"Belum diizinkan"}[Notification.permission];
}
function setOpen(v){
  $("#set").hidden=!v;if(!v)return;
  $("#ns").textContent=permText();
  $("#nbtn").hidden=!("Notification" in window)||Notification.permission==="granted";
  $("#s-notif").checked=S.notif;$("#s-snd").checked=S.snd;$("#s-ring").checked=S.ring;
  $("#s-vol").value=Math.round(S.vol*100);
  fillDevs(false);
  const sel=$("#s-tone");sel.innerHTML=Object.entries(TONES).map(([k,t])=>`<option value="${k}">${t.n}</option>`).join("");sel.value=S.tone;
}
function chg(){
  S.notif=$("#s-notif").checked;S.snd=$("#s-snd").checked;S.ring=$("#s-ring").checked;
  S.vol=Math.max(.1,Math.min(1,$("#s-vol").value/100));S.tone=$("#s-tone").value;
  S.out=$("#s-out").value;S.mic=$("#s-mic").value;applyOut();
  saveS();
}
