const sb=supabase.createClient("https://epdehfeoagahrnzbymne.supabase.co","sb_publishable_V8f61745CGGWgBifpjLCMA_8E7wDQKb");
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let me,prof,view="chat",peer=null,F=[],P={},M=[],found=null,ch,signup=false,U={};
const toast=t=>{const e=$("#toast");e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,3500)};
addEventListener("error",e=>toast("Error: "+e.message));addEventListener("unhandledrejection",e=>toast("Error: "+(e.reason?.message||e.reason)));
const show=a=>{$("#auth").hidden=!a;$("#app").hidden=a};
const nm=id=>P[id]?.display_name||"Pengguna";
const IC={chat:"M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z",people:"M16 11a3 3 0 100-6 3 3 0 000 6zm-8 0a3 3 0 100-6 3 3 0 000 6zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",padd:"M15 12a4 4 0 100-8 4 4 0 000 8zM6 10V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",gear:"M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.5.5 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.5.5 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z",more:"M12 8a2 2 0 100-4 2 2 0 000 4zm0 2a2 2 0 100 4 2 2 0 000-4zm0 6a2 2 0 100 4 2 2 0 000-4z",newchat:"M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm-3 9h-4v4h-2v-4H7V9h4V5h2v4h4v2z",search:"M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",phone:"M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z",video:"M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z",clip:"M16.5 6v11.5a4 4 0 01-8 0V5a2.5 2.5 0 015 0v10.5a1 1 0 01-2 0V6H10v9.5a2.5 2.5 0 005 0V5a4 4 0 00-8 0v12.5a5.5 5.5 0 0011 0V6h-1.5z",mic:"M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5.3-3a5.3 5.3 0 01-10.6 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-1.7z",send:"M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",play:"M8 5v14l11-7z",pause:"M6 19h4V5H6v14zm8-14v14h4V5h-4z",trash:"M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",back:"M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",pin:"M16 9V4h1a1 1 0 100-2H7a1 1 0 100 2h1v5a3 3 0 01-3 3v2h5.97v7l1 1 1-1v-7H19v-2a3 3 0 01-3-3z",chev:"M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z",tick:"M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z",ticks:"M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z",photo:"M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z",doc:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13z",close:"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"};
const ic=(n,z=22)=>`<svg class="ic" viewBox="0 0 24 24" width="${z}" height="${z}"><path d="${IC[n]||""}"/></svg>`;
const icons=()=>document.querySelectorAll("i[data-ic]:empty").forEach(e=>e.innerHTML=ic(e.dataset.ic,e.closest("#tabs")?24:22));
icons();
const hue=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h%360};
const av=(id,c="")=>{const u=P[id]?.avatar_url,h=hue(id);return `<div class="av ${c}"${u?` style="background-image:url('${esc(u)}')"`:` style="background:hsl(${h} 28% 24%);color:hsl(${h} 60% 74%)"`}>${u?"":esc((nm(id)[0]||"?").toUpperCase())}</div>`};
const isVoice=x=>x?.file_path&&(x.file_type||"").startsWith("audio/");
const vdur=x=>{const m=/(\d+):(\d\d)/.exec(x.body||"");return m?(+m[1]*60+ +m[2]):0};
const mmss=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
/* label teks untuk pesan (daftar obrolan & notifikasi) */
const lbl=x=>{if(!x)return"Mulai obrolan";if(!x.file_path)return x.body;const t=x.file_type||"";return t.startsWith("audio/")?"🎤 Pesan suara "+mmss(vdur(x)):t.startsWith("image/")?"📷 Foto":t.startsWith("video/")?"🎥 Video":"📄 "+(x.file_name||"File")};
/* waktu gaya WhatsApp: jam / Kemarin / nama hari / tanggal */
const lt=t=>{const d=new Date(t),n=new Date(),a=new Date(n.getFullYear(),n.getMonth(),n.getDate()),df=Math.round((a-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/864e5);
  if(df<=0)return hm(t);if(df===1)return"Kemarin";if(df<7)return d.toLocaleDateString("id-ID",{weekday:"long"});return d.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric"})};
const dl=t=>{const d=new Date(t),n=new Date(),a=new Date(n.getFullYear(),n.getMonth(),n.getDate()),df=Math.round((a-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/864e5);
  return df<=0?"Hari ini":df===1?"Kemarin":d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})};
/* favorit disimpan di perangkat */
let FAV=new Set();try{FAV=new Set(JSON.parse(localStorage.getItem("orbit-fav")||"[]"))}catch{}
const togFav=id=>{FAV.has(id)?FAV.delete(id):FAV.add(id);try{localStorage.setItem("orbit-fav",JSON.stringify([...FAV]))}catch{}draw(true)};
let chip="all";
const setChip=c=>{chip=c;draw(true)};
const hm=t=>new Date(t).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
const link=s=>esc(s).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');

/* ----- Masuk / daftar ----- */
function mode(){signup=!signup;$("#nm").hidden=!signup;$("#ab").textContent=signup?"Daftar":"Masuk";$("#at").textContent=signup?"Sudah punya akun? Masuk":"Belum punya akun? Daftar";$("#am").textContent=signup?"Buat akun baru. Kamu akan mendapat kode unik.":"Masuk untuk mulai mengobrol."}
async function auth(){
  const email=$("#em").value.trim(),password=$("#pw").value;
  if(!email||password.length<6)return toast("Isi email dan kata sandi (min. 6 karakter).");
  let r;
  if(signup){r=await sb.auth.signUp({email,password,options:{data:{full_name:$("#nm").value.trim()}}});if(!r.error&&!r.data.session)toast("Cek email untuk konfirmasi, lalu masuk.")}
  else r=await sb.auth.signInWithPassword({email,password});
  if(r.error)toast(r.error.message);
}
sb.auth.onAuthStateChange((_e,s)=>{
  if(s?.user){if(me?.id!==s.user.id){me=s.user;setTimeout(boot,0)}}
  else{me=prof=peer=null;if(ch)sb.removeChannel(ch);if(typeof resetCall==="function")resetCall();show(true)}
});
async function boot(){
  let {data,error:e0}=await sb.from("profiles").select("*").eq("id",me.id).maybeSingle();
  if(e0)toast("Gagal baca profil: "+e0.message);
  if(!data){const r=await sb.rpc("ensure_profile");if(r.error)toast("ensure_profile gagal: "+r.error.message);({data}=await sb.from("profiles").select("*").eq("id",me.id).maybeSingle())}
  prof=data||{id:me.id,code:"",username:null,display_name:me.user_metadata?.full_name||(me.email||"Saya").split("@")[0]};
  if(!data)toast("Profil belum lengkap. Jalankan perbaikan-profil.sql di Supabase.");
  P[me.id]=prof;show(false);
  ch=sb.channel("rt").on("postgres_changes",{event:"*",schema:"public",table:"messages"},p=>{onMsg(p);refresh()}).on("postgres_changes",{event:"*",schema:"public",table:"friendships"},p=>{onFriend(p);refresh()}).subscribe();
  if(typeof initCalls==="function")initCalls();
  if(typeof startPolling==="function")startPolling();
  refresh();
}

/* ----- Data ----- */
async function refresh(){
  if(!me)return;
  const [f,m]=await Promise.all([sb.from("friendships").select("*"),sb.from("messages").select("*").order("created_at",{ascending:false}).limit(500)]);
  F=f.data||[];M=m.data||[];
  const ids=[...new Set(F.flatMap(x=>[x.requester,x.addressee]))].filter(i=>i!==me.id);
  if(ids.length){const {data}=await sb.from("profiles").select("id,code,username,display_name,avatar_url").in("id",ids);(data||[]).forEach(p=>P[p.id]=p)}
  P[me.id]=prof;
  if(peer&&M.some(x=>x.sender===peer&&x.recipient===me.id&&!x.read_at))sb.from("messages").update({read_at:new Date().toISOString()}).eq("sender",peer).eq("recipient",me.id).is("read_at",null).then(()=>{});
  draw(view!=="prof");
}
const other=x=>x.requester===me.id?x.addressee:x.requester;
const friends=()=>F.filter(x=>x.status==="accepted").map(other);
const inc=()=>F.filter(x=>x.status==="pending"&&x.addressee===me.id);
const out=()=>F.filter(x=>x.status==="pending"&&x.requester===me.id);

/* ----- Tampilan ----- */
function go(v){view=v;draw(true)}
/* Keluar: lepaskan HP ini dari akun (token Android) agar tidak menerima panggilan/pesan akun lama */
async function logout(){
  try{if(window.OrbitNative){const t=OrbitNative.getToken();if(t)await sb.rpc("drop_fcm_token",{p_token:t})}}catch{}
  sb.auth.signOut();
}
const TT={chat:"Obrolan",kontak:"Kontak",teman:"Tambah teman",prof:"Profil"};
function draw(side=true){
  $("#me").innerHTML=av(me.id,"sm");document.querySelectorAll("#tabs button[data-v]").forEach(b=>b.classList.toggle("on",b.dataset.v===view));
  const n=inc().length;$("#nb").hidden=!n;$("#nb").textContent=n;
  const ut=M.filter(x=>x.recipient===me.id&&!x.read_at).length;$("#ub").hidden=!ut;$("#ub").textContent=ut;
  $("#ttl").textContent=TT[view]||"Orbit";$("#sx").hidden=view!=="chat";
  if(side){
    const kq=$("#kq")?.value||"",q=$("#q")?.value||"";
    document.querySelectorAll("#chips button").forEach(b=>b.classList.toggle("on",b.dataset.c===chip));
    $("#main").innerHTML=view==="chat"?vChat():view==="kontak"?vKontak():view==="teman"?vTeman():vProf();
    if(view==="teman"&&$("#q"))$("#q").value=q;
    if(view==="kontak"&&$("#kq")){$("#kq").value=kq;kfilter()}
    if(view==="prof"&&prof.code)new QRCode($("#qr"),{text:prof.code,width:150,height:150});
    icons();
  }
  if(peer)fillMsgs();
  badge();
}
function vChat(){
  const q=($("#gq")?.value||"").trim().toLowerCase();
  let l=friends().map(id=>({id,last:M.find(x=>x.sender===id||x.recipient===id),un:M.filter(x=>x.sender===id&&x.recipient===me.id&&!x.read_at).length}));
  if(!l.length)return `<div class="card mu">Belum ada teman. Ketuk tombol obrolan baru di kanan atas, lalu masukkan kode atau username temanmu.</div>`;
  if(chip==="unread")l=l.filter(x=>x.un);if(chip==="fav")l=l.filter(x=>FAV.has(x.id));
  if(q)l=l.filter(x=>nm(x.id).toLowerCase().includes(q));
  l.sort((a,b)=>(FAV.has(b.id)-FAV.has(a.id))||(b.last?.created_at||"").localeCompare(a.last?.created_at||""));
  if(!l.length)return `<div class="mu" style="padding:18px;text-align:center">${q?"Tidak ada obrolan yang cocok. Mau menambah teman baru? Ketuk tombol obrolan baru.":chip==="unread"?"Tidak ada pesan yang belum dibaca.":"Belum ada favorit. Buka obrolan, lalu menu ⋮ > Tambah ke favorit."}</div>`;
  return l.map(({id,last,un})=>{
    const mine=last&&last.sender===me.id;
    const tk=mine?`<span class="tk ${last.read_at?"rd":""}">${ic(last.read_at?"ticks":"tick",16)}</span>`:"";
    const kind=last?.file_path?(isVoice(last)?ic("mic",15):(last.file_type||"").startsWith("image/")?ic("photo",15):ic("doc",15)):"";
    const txt=last?.file_path?(isVoice(last)?"Pesan suara "+mmss(vdur(last)):(last.file_type||"").startsWith("image/")?"Foto":last.file_name||"File"):lbl(last);
    return `<div class="it ${peer===id?"on":""}" onclick="open1('${id}')">${av(id)}<div class="sp"><div class="row"><b class="sp ell" style="font-weight:500">${esc(nm(id))}</b><span class="tm ${un?"un":""}">${last?lt(last.created_at):""}</span></div><div class="row"><span class="pv sp">${tk}${kind}<span class="ell">${esc(txt)}</span></span>${FAV.has(id)?`<span class="pi">${ic("pin",16)}</span>`:""}${un?`<span class="bd">${un}</span>`:""}<button class="chv" onclick="event.stopPropagation();togFav('${id}')" title="${FAV.has(id)?"Hapus dari favorit":"Tambah ke favorit"}">${ic("chev",20)}</button></div></div></div>`}).join("");
}
function vKontak(){
  const l=friends().sort((a,b)=>nm(a).localeCompare(nm(b),"id"));
  if(!l.length)return `<div class="card mu">Belum ada kontak. Buka tab ➕ Tambah untuk mencari teman dengan kode atau username.</div>`;
  const rows=l.map(id=>{const p=P[id]||{};return `<div class="it ${peer===id?"on":""}" data-n="${esc((nm(id)+" "+(p.username||"")+" "+(p.code||"")).toLowerCase())}" onclick="open1('${id}')">${av(id)}<div class="sp"><b class="ell" style="display:block">${esc(nm(id))}</b><div class="mu ell">${p.username?"@"+esc(p.username):esc(p.code||"")}</div></div><button class="d s" onclick="event.stopPropagation();hapusTeman('${id}')" title="Hapus dari kontak">Hapus</button></div>`}).join("");
  return `<div class="card"><input id="kq" placeholder="Cari kontak…" oninput="kfilter()"><button class="g s" style="width:100%;margin-top:8px" onclick="openGroup()">👥 Panggilan grup</button></div><h3>Kontak (${l.length})</h3>${rows}<div id="kn" class="mu" style="padding:8px" hidden>Tidak ada kontak yang cocok.</div>`;
}
function kfilter(){
  const q=($("#kq")?.value||"").trim().toLowerCase();let n=0;
  document.querySelectorAll("#main .it[data-n]").forEach(e=>{const ok=!q||e.dataset.n.includes(q);e.hidden=!ok;if(ok)n++});
  const k=$("#kn");if(k)k.hidden=n>0;
}
async function hapusTeman(id){
  if(!confirm("Hapus "+nm(id)+" dari kontak? Kalian tidak bisa saling mengirim pesan sampai berteman lagi."))return;
  const fr=F.find(x=>other(x)===id&&x.status==="accepted");if(!fr)return;
  const {error}=await sb.from("friendships").delete().eq("id",fr.id);
  if(error)return toast(error.message);
  if(peer===id)back();toast("Dihapus dari kontak.");refresh();
}
function vTeman(){
  let h=`<div class="card"><div class="mu" style="margin-bottom:8px">Cari teman dengan kode atau username (harus persis).</div><div class="row"><input id="q" placeholder="Contoh: K7M3P9XQ" onkeydown="if(event.key==='Enter')cari()"><button onclick="cari()">Cari</button></div>`;
  if(found===0)h+=`<div class="mu" style="margin-top:8px">Tidak ditemukan.</div>`;
  else if(found)h+=`<div class="row" style="margin-top:10px">${av(found.id)}<div class="sp"><b>${esc(found.display_name)}</b><div class="mu">${esc(found.username||found.code)}</div></div><button class="s" onclick="minta()">Tambah</button></div>`;
  h+=`</div>`;
  if(inc().length)h+=`<h3>Permintaan masuk</h3>`+inc().map(x=>`<div class="card row">${av(x.requester)}<b class="sp">${esc(nm(x.requester))}</b><button class="s" onclick="jawab('${x.id}',true)">Terima</button><button class="g s" onclick="jawab('${x.id}',false)">Tolak</button></div>`).join("");
  if(out().length)h+=`<h3>Menunggu persetujuan</h3>`+out().map(x=>`<div class="card row">${av(x.addressee)}<b class="sp">${esc(nm(x.addressee))}</b><button class="g s" onclick="jawab('${x.id}',false)">Batal</button></div>`).join("");
  return h;
}
function vProf(){
  return `<div class="card" style="text-align:center">${av(me.id,"xl")}<div style="margin:10px"><button class="g s" onclick="$('#pi').click()">Ganti foto profil</button><input type="file" id="pi" accept="image/*" hidden onchange="foto(this)"></div>
  <div class="mu">Kode kamu (bagikan ke teman)</div><div class="code">${prof.code?esc(prof.code):"(belum ada, jalankan perbaikan-profil.sql di Supabase)"}</div><div id="qr"></div><button class="g s" onclick="salin()">Salin kode</button></div>
  <div class="card"><div class="mu" style="margin-bottom:6px">Nama tampilan</div><div class="row"><input id="dn" value="${esc(prof.display_name)}" maxlength="40"><button class="s" onclick="simpanNama()">Simpan</button></div></div>
  <div class="card"><div class="mu" style="margin-bottom:6px">Username (opsional: 4-20 karakter, huruf kecil, angka, _)</div><div class="row"><input id="un" value="${esc(prof.username||"")}" maxlength="20" placeholder="contoh: budi_sd12"><button class="s" onclick="simpanUser()">Simpan</button></div><div class="mu" style="margin-top:6px">Bisa diganti sekali setiap 30 hari.</div></div>
  <button class="d" style="width:100%" onclick="logout()">Keluar</button>`;
}

/* ----- Profil & teman ----- */
const salin=()=>!prof.code?toast("Kode belum ada. Jalankan perbaikan-profil.sql."):navigator.clipboard?.writeText(prof.code).then(()=>toast("Kode disalin."),()=>toast("Salin manual: "+prof.code));
async function simpanNama(){const v=$("#dn").value.trim();if(!v)return toast("Nama tidak boleh kosong.");const {error}=await sb.from("profiles").update({display_name:v}).eq("id",me.id);if(error)return toast(error.message);prof.display_name=v;toast("Nama disimpan.")}
async function simpanUser(){
  const {error}=await sb.rpc("set_username",{new_name:$("#un").value});
  if(error)return toast(error.message.includes("duplicate")?"Username sudah dipakai.":error.message);
  const {data}=await sb.from("profiles").select("*").eq("id",me.id).single();prof=data;P[me.id]=data;toast("Username disimpan.");
}
async function cari(){const q=$("#q").value.trim();if(!q)return;const {data}=await sb.rpc("find_profile",{q});found=data?.[0]||0;if(found)P[found.id]=found;draw(true)}
async function minta(){const {error}=await sb.from("friendships").insert({requester:me.id,addressee:found.id});if(error)return toast(error.code==="23505"?"Sudah ada permintaan atau sudah berteman.":error.message);found=null;toast("Permintaan terkirim.");refresh()}
async function jawab(id,ok){const r=ok?await sb.from("friendships").update({status:"accepted"}).eq("id",id):await sb.from("friendships").delete().eq("id",id);if(r.error)toast(r.error.message);refresh()}

/* ----- Foto & file ----- */
async function shrink(f,max,q){
  if(!f.type.startsWith("image/")||f.type==="image/gif")return f;
  const im=await createImageBitmap(f),r=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");
  c.width=im.width*r;c.height=im.height*r;c.getContext("2d").drawImage(im,0,0,c.width,c.height);
  return new Promise(res=>c.toBlob(b=>res(new File([b],f.name.replace(/\.\w+$/,"")+".jpg",{type:"image/jpeg"})),"image/jpeg",q));
}
async function foto(inp){
  const f0=inp.files[0];inp.value="";if(!f0)return;
  const f=await shrink(f0,256,.8),path=`${me.id}/avatar-${Date.now()}.jpg`;
  const u=await sb.storage.from("avatars").upload(path,f,{contentType:"image/jpeg"});if(u.error)return toast(u.error.message);
  const url=sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const {error}=await sb.from("profiles").update({avatar_url:url}).eq("id",me.id);if(error)return toast(error.message);
  prof.avatar_url=url;P[me.id]=prof;toast("Foto profil diperbarui.");draw(true);
}
async function upl(inp){
  let f=inp.files[0];inp.value="";if(!f||!peer)return;
  f=await shrink(f,1280,.75);
  if(f.size>20*1048576)return toast("File terlalu besar (maks. 20 MB).");
  toast("Mengunggah…");
  const path=`${me.id}/${peer}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g,"_")}`;
  const u=await sb.storage.from("files").upload(path,f,{contentType:f.type||"application/octet-stream"});
  if(u.error)return toast("Gagal unggah: "+u.error.message);
  const {error}=await sb.from("messages").insert({sender:me.id,recipient:peer,body:f.name,file_path:path,file_name:f.name,file_type:f.type});
  if(error)return toast(error.message);refresh();
}
function media(el,u){
  const t=el.dataset.t,n=esc(el.dataset.n);
  if(t.startsWith("audio/"))return voiceHtml(el,u);
  u=esc(u);
  el.innerHTML=t.startsWith("image/")?`<a href="${u}" target="_blank"><img src="${u}"></a>`:t.startsWith("video/")?`<video src="${u}" controls preload="metadata"></video>`:`<a href="${u}" target="_blank" download="${n}">📄 ${n}</a>`;
}
function hyd(){document.querySelectorAll("[data-p]").forEach(async el=>{const p=el.dataset.p;if(!U[p]){const {data}=await sb.storage.from("files").createSignedUrl(p,3600);if(!data)return;U[p]=data.signedUrl}media(el,U[p])})}

/* ----- Obrolan ----- */
function open1(id){peer=id;$("#app").classList.add("op");$("#ph").hidden=true;$("#cv").hidden=false;$("#ct").textContent=nm(id);$("#ca").innerHTML=av(id,"sm");$("#cmf").textContent=FAV.has(id)?"Hapus dari favorit":"Tambah ke favorit";$("#msgs").dataset.s="";$("#msgs").dataset.sig="";recStop(false);refresh()}
function back(){peer=null;recStop(false);vpStop();$("#app").classList.remove("op");$("#ph").hidden=false;$("#cv").hidden=true;refresh()}
function barSync(){const t=$("#mi").value.trim();$("#snd").hidden=!t;$("#mic").hidden=!!t}
function fillMsgs(){
  const box=$("#msgs"),list=M.filter(x=>x.sender===peer||x.recipient===peer).reverse();
  const sig=peer+"|"+list.map(x=>x.id+(x.read_at?"r":"")).join();
  if(box.dataset.sig===sig)return;box.dataset.sig=sig;
  const near=box.scrollHeight-box.scrollTop-box.clientHeight<150;
  let day="";
  box.innerHTML=list.map(x=>{
    const mine=x.sender===me.id,d=new Date(x.created_at).toDateString();let h="";
    if(d!==day){day=d;h=`<div class="dd">${dl(x.created_at)}</div>`}
    const c=x.file_path?`<div data-p="${esc(x.file_path)}" data-t="${esc(x.file_type||"")}" data-n="${esc(x.file_name||"file")}" data-id="${esc(x.id)}" data-d="${vdur(x)}">⏳ ${esc(isVoice(x)?"Pesan suara":x.file_name||"")}</div>`:link(x.body);
    const tk=mine?`<span class="tk ${x.read_at?"rd":""}">${ic(x.read_at?"ticks":"tick",16)}</span>`:"";
    return `${h}<div class="b ${mine?"me":""}">${c}<small>${hm(x.created_at)}${tk}</small></div>`;
  }).join("")||`<div class="ph" style="margin:20px auto">Belum ada pesan. Sapa dulu!</div>`;
  if(near||!box.dataset.s){box.scrollTop=box.scrollHeight;box.dataset.s=1}
  hyd();
}
async function send(){
  const i=$("#mi"),body=i.value.trim();if(!body)return;i.value="";barSync();
  const {error}=await sb.from("messages").insert({sender:me.id,recipient:peer,body});
  if(error){i.value=body;barSync();return toast("Gagal mengirim: "+error.message)}refresh();
}

/* ----- Pesan suara: rekam, kirim, putar ----- */
let RC=null;
const recMime=()=>{if(!window.MediaRecorder)return"";return["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"].find(t=>MediaRecorder.isTypeSupported(t))||""};
async function recStart(){
  if(RC||!peer)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return toast("Browser ini tidak mendukung rekam suara.");
  let st;
  try{st=await navigator.mediaDevices.getUserMedia({audio:S?.mic?{deviceId:{exact:S.mic}}:true})}
  catch(e){return toast(e.name==="NotAllowedError"?"Izin mikrofon ditolak. Izinkan lewat ikon gembok di kolom alamat.":"Mikrofon tidak tersedia: "+e.message)}
  const mime=recMime(),mr=new MediaRecorder(st,mime?{mimeType:mime}:undefined),chunks=[];
  const to=peer,t0=Date.now();
  mr.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  /* indikator level suara */
  let an,ctx,raf;
  try{ctx=new(window.AudioContext||window.webkitAudioContext)();an=ctx.createAnalyser();an.fftSize=256;ctx.createMediaStreamSource(st).connect(an)}catch{}
  const lv=$("#lvl");lv.innerHTML="";let last=0;const buf=new Uint8Array(128);
  const loop=()=>{
    if(!RC)return;const s=Math.floor((Date.now()-t0)/1000);$("#rt").textContent=mmss(s);
    if(an&&Date.now()-last>90){last=Date.now();an.getByteTimeDomainData(buf);let m=0;for(const v of buf)m=Math.max(m,Math.abs(v-128));
      const b=document.createElement("i");b.style.height=Math.max(3,Math.min(28,m/128*60))+"px";lv.appendChild(b);while(lv.children.length>60)lv.firstChild.remove()}
    if(Date.now()-t0>3e5)return recStop(true);raf=requestAnimationFrame(loop)};
  RC={mr,st,chunks,to,t0,mime:mr.mimeType||mime||"audio/webm",ctx,stop:()=>{cancelAnimationFrame(raf);st.getTracks().forEach(t=>t.stop());try{ctx?.close()}catch{}}};
  mr.start(250);
  $(".bar .nrm").hidden=true;$(".bar .rcd").hidden=false;loop();
}
function recStop(send){
  const r=RC;if(!r){$(".bar .nrm").hidden=false;$(".bar .rcd").hidden=true;return}
  RC=null;$(".bar .nrm").hidden=false;$(".bar .rcd").hidden=true;
  const dur=(Date.now()-r.t0)/1000;
  r.mr.onstop=()=>{r.stop();if(send&&r.chunks.length){if(dur<1)toast("Pesan suara terlalu singkat.");else sendVoice(new Blob(r.chunks,{type:r.mime.split(";")[0]}),dur,r.to)}};
  try{r.mr.state!=="inactive"?r.mr.stop():r.onstop?.()}catch{r.stop()}
}
async function sendVoice(blob,dur,to){
  if(blob.size>20*1048576)return toast("Pesan suara terlalu besar.");
  const ext=blob.type.includes("mp4")?"m4a":blob.type.includes("ogg")?"ogg":"webm";
  const path=`${me.id}/${to}/${crypto.randomUUID()}-suara.${ext}`;
  toast("Mengirim pesan suara…");
  const u=await sb.storage.from("files").upload(path,blob,{contentType:blob.type});
  if(u.error)return toast("Gagal unggah: "+u.error.message);
  const {error}=await sb.from("messages").insert({sender:me.id,recipient:to,body:"🎤 "+mmss(dur),file_path:path,file_name:"Pesan suara."+ext,file_type:blob.type});
  if(error)return toast(error.message);refresh();
}
/* Satu pemutar global: tetap berbunyi walau daftar pesan digambar ulang */
let VP=null;
const vel=id=>document.querySelector(`.vm[data-id="${CSS.escape(id)}"]`);
function wave(id,n=34){let h=0;for(const c of id)h=(h*33+c.charCodeAt(0))>>>0;return Array.from({length:n},(_,i)=>{h=(h*1103515245+12345)>>>0;return 5+((h>>>8)%22)})}
function vpUI(id){
  const el=vel(id);if(!el)return;const a=VP?.id===id?VP.a:null,d=+el.dataset.d||(a&&isFinite(a.duration)?a.duration:0);
  const f=a&&d?Math.min(1,a.currentTime/d):0,bars=el.querySelectorAll(".wv i");
  bars.forEach((b,i)=>b.classList.toggle("on",i<Math.round(f*bars.length)));
  el.querySelector(".pp").innerHTML=ic(a&&!a.paused?"pause":"play",26);
  el.querySelector(".vt").textContent=mmss(a&&!a.paused||(a&&a.currentTime>0)?a.currentTime:d);
}
function vpStop(){if(VP){VP.a.pause();const id=VP.id;VP=null;vpUI(id)}}
function vpPlay(id,url){
  if(VP&&VP.id===id){VP.a.paused?VP.a.play():VP.a.pause();return vpUI(id)}
  const old=VP?.id;if(VP)VP.a.pause();
  const a=new Audio(url);VP={id,a};if(old)vpUI(old);
  a.ontimeupdate=()=>vpUI(id);a.onpause=()=>vpUI(id);a.onplay=()=>vpUI(id);
  a.onended=()=>{a.currentTime=0;VP=null;vpUI(id)};
  a.onerror=()=>{toast("Pesan suara tidak bisa diputar di browser ini.");VP=null;vpUI(id)};
  a.play().catch(e=>toast("Gagal memutar: "+e.message));
}
function vpSeek(e,id){
  const w=e.currentTarget,r=w.getBoundingClientRect(),f=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
  if(VP?.id===id){const d=+vel(id).dataset.d||VP.a.duration;if(d&&isFinite(d))VP.a.currentTime=f*d;vpUI(id)}
}
function voiceHtml(el,u){
  const id=el.dataset.id,d=+el.dataset.d||0;
  el.className="vm";el.dataset.u=u;
  el.innerHTML=`<button class="pp" onclick="vpPlay('${esc(id)}',this.parentNode.dataset.u)" aria-label="Putar">${ic("play",26)}</button><div class="wv" onclick="vpSeek(event,'${esc(id)}')">${wave(id).map(h=>`<i style="height:${h}px"></i>`).join("")}</div><span class="vt">${mmss(d)}</span><span class="mk">${ic("mic",18)}</span>`;
  vpUI(id);
}
async function block(){
  if(!confirm("Blokir "+nm(peer)+"? Kalian tidak bisa saling mengirim pesan."))return;
  await sb.from("blocks").insert({blocker:me.id,blocked:peer});
  const fr=F.find(x=>other(x)===peer);if(fr)await sb.from("friendships").delete().eq("id",fr.id);
  toast("Pengguna diblokir.");back();
}
async function report(){
  const r=prompt("Alasan melaporkan "+nm(peer)+"?");if(!r||r.trim().length<3)return;
  const {error}=await sb.from("reports").insert({reporter:me.id,reported:peer,reason:r.trim()});toast(error?error.message:"Laporan terkirim.");
}
