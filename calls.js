/* Orbit: panggilan suara & video langsung di dalam aplikasi (WebRTC).
   Penghubung (signaling) memakai tabel call_signals + Supabase Realtime (jalankan perbaikan-panggilan.sql).
   Memakai: me, P, peer, F, sb, $, av, nm, toast, refresh, friends (app.js) dan tone, ringStart, ringStop, sysNotify, away, who (notif.js). */

/* STUN gratis sudah cukup untuk sebagian besar jaringan.
   Bila panggilan sering gagal tersambung (jaringan seluler/kantor yang ketat), tambahkan server TURN, contoh:
   {urls:"turn:NAMA-SERVER:443?transport=tcp",username:"USER",credential:"PASSWORD"} */
const TURN=[];
const ICE=[{urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]},...TURN];

let CL=null,inbox=null,sq=Promise.resolve(),rb=null,PI={},sigErr="";
const fmt=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};

/* ----- Penghubung ----- */
function initCalls(){
  if(inbox)sb.removeChannel(inbox);
  inbox=sb.channel("cs-"+me.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"call_signals",filter:"to_user=eq."+me.id},p=>{
    const r=p.new||{};onSig({t:r.kind,from:r.from_user,cid:r.cid,...(r.data||{})});
  }).subscribe();
}
function resetCall(){
  if(CL)finish(CL,"error");
  if(inbox){sb.removeChannel(inbox);inbox=null}
}
/* Kirim sinyal (berurutan). Mengembalikan true bila berhasil. */
function sig(to,p,cid){
  const {t,...data}=p;
  const row={from_user:me.id,to_user:to,cid:cid||CL?.cid,kind:t,data};
  const job=sq.then(async()=>{
    const {error}=await sb.from("call_signals").insert(row);
    if(error){sigErr=error.message;console.warn("sinyal panggilan gagal",error);return false}
    return true;
  }).catch(e=>{sigErr=String(e?.message||e);return false});
  sq=job;return job;
}

/* ----- Media & koneksi ----- */
async function getMedia(video){
  const a={echoCancellation:true,noiseSuppression:true};
  try{return await navigator.mediaDevices.getUserMedia({audio:a,video:video?{facingMode:"user",width:{ideal:640}}:false})}
  catch(e){if(video){try{return await navigator.mediaDevices.getUserMedia({audio:a})}catch{}}throw e}
}
function mkPC(c){
  const pc=new RTCPeerConnection({iceServers:ICE});c.pc=pc;
  c.stream.getTracks().forEach(t=>pc.addTrack(t,c.stream));
  $("#lv").srcObject=c.stream;$("#lv").hidden=!c.stream.getVideoTracks().length;
  pc.ontrack=e=>{
    $("#rv").srcObject=e.streams[0]||new MediaStream([e.track]);
    if(e.track.kind==="video"){c.rvid=true;showCall()}
    $("#rv").play?.().catch(()=>{});
  };
  pc.onicecandidate=e=>{if(e.candidate)sig(c.peer,{t:"ice",cand:e.candidate.toJSON()},c.cid)};
  pc.onconnectionstatechange=()=>{
    const s=pc.connectionState;
    if(s==="connected"){clearTimeout(c.to);clearTimeout(c.dt);if(!c.t0)c.t0=Date.now();c.state="conn";showCall();clearInterval(c.tk);c.tk=setInterval(tick,1000)}
    else if(s==="failed")finish(c,"failed");
    else if(s==="disconnected"){clearTimeout(c.dt);c.dt=setTimeout(()=>{if(pc.connectionState!=="connected")finish(c,"failed")},8000)}
  };
  return pc;
}
function addIce(c,cand){
  if(c.pc?.remoteDescription)c.pc.addIceCandidate(cand).catch(()=>{});else c.ice.push(cand);
}
function flushIce(c){c.ice.splice(0).forEach(x=>c.pc.addIceCandidate(x).catch(()=>{}))}
const connTimeout=c=>{clearTimeout(c.to);c.to=setTimeout(()=>{if(c.state!=="conn"){sig(c.peer,{t:"end"},c.cid);finish(c,"failed")}},25000)};

/* ----- Memulai panggilan (penelepon) ----- */
async function startCall(video){
  if(CL)return toast("Sedang dalam panggilan.");
  if(!peer)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)return toast("Browser ini belum mendukung panggilan (butuh HTTPS).");
  ac();
  const c=CL={cid:crypto.randomUUID(),peer,video,dir:"out",state:"ring",ice:[]};
  showCall();
  try{c.stream=await getMedia(video)}
  catch(e){CL=null;showCall();return toast("Tidak bisa memakai mikrofon/kamera. Izinkan aksesnya di browser.")}
  if(CL!==c){c.stream.getTracks().forEach(t=>t.stop());return}
  try{
    const pc=mkPC(c),o=await pc.createOffer();await pc.setLocalDescription(o);
    sig(c.peer,{t:"offer",video,sdp:{type:o.type,sdp:o.sdp}},c.cid).then(ok=>{
      if(!ok&&CL===c){toast("Panggilan gagal dikirim: "+sigErr+(/call_signals/.test(sigErr)?" — jalankan perbaikan-panggilan.sql di Supabase.":""));finish(c,"error")}
    });
    rbStart();
    c.slowT=setTimeout(()=>{if(CL===c&&c.state==="ring"&&!c.acked){c.slow=true;showCall()}},10000);
    c.to=setTimeout(()=>{sig(c.peer,{t:"cancel"},c.cid);finish(c,"noanswer")},45000);
  }catch(e){finish(c,"failed")}
}

/* ----- Sinyal masuk ----- */
async function onSig(p){
  if(!me||!p||p.from===me.id||!friends().includes(p.from))return;
  if(p.t==="offer"){
    if(CL)return sig(p.from,{t:"busy"},p.cid);
    const name=await who(p.from);
    if(CL)return sig(p.from,{t:"busy"},p.cid);
    const c=CL={cid:p.cid,peer:p.from,video:!!p.video,dir:"in",state:"ring",offer:p.sdp,ice:PI[p.cid]||[]};
    delete PI[p.cid];
    sig(p.from,{t:"ring"},p.cid);
    showCall();if(S.ring)ringStart();
    c.to=setTimeout(()=>finish(c,"cancel"),50000);
    if(away())sysNotify(p.video?"🎥 Panggilan video masuk":"📞 Panggilan masuk",name,"call-"+p.from);
    return;
  }
  const c=CL;
  if(p.t==="ice"&&(!c||c.cid!==p.cid)){(PI[p.cid]=PI[p.cid]||[]).push(p.cand);return}
  if(!c||c.cid!==p.cid||c.peer!==p.from)return;
  try{
    if(p.t==="ring"&&c.dir==="out"&&c.state==="ring"){c.acked=true;c.slow=false;showCall()}
    else if(p.t==="answer"&&c.dir==="out"){
      rbStop();clearTimeout(c.to);c.state="connecting";showCall();connTimeout(c);
      await c.pc.setRemoteDescription(p.sdp);flushIce(c);
    }else if(p.t==="ice")addIce(c,p.cand);
    else if(p.t==="decline")finish(c,"declined");
    else if(p.t==="cancel")finish(c,"cancel");
    else if(p.t==="busy")finish(c,"busy");
    else if(p.t==="end")finish(c,"end");
  }catch(e){console.warn(e);finish(c,"failed")}
}

/* ----- Menjawab / menolak / mengakhiri ----- */
async function acceptCall(){
  const c=CL;if(!c||c.dir!=="in"||c.state!=="ring")return;
  ac();ringStop();clearTimeout(c.to);c.state="connecting";showCall();
  try{c.stream=await getMedia(c.video)}
  catch(e){toast("Tidak bisa memakai mikrofon/kamera. Izinkan aksesnya di browser.");sig(c.peer,{t:"decline"},c.cid);return finish(c,"cancel")}
  try{
    const pc=mkPC(c);connTimeout(c);
    await pc.setRemoteDescription(c.offer);flushIce(c);
    const a=await pc.createAnswer();await pc.setLocalDescription(a);
    sig(c.peer,{t:"answer",sdp:{type:a.type,sdp:a.sdp}},c.cid);
  }catch(e){console.warn(e);sig(c.peer,{t:"end"},c.cid);finish(c,"failed")}
}
function declineCall(){const c=CL;if(!c)return;sig(c.peer,{t:"decline"},c.cid);finish(c,"cancel")}
function hangup(){
  const c=CL;if(!c)return;
  const ring=c.state==="ring";
  sig(c.peer,{t:ring?"cancel":"end"},c.cid);finish(c,ring?"cancel":"end");
}
function togMute(){const c=CL;if(!c?.stream)return;c.muted=!c.muted;c.stream.getAudioTracks().forEach(t=>t.enabled=!c.muted);showCall()}
function togCam(){const c=CL;if(!c?.stream)return;c.camoff=!c.camoff;c.stream.getVideoTracks().forEach(t=>t.enabled=!c.camoff);showCall()}

function finish(c,why){
  if(!c||c.done)return;c.done=true;
  [c.to,c.dt,c.slowT].forEach(clearTimeout);clearInterval(c.tk);
  ringStop();rbStop();
  try{c.stream?.getTracks().forEach(t=>t.stop())}catch{}
  try{c.pc?.close()}catch{}
  $("#rv").srcObject=null;$("#lv").srcObject=null;
  const dur=c.t0?Date.now()-c.t0:0;
  if(CL===c)CL=null;
  showCall();
  const msg={declined:"Panggilan ditolak",noanswer:"Tidak dijawab",busy:"Sedang dalam panggilan lain",failed:"Koneksi panggilan terputus",end:dur?"Panggilan selesai · "+fmt(dur):""}[why];
  if(msg)toast(msg);
  if(c.dir==="out"){
    const body=dur?`📞 Panggilan ${c.video?"video":"suara"} · ${fmt(dur)}`:why==="declined"?"📵 Panggilan ditolak":["cancel","noanswer","busy"].includes(why)?"📵 Panggilan tidak terjawab":null;
    if(body)sb.from("messages").insert({sender:me.id,recipient:c.peer,body}).then(()=>refresh());
  }
}

/* ----- Nada tunggu untuk penelepon ----- */
function rbStart(){rbStop();const go=()=>{tone(425,0,1,"sine",.5);tone(450,0,1,"sine",.5)};go();rb=setInterval(go,3500)}
function rbStop(){clearInterval(rb);rb=null}

/* ----- Layar panggilan ----- */
function tick(){const c=CL;if(c?.state==="conn")$("#cs").textContent=fmt(Date.now()-c.t0)}
function showCall(){
  const c=CL,o=$("#cl");
  if(!c){o.hidden=true;o.classList.remove("vid");return}
  o.hidden=false;
  o.classList.toggle("vid",c.state==="conn"&&!!(c.video||c.rvid));
  $("#cav").innerHTML=av(c.peer,"xl");$("#cn").textContent=nm(c.peer);
  $("#cs").textContent=c.state==="ring"?(c.dir==="in"?(c.video?"Panggilan video masuk":"Panggilan suara masuk"):c.acked?"Berdering…":c.slow?"Menunggu penerima membuka Orbit…":"Memanggil…"):c.state==="conn"?fmt(Date.now()-c.t0):"Menyambungkan…";
  $("#cc").innerHTML=c.dir==="in"&&c.state==="ring"
    ?`<button class="cb no" onclick="declineCall()" aria-label="Tolak">📵<span>Tolak</span></button><button class="cb ok" onclick="acceptCall()" aria-label="Terima">${c.video?"🎥":"📞"}<span>Terima</span></button>`
    :`<button class="cb mt ${c.muted?"on":""}" onclick="togMute()" aria-label="Mikrofon">${c.muted?"🔇":"🎤"}<span>Mikrofon</span></button>${c.video?`<button class="cb mt ${c.camoff?"on":""}" onclick="togCam()" aria-label="Kamera">📷<span>Kamera</span></button>`:""}<button class="cb no" onclick="hangup()" aria-label="Akhiri">📵<span>Akhiri</span></button>`;
}
