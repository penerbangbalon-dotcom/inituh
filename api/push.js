/* Orbit: pengirim Web Push (Vercel Serverless Function).
   Dipanggil oleh trigger database Supabase (lihat perbaikan-push.sql) setiap ada pesan baru,
   undangan panggilan, atau undangan pertemanan.
   Variabel lingkungan (Vercel > Settings > Environment Variables):
   VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT, SUPABASE_URL, SUPABASE_SERVICE_KEY, PUSH_SECRET

   Selain itu:
   - GET  /api/push                 -> cek konfigurasi (hanya true/false, tanpa rahasia)
   - POST /api/push {test:true}     -> dengan header Authorization: Bearer <token login>, kirim notifikasi uji
                                       ke semua perangkat milik pengguna itu dan laporkan hasil per perangkat. */
const webpush = require("web-push");
const crypto = require("crypto");

const E = process.env;
const K = E.SUPABASE_SERVICE_KEY || "";
/* Kunci lama (service_role) berbentuk JWT "eyJ..." dan dikirim juga sebagai Authorization; kunci baru "sb_secret_..." cukup lewat apikey */
const H = {apikey: K, "Content-Type": "application/json", ...(K.startsWith("eyJ") ? {Authorization: "Bearer " + K} : {})};

/* Subjek VAPID harus "mailto:alamat@email" atau "https://situs". Salah ketik yang umum diperbaiki otomatis,
   mis. "mailtokita@gmail.com" atau "kita@gmail.com" -> "mailto:kita@gmail.com". */
function fixSubject(s) {
  s = String(s || "").trim();
  if (/^https:\/\//i.test(s)) return s;
  s = s.replace(/^mailto:?/i, "");
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "mailto:" + s;
  return "https://orbit-obrolan.vercel.app";
}
function pubFromPriv() {
  try {
    const d = crypto.createECDH("prime256v1");
    d.setPrivateKey(Buffer.from((E.VAPID_PRIVATE || "").replace(/-/g, "+").replace(/_/g, "/"), "base64"));
    return d.getPublicKey("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch { return ""; }
}
let ready = "";
function init() {
  if (ready) return;
  webpush.setVapidDetails(fixSubject(E.VAPID_SUBJECT), E.VAPID_PUBLIC, E.VAPID_PRIVATE);
  ready = "ok";
}

async function rest(path, opt = {}) {
  const r = await fetch(E.SUPABASE_URL + "/rest/v1/" + path, {...opt, headers: {...H, ...(opt.headers || {})}});
  if (!r.ok) throw new Error("Supabase " + r.status + " " + (await r.text()).slice(0, 200));
  return r.status === 204 ? null : r.json();
}
async function nameOf(id) {
  try { const [p] = await rest("profiles?select=display_name&id=eq." + id); return p?.display_name || "Seseorang"; }
  catch { return "Seseorang"; }
}
function fileLabel(r) {
  const t = r.file_type || "";
  if (t.startsWith("audio/")) return "🎤 Pesan suara";
  if (t.startsWith("image/")) return "📷 Foto";
  if (t.startsWith("video/")) return "🎥 Video";
  return "📄 " + (r.file_name || "File");
}

/* Susun isi notifikasi dari baris yang baru masuk; null = tidak perlu notifikasi */
async function build(table, op, r) {
  if (table === "messages" && op === "INSERT") {
    if (/^📞 Panggilan (suara|video) ·/.test(r.body || "")) return null;
    const name = await nameOf(r.sender);
    return {to: r.recipient, p: {title: name, body: r.file_path ? fileLabel(r) : (r.body || "Pesan baru"), tag: "msg-" + r.sender}, ttl: 86400};
  }
  if (table === "call_signals" && op === "INSERT" && r.kind === "invite") {
    if (Date.now() - new Date(r.created_at).getTime() > 40000) return null;
    const d = r.data || {}, name = await nameOf(r.from_user), grup = Array.isArray(d.members) && d.members.length > 2;
    return {to: r.to_user, p: {title: grup ? "👥 Panggilan grup masuk" : d.video ? "🎥 Panggilan video masuk" : "📞 Panggilan masuk", body: name, tag: "call-" + r.cid, call: true}, ttl: 30};
  }
  if (table === "friendships") {
    if (op === "INSERT" && r.status === "pending") return {to: r.addressee, p: {title: "Undangan pertemanan", body: (await nameOf(r.requester)) + " ingin berteman denganmu", tag: "fr-" + r.requester}, ttl: 86400};
    if (op === "UPDATE" && r.status === "accepted") return {to: r.requester, p: {title: "Undangan diterima", body: (await nameOf(r.addressee)) + " menerima permintaan pertemananmu", tag: "fr-" + r.addressee}, ttl: 86400};
  }
  return null;
}

/* Kirim ke semua perangkat milik satu pengguna; urgensi "high" agar tidak ditunda mode hemat daya (Doze) Android */
async function deliver(job) {
  const subs = await rest("push_subs?select=id,endpoint,p256dh,auth&user_id=eq." + job.to);
  const res = [];
  await Promise.all(subs.map(async s => {
    const host = (() => { try { return new URL(s.endpoint).host; } catch { return "?"; } })();
    try {
      await webpush.sendNotification({endpoint: s.endpoint, keys: {p256dh: s.p256dh, auth: s.auth}}, JSON.stringify(job.p), {TTL: job.ttl, urgency: "high"});
      res.push({host, ok: true});
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await rest("push_subs?id=eq." + s.id, {method: "DELETE"}).catch(() => {});
      console.warn("push gagal", e.statusCode, String(e.body || e.message).slice(0, 200));
      res.push({host, ok: false, status: e.statusCode, error: String(e.body || e.message).slice(0, 160)});
    }
  }));
  return {devices: subs.length, sent: res.filter(x => x.ok).length, results: res};
}

module.exports = async (req, res) => {
  try {
    /* Cek konfigurasi tanpa membuka rahasia */
    if (req.method === "GET") {
      const c = {
        VAPID_PUBLIC: !!E.VAPID_PUBLIC, VAPID_PRIVATE: !!E.VAPID_PRIVATE, VAPID_SUBJECT: !!E.VAPID_SUBJECT,
        subject_dipakai: fixSubject(E.VAPID_SUBJECT).replace(/(?<=mailto:.).*(?=@)/, "***"),
        subject_valid_asli: /^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|https:\/\/\S+)$/.test(String(E.VAPID_SUBJECT || "").trim()),
        pasangan_kunci_cocok: !!E.VAPID_PRIVATE && pubFromPriv() === (E.VAPID_PUBLIC || "").trim(),
        SUPABASE_URL: !!E.SUPABASE_URL, SUPABASE_SERVICE_KEY: !!K, PUSH_SECRET: !!E.PUSH_SECRET
      };
      try { const s = await rest("push_subs?select=id&limit=1000"); c.jumlah_perangkat_terdaftar = s.length; c.supabase_terhubung = true; }
      catch (e) { c.supabase_terhubung = false; c.supabase_error = String(e.message).slice(0, 120); }
      return res.status(200).json(c);
    }
    if (req.method !== "POST") return res.status(405).end();
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    /* Notifikasi uji dari tombol di Pengaturan (butuh login pengguna) */
    if (b.test) {
      const tok = (req.headers.authorization || "").replace(/^Bearer /i, "");
      const u = await fetch(E.SUPABASE_URL + "/auth/v1/user", {headers: {apikey: K, Authorization: "Bearer " + tok}});
      if (!u.ok) return res.status(401).json({error: "Token login tidak valid"});
      const {id} = await u.json();
      init();
      const out = await deliver({to: id, p: {title: "Orbit", body: "Notifikasi uji berhasil 🎉", tag: "test"}, ttl: 60});
      return res.status(200).json(out);
    }

    if (!E.PUSH_SECRET || req.headers["x-push-secret"] !== E.PUSH_SECRET) return res.status(401).end();
    init();
    const job = await build(b.table, b.op, b.record || {});
    if (!job) return res.status(200).json({skipped: true});
    const out = await deliver(job);
    res.status(200).json({sent: out.sent, devices: out.devices});
  } catch (e) {
    console.error(e);
    res.status(500).json({error: String(e.message || e)});
  }
};
