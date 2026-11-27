const sb=supabase.createClient("https://epdehfeoagahrnzbymne.supabase.co","sb_publishable_V8f61745CGGWgBifpjLCMA_8E7wDQKb");
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let me,prof,view="chat",peer=null,F=[],P={},M=[],found=null,ch,signup=false,U={};
const toast=t=>{const e=$("#toast");e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,3500)};
addEventListener("error",e=>toast("Error: "+e.message));addEventListener("unhandledrejection",e=>toast("Error: "+(e.reason?.message||e.reason)));
const show=a=>{$("#auth").hidden=!a;$("#app").hidden=a};
const nm=id=>P[id]?.display_name||"Pengguna";
const av=(id,c="")=>{const u=P[id]?.avatar_url;return `<div class="av ${c}"${u?` style="background-image:url('${esc(u)}')"`:""}>${u?"":esc((nm(id)[0]||"?").toUpperCase())}</div>`};
const hm=t=>new Date(t).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
const link=s=>esc(s).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
const prev=x=>x?(x.file_path?"📎 "+x.file_name:x.body):"Mulai obrolan";

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
function draw(side=true){
  $("#me").innerHTML=av(me.id,"sm");document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.v===view));const n=inc().length;$("#nb").hidden=!n;$("#nb").textContent=n;
  if(side){
    const q=$("#q")?.value||"";
    const kq=$("#kq")?.value||"";
    $("#main").innerHTML=view==="chat"?vChat():view==="kontak"?vKontak():view==="teman"?vTeman():vProf();
    if(view==="teman"&&$("#q"))$("#q").value=q;
    if(view==="kontak"&&$("#kq")){$("#kq").value=kq;kfilter()}
    if(view==="prof"&&prof.code)new QRCode($("#qr"),{text:prof.code,width:150,height:150});
  }
  if(peer)fillMsgs();
  badge();
}
function vChat(){
  const l=friends().map(id=>({id,last:M.find(x=>x.sender===id||x.recipient===id),un:M.filter(x=>x.sender===id&&x.recipient===me.id&&!x.read_at).length})).sort((a,b)=>(b.last?.created_at||"").localeCompare(a.last?.created_at||""));
  if(!l.length)return `<div class="card mu">Belum ada teman. Ketuk ➕ lalu masukkan kode atau username temanmu.</div>`;
  return l.map(({id,last,un})=>`<div class="it ${peer===id?"on":""}" onclick="open1('${id}')">${av(id)}<div class="sp"><div class="row"><b class="sp ell">${esc(nm(id))}</b><span class="mu">${last?hm(last.created_at):""}</span></div><div class="row"><span class="mu sp ell">${esc(prev(last))}</span>${un?`<span class="bd">${un}</span>`:""}</div></div></div>`).join("");
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
  <button class="d" style="width:100%" onclick="sb.auth.signOut()">Keluar</button>`;
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
  const t=el.dataset.t,n=esc(el.dataset.n);u=esc(u);
  el.innerHTML=t.startsWith("image/")?`<a href="${u}" target="_blank"><img src="${u}"></a>`:t.startsWith("video/")?`<video src="${u}" controls preload="metadata"></video>`:`<a href="${u}" target="_blank" download="${n}">📄 ${n}</a>`;
}
function hyd(){document.querySelectorAll("[data-p]").forEach(async el=>{const p=el.dataset.p;if(!U[p]){const {data}=await sb.storage.from("files").createSignedUrl(p,3600);if(!data)return;U[p]=data.signedUrl}media(el,U[p])})}

/* ----- Obrolan ----- */
function open1(id){peer=id;$("#app").classList.add("op");$("#ph").hidden=true;$("#cv").hidden=false;$("#ct").textContent=nm(id);$("#ca").innerHTML=av(id,"sm");$("#msgs").dataset.s="";refresh()}
function back(){peer=null;$("#app").classList.remove("op");$("#ph").hidden=false;$("#cv").hidden=true;refresh()}
function fillMsgs(){
  const box=$("#msgs"),near=box.scrollHeight-box.scrollTop-box.clientHeight<150;
  box.innerHTML=M.filter(x=>x.sender===peer||x.recipient===peer).reverse().map(x=>{
    const mine=x.sender===me.id;
    const c=x.file_path?`<div data-p="${esc(x.file_path)}" data-t="${esc(x.file_type||"")}" data-n="${esc(x.file_name||"file")}">⏳ ${esc(x.file_name||"")}</div>`:link(x.body);
    return `<div class="b ${mine?"me":""}">${c}<small>${hm(x.created_at)}${mine?(x.read_at?" ✓✓":" ✓"):""}</small></div>`;
  }).join("")||`<div class="ph" style="margin:20px auto">Belum ada pesan. Sapa dulu!</div>`;
  if(near||!box.dataset.s){box.scrollTop=box.scrollHeight;box.dataset.s=1}
  hyd();
}
async function send(){
  const i=$("#mi"),body=i.value.trim();if(!body)return;i.value="";
  const {error}=await sb.from("messages").insert({sender:me.id,recipient:peer,body});
  if(error){i.value=body;return toast("Gagal mengirim: "+error.message)}refresh();
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
