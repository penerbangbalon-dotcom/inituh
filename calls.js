/* Orbit: panggilan suara & video 1 lawan 1 dan GRUP (maks. 5 orang) langsung di dalam aplikasi (WebRTC, mesh).
   Penghubung (signaling): tabel call_signals (jalankan perbaikan-panggilan.sql) lewat Supabase Realtime,
   dengan pengecekan berkala (polling) sebagai cadangan bila Realtime tidak sampai.
   Memakai: me, prof, P, peer, sb, $, esc, nm, toast, refresh, friends (app.js) dan tone, ringStart, ringStop, sysNotify, away, who, ac, S (notif.js). */

/* Server ICE: STUN gratis + TURN dari config.js (lihat petunjuk di sana). TURN dibutuhkan bila dua HP
   berada di jaringan seluler/WiFi berbeda; tanpa TURN panggilan sering macet di "Menyambungkan…". */
const STUN={urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]};
let ICE=[STUN],iceAt=0;
async function loadIce(){
  if(Date.now()-iceAt<30*60e3)return;
  const base=[STUN,...(window.ORBIT_TURN||[])];ICE=base;iceAt=Date.now();
  const u=window.ORBIT_TURN_API;if(!u)return;
  try{
    const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),4000);
    const r=await fetch(u,{signal:ctl.signal});clearTimeout(t);
    if(!r.ok)throw new Error(r.status);
    const j=await r.json();if(Array.isArray(j))ICE=[...base,...j];
  }catch(e){iceAt=0;console.warn("Gagal mengambil server TURN",e)}
}
const hasTurn=()=>ICE.some(s=>[].concat(s.urls).some(x=>/^turns?:/.test(x)));
const MAXP=5;

let CL=null,inbox=null,sq=Promise.resolve(),rb=null,PI={},sigErr="",seenSig=new Set(),pollS=null;
const fmt=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};
const nmx=id=>P[id]?.display_name||CL?.names?.[id]||"Pengguna";
const avx=(id,c="")=>{const u=P[id]?.avatar_url;return `<div class="av ${c}"${u?` style="background-image:url('${esc(u)}')"`:""}>${u?"":esc((nmx(id)[0]||"?").toUpperCase())}</div>`};
const others=c=>c.members.filter(m=>m!==me.id);
const PEND=["calling","ringing"];

/* ----- Penghubung ----- */
function handleRow(r){
  if(!r||!r.id||seenSig.has(r.id))return;seenSig.add(r.id);
  onSig({t:r.kind,from:r.from_user,cid:r.cid,...(r.data||{})});
}
function initCalls(){
  if(inbox)sb.removeChannel(inbox);clearTimeout(pollS);
  inbox=sb.channel("cs-"+me.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"call_signals",filter:"to_user=eq."+me.id},p=>handleRow(p.new)).subscribe();
  /* Tandai sinyal lama sebagai sudah dilihat, lalu cek berkala (cadangan bila Realtime tidak sampai) */
  sb.from("call_signals").select("*").eq("to_user",me.id).order("created_at",{ascending:true}).limit(200).then(({data})=>{
    (data||[]).forEach(r=>seenSig.add(r.id));
    schedPoll();
  });
  loadIce();
}
/* Lebih sering saat sedang dalam panggilan agar sinyal koneksi cepat sampai */
function schedPoll(){clearTimeout(pollS);pollS=setTimeout(async()=>{try{await pollSig()}catch{}if(me)schedPoll()},CL?600:2000)}
async function pollSig(){
  if(!me)return;
  const {data}=await sb.from("call_signals").select("*").eq("to_user",me.id).order("created_at",{ascending:false}).limit(60);
  (data||[]).slice().reverse().forEach(handleRow);
}
function resetCall(){
  if(CL)finish(CL,"error");
  clearTimeout(pollS);pollS=null;
  if(inbox){sb.removeChannel(inbox);inbox=null}
  if(typeof stopPolling==="function")stopPolling();
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
  if(S.mic)a.deviceId={ideal:S.mic};
  try{return await navigator.mediaDevices.getUserMedia({audio:a,video:video?{facingMode:"user",width:{ideal:640}}:false})}
  catch(e){if(video){try{return await navigator.mediaDevices.getUserMedia({audio:a})}catch{}}throw e}
}
function mkPeer(c,id){
  if(c.pp[id])return c.pp[id];
  const pc=new RTCPeerConnection({iceServers:ICE}),pr=c.pp[id]={id,pc,state:"connecting"};
  c.stream.getTracks().forEach(t=>pc.addTrack(t,c.stream));
  pc.ontrack=e=>{
    pr.rs=e.streams[0]||new MediaStream([e.track]);
    if(e.track.kind==="video")pr.hasV=true;
    renderTiles();
  };
  pr.q=[];
  pc.onicecandidate=e=>{
    if(!e.candidate)return;pr.q.push(e.candidate.toJSON());clearTimeout(pr.qt);
    pr.qt=setTimeout(()=>{const a=pr.q.splice(0);if(a.length)sig(id,{t:"ice",cands:a},c.cid)},200);
  };
  pc.onconnectionstatechange=()=>{
    const s=pc.connectionState;
    if(s==="connected"){
      pr.state="conn";clearTimeout(pr.dt);c.st[id]="joined";
      if(!c.t0){c.t0=Date.now();clearInterval(c.tk);c.tk=setInterval(tick,1000);if(S.ring)connBeep()}
      c.state="conn";clearTimeout(c.to);showCall();
    }else if(s==="failed")closePeer(c,id,"failed");
    else if(s==="disconnected"){clearTimeout(pr.dt);pr.dt=setTimeout(()=>{if(pc.connectionState!=="connected")closePeer(c,id,"failed")},8000)}
  };
  return pr;
}
function addIce(c,id,cand){
  const pr=c.pp[id];
  if(pr?.pc.remoteDescription)pr.pc.addIceCandidate(cand).catch(()=>{});else(c.ib[id]=c.ib[id]||[]).push(cand);
}
function flushIce(c,id){const pr=c.pp[id];if(!pr)return;(c.ib[id]||[]).splice(0).forEach(x=>pr.pc.addIceCandidate(x).catch(()=>{}))}
/* Aturan tanpa tabrakan: yang berid lebih kecil membuat offer. */
function connectTo(c,x){
  if(!c.live||x===me.id||c.pp[x]||!c.members.includes(x))return;
  if(me.id<x)offerTo(c,x,mkPeer(c,x));
}
async function offerTo(c,x,pr){
  try{const o=await pr.pc.createOffer();await pr.pc.setLocalDescription(o);sig(x,{t:"offer",sdp:{type:o.type,sdp:o.sdp}},c.cid)}
  catch(e){closePeer(c,x,"failed")}
}
async function onOffer(c,x,sdp){
  const pr=mkPeer(c,x);
  await pr.pc.setRemoteDescription(sdp);flushIce(c,x);
  const a=await pr.pc.createAnswer();await pr.pc.setLocalDescription(a);
  sig(x,{t:"answer",sdp:{type:a.type,sdp:a.sdp}},c.cid);
}
function closePeer(c,id,why){
  const pr=c.pp[id];
  if(pr){clearTimeout(pr.dt);try{pr.pc.close()}catch{}delete c.pp[id]}
  c.joined.delete(id);c.st[id]=why;
  renderTiles();checkEnd(c);
}
function dropMember(c,x,why){
  if(!c.live){
    c.joined.delete(x);c.st[x]=why;
    if(x===c.host&&c.joined.size===0)return finish(c,"cancel");
    return showCall();
  }
  closePeer(c,x,why);
}
function checkEnd(c){
  if(CL!==c||!c.live||c.state==="ring")return;
  if(Object.keys(c.pp).length===0&&!others(c).some(id=>PEND.includes(c.st[id])))finish(c,c.t0?"end":"failed");
}
function checkRingDone(c){
  if(CL!==c||c.dir!=="out"||c.state!=="ring"||others(c).some(id=>PEND.includes(c.st[id])))return;
  const s=others(c).map(id=>c.st[id]);
  finish(c,s.every(x=>x==="declined")?"declined":s.every(x=>x==="busy")?"busy":"noanswer");
}
const connTimeout=c=>{
  clearTimeout(c.hintT);c.hintT=setTimeout(()=>{if(CL===c&&c.state!=="conn"){c.hint=true;showCall()}},8000);
  clearTimeout(c.to);c.to=setTimeout(()=>{
  if(CL!==c||c.state==="conn")return;
  others(c).forEach(id=>{if(c.pp[id]||c.joined.has(id))sig(id,{t:"leave"},c.cid)});
  finish(c,"failed");
},25000)};

/* ----- Memulai panggilan (suara/video, 1 atau beberapa teman) ----- */
async function startCall(video,ids){
  if(CL)return toast("Sedang dalam panggilan.");
  ids=[...new Set((ids||[peer]).filter(Boolean))].filter(id=>friends().includes(id)).slice(0,MAXP-1);
  if(!ids.length)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)return toast("Browser ini belum mendukung panggilan (butuh HTTPS).");
  ac();
  if(S.ring){dialBeep();rbStart()}
  const names={[me.id]:prof.display_name};ids.forEach(id=>names[id]=nm(id));
  const c=CL={cid:crypto.randomUUID(),host:me.id,dir:"out",video,members:[me.id,...ids],names,state:"ring",live:true,pp:{},ib:{},joined:new Set(),st:{}};
  ids.forEach(id=>c.st[id]="calling");
  showCall();
  try{c.stream=await getMedia(video)}
  catch(e){rbStop();CL=null;showCall();return toast("Tidak bisa memakai mikrofon/kamera. Izinkan aksesnya di browser.")}
  await loadIce();
  if(CL!==c){c.stream.getTracks().forEach(t=>t.stop());return}
  $("#lv").srcObject=c.stream;$("#lv").hidden=!c.stream.getVideoTracks().length;
  let fail=0;
  ids.forEach(id=>sig(id,{t:"invite",video,members:c.members,names},c.cid).then(ok=>{
    if(ok)return;
    fail++;c.st[id]="failed";
    if(fail===ids.length&&CL===c){toast("Panggilan gagal dikirim: "+sigErr+(/call_signals/.test(sigErr)?" — jalankan perbaikan-panggilan.sql di Supabase.":""));finish(c,"error")}
    else renderTiles();
  }));
  c.slowT=setTimeout(()=>{if(CL===c&&c.state==="ring"&&!others(c).some(id=>c.st[id]==="ringing")){c.slow=true;showCall()}},10000);
  c.to=setTimeout(()=>{
    if(CL!==c)return;
    others(c).filter(id=>PEND.includes(c.st[id])).forEach(id=>{sig(id,{t:"cancel"},c.cid);c.st[id]="noanswer"});
    if(c.state==="ring")finish(c,"noanswer");else renderTiles();
  },45000);
}

/* ----- Sinyal masuk ----- */
async function onSig(p){
  if(!me||!p||p.from===me.id)return;
  const c=CL;
  if(p.t==="invite"){
    if(!friends().includes(p.from)||!Array.isArray(p.members)||!p.members.includes(me.id)||p.members.length>MAXP)return;
    if(c)return c.cid===p.cid?undefined:sig(p.from,{t:"busy"},p.cid);
    const names=p.names&&typeof p.names==="object"?p.names:{};
    if(!names[p.from])names[p.from]=await who(p.from);
    if(CL)return sig(p.from,{t:"busy"},p.cid);
    /* Penelepon sudah ada di panggilan sejak awal, jadi dianggap bergabung (supaya penerima bisa membuat offer bila id-nya lebih kecil) */
    const nc=CL={cid:p.cid,host:p.from,dir:"in",video:!!p.video,members:p.members,names,state:"ring",live:false,pp:{},ib:{},joined:new Set([p.from]),st:{}};
    (PI[p.cid]||[]).forEach(x=>(nc.ib[x.from]=nc.ib[x.from]||[]).push(x.cand));delete PI[p.cid];
    sig(p.from,{t:"ring"},p.cid);
    showCall();if(S.ring)ringStart();
    nc.to=setTimeout(()=>finish(nc,"cancel"),50000);
    if(away())sysNotify(nc.members.length>2?"👥 Panggilan grup masuk":p.video?"🎥 Panggilan video masuk":"📞 Panggilan masuk",nmx(p.from)+(nc.members.length>2?" mengajak panggilan grup":""),"call-"+p.cid);
    return;
  }
  if(p.t==="ice"&&(!c||c.cid!==p.cid)){
    if(Object.keys(PI).length<20&&(PI[p.cid]||[]).length<200)(p.cands||[p.cand]).forEach(x=>(PI[p.cid]=PI[p.cid]||[]).push({from:p.from,cand:x}));
    return;
  }
  if(!c||c.cid!==p.cid||!c.members.includes(p.from))return;
  const x=p.from;
  try{
    switch(p.t){
      case "ring":if(c.dir==="out"&&c.st[x]==="calling"){c.st[x]="ringing";c.slow=false;showCall()}break;
      case "hello":
        c.joined.add(x);if(PEND.includes(c.st[x])||!c.st[x])c.st[x]="joined";
        if(c.dir==="out"&&c.state==="ring"){c.state="connecting";rbStop();clearTimeout(c.to);connTimeout(c)}
        connectTo(c,x);showCall();break;
      case "offer":if(c.live)await onOffer(c,x,p.sdp);break;
      case "answer":{const pr=c.pp[x];if(pr){await pr.pc.setRemoteDescription(p.sdp);flushIce(c,x)}break}
      case "ice":(p.cands||[p.cand]).forEach(k=>k&&addIce(c,x,k));break;
      case "decline":case "busy":if(c.dir==="out"&&PEND.includes(c.st[x])){c.st[x]=p.t==="busy"?"busy":"declined";showCall();checkRingDone(c)}break;
      case "cancel":if(x===c.host&&!c.live)finish(c,"cancel");else dropMember(c,x,"left");break;
      case "leave":case "end":dropMember(c,x,"left");break;
    }
  }catch(e){console.warn(e);if(p.t==="offer"||p.t==="answer")closePeer(c,x,"failed")}
}

/* ----- Menjawab / menolak / mengakhiri ----- */
async function acceptCall(){
  const c=CL;if(!c||c.dir!=="in"||c.live)return;
  ac();ringStop();clearTimeout(c.to);c.state="connecting";showCall();
  try{c.stream=await getMedia(c.video)}
  catch(e){toast("Tidak bisa memakai mikrofon/kamera. Izinkan aksesnya di browser.");sig(c.host,{t:"decline"},c.cid);return finish(c,"error")}
  await loadIce();
  if(CL!==c){c.stream.getTracks().forEach(t=>t.stop());return}
  $("#lv").srcObject=c.stream;$("#lv").hidden=!c.stream.getVideoTracks().length;
  c.live=true;connTimeout(c);
  others(c).forEach(id=>sig(id,{t:"hello"},c.cid));
  [...c.joined].forEach(id=>connectTo(c,id));
  showCall();
}
function declineCall(){const c=CL;if(!c)return;sig(c.host,{t:"decline"},c.cid);finish(c,"error")}
function hangup(){
  const c=CL;if(!c)return;
  if(c.dir==="in"&&!c.live)return declineCall();
  if(c.state==="ring"){others(c).filter(id=>PEND.includes(c.st[id])).forEach(id=>sig(id,{t:"cancel"},c.cid));finish(c,"cancel")}
  else{others(c).forEach(id=>sig(id,{t:"leave"},c.cid));finish(c,"end")}
}
function togMute(){const c=CL;if(!c?.stream)return;c.muted=!c.muted;c.stream.getAudioTracks().forEach(t=>t.enabled=!c.muted);showCall()}
function togCam(){const c=CL;if(!c?.stream)return;c.camoff=!c.camoff;c.stream.getVideoTracks().forEach(t=>t.enabled=!c.camoff);showCall()}

function finish(c,why){
  if(!c||c.done)return;c.done=true;
  [c.to,c.dt,c.slowT,c.hintT].forEach(clearTimeout);clearInterval(c.tk);
  ringStop();rbStop();
  try{c.stream?.getTracks().forEach(t=>t.stop())}catch{}
  Object.values(c.pp).forEach(pr=>{clearTimeout(pr.dt);try{pr.pc.close()}catch{}});c.pp={};
  $("#lv").srcObject=null;
  const dur=c.t0?Date.now()-c.t0:0;
  if(CL===c)CL=null;
  showCall();
  if(why!=="error"&&why!=="cancel"&&S.ring&&(dur||c.dir==="out"))endBeep();
  const msg={declined:"Panggilan ditolak",noanswer:"Tidak dijawab",busy:"Sedang dalam panggilan lain",failed:c.t0||hasTurn()?"Koneksi panggilan terputus":"Koneksi suara gagal: jaringan kalian butuh server TURN (lihat config.js).",end:dur?"Panggilan selesai · "+fmt(dur):""}[why];
  if(msg)toast(msg);
  if(c.dir==="out"&&c.members.length===2){
    const body=dur?`📞 Panggilan ${c.video?"video":"suara"} · ${fmt(dur)}`:why==="declined"?"📵 Panggilan ditolak":["cancel","noanswer","busy"].includes(why)?"📵 Panggilan tidak terjawab":null;
    if(body)sb.from("messages").insert({sender:me.id,recipient:others(c)[0],body}).then(()=>refresh());
  }
}

/* ----- Nada tunggu untuk penelepon ----- */
function rbStart(){if(!S.ring)return;rbStop();const go=()=>{tone(425,0,.9,"sine",1);tone(450,0,.9,"sine",1)};setTimeout(go,350);rb=setInterval(go,3000)}
const dialBeep=()=>{tone(523,0,.1,"triangle");tone(784,.12,.16,"triangle")};
const connBeep=()=>{tone(660,0,.1,"sine");tone(880,.11,.16,"sine")};
const endBeep=()=>{tone(494,0,.16,"sine");tone(370,.18,.28,"sine")};
function rbStop(){clearInterval(rb);rb=null}

/* ----- Layar panggilan ----- */
function tick(){if(CL?.state==="conn")$("#cs").textContent=fmt(Date.now()-CL.t0)}
const ST={calling:"Memanggil…",ringing:"Berdering…",declined:"Menolak",busy:"Sibuk",noanswer:"Tidak dijawab",left:"Keluar",failed:"Gagal tersambung",joined:"Menyambungkan…"};
function tileStatus(c,id,pr){
  if(pr?.state==="conn")return "";
  if(pr)return "Menyambungkan…";
  if(c.dir==="in"&&!c.live)return "";
  return ST[c.st[id]]||"Menunggu…";
}
function renderTiles(){
  const c=CL,gr=$("#grid");if(!c)return;
  const ids=c.live||c.dir==="out"?others(c):c.members.filter(m=>m!==me.id);
  [...gr.children].forEach(t=>{if(!ids.includes(t.dataset.id))t.remove()});
  gr.className="grid g"+Math.min(ids.length,4);
  ids.forEach(id=>{
    let t=[...gr.children].find(x=>x.dataset.id===id);
    if(!t){t=document.createElement("div");t.className="tile";t.dataset.id=id;t.innerHTML='<video autoplay playsinline></video><div class="tc"><div class="ta"></div><div class="tn"></div><div class="ts"></div></div>';gr.appendChild(t)}
    const pr=c.pp[id],v=t.querySelector("video");
    if(!v.dataset.sk){v.dataset.sk=1;if(S.out&&v.setSinkId)v.setSinkId(S.out).catch(()=>{})}
    if(pr?.rs){if(v.srcObject!==pr.rs){v.srcObject=pr.rs;v.play?.().catch(()=>{})}}else if(v.srcObject)v.srcObject=null;
    t.classList.toggle("v",!!(pr?.hasV&&pr.state==="conn"));
    t.querySelector(".ta").innerHTML=avx(id,ids.length>2?"":"xl");
    t.querySelector(".tn").textContent=nmx(id);
    t.querySelector(".ts").textContent=tileStatus(c,id,pr);
  });
}
function showCall(){
  const c=CL,o=$("#cl");
  if(!c){o.hidden=true;$("#grid").innerHTML="";return}
  o.hidden=false;
  const g=c.members.length>2,ringIn=c.dir==="in"&&!c.live&&c.state==="ring";
  $("#cn").textContent=g?"Panggilan grup · "+c.members.length+" peserta":nmx(others(c)[0]||c.host);
  $("#cs").textContent=ringIn?(g?nmx(c.host)+" mengajak panggilan "+(c.video?"video":"suara")+" grup":c.video?"Panggilan video masuk":"Panggilan suara masuk")
    :c.state==="ring"?(others(c).some(id=>c.st[id]==="ringing")?"Berdering…":c.slow?"Menunggu penerima membuka Orbit…":"Memanggil…")
    :c.state==="conn"?fmt(Date.now()-c.t0):"Menyambungkan…"+(c.hint?(hasTurn()?" (jaringan sulit, mencoba terus)":" (mungkin butuh server TURN)"):"");
  const hasCam=!!c.stream?.getVideoTracks().length;
  $("#cc").innerHTML=ringIn
    ?`<button class="cb no" onclick="declineCall()" aria-label="Tolak">📵<span>Tolak</span></button><button class="cb ok" onclick="acceptCall()" aria-label="Terima">${c.video?"🎥":"📞"}<span>Terima</span></button>`
    :`<button class="cb mt ${c.muted?"on":""}" onclick="togMute()" aria-label="Mikrofon">${c.muted?"🔇":"🎤"}<span>Mikrofon</span></button>${hasCam?`<button class="cb mt ${c.camoff?"on":""}" onclick="togCam()" aria-label="Kamera">📷<span>Kamera</span></button>`:""}${canSink()?`<button class="cb mt" onclick="cycOut()" aria-label="Ganti keluaran suara">🎧<span>Suara</span></button>`:""}<button class="cb no" onclick="hangup()" aria-label="Akhiri">📵<span>Akhiri</span></button>`;
  renderTiles();
}

/* Ganti keluaran suara saat panggilan (speaker -> headset -> ...), satu ketukan satu perangkat */
async function cycOut(){
  const {o}=await loadDevs(false);
  const l=o.filter(x=>x.deviceId&&x.deviceId!=="communications");
  if(l.length<2)return toast("Hanya ada satu perangkat keluaran suara yang terdeteksi.");
  const cur=S.out||"default";let i=l.findIndex(x=>x.deviceId===cur);i=(i+1)%l.length;
  S.out=l[i].deviceId==="default"?"":l[i].deviceId;saveS();applyOut();
  toast("🔊 "+(l[i].label||"Perangkat "+(i+1)));
}

/* ----- Pilih peserta panggilan grup ----- */
function openGroup(){
  const l=friends().sort((a,b)=>nm(a).localeCompare(nm(b),"id"));
  if(!l.length)return toast("Belum ada teman untuk diajak.");
  $("#gl").innerHTML=l.map(id=>`<label class="opt"><input type="checkbox" value="${esc(id)}" onchange="gpChk()">${avx(id,"sm")}<span class="sp">${esc(nm(id))}</span></label>`).join("");
  $("#gp").hidden=false;gpChk();
}
function gpChk(){
  const all=[...document.querySelectorAll("#gl input")],n=all.filter(x=>x.checked).length;
  all.forEach(x=>x.disabled=!x.checked&&n>=MAXP-1);
}
const gpClose=()=>{$("#gp").hidden=true};
function startGroup(video){
  const ids=[...document.querySelectorAll("#gl input:checked")].map(x=>x.value);
  if(!ids.length)return toast("Pilih minimal 1 teman.");
  gpClose();startCall(video,ids);
}
