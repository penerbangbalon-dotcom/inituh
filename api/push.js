/* Orbit: pengirim Web Push (Vercel Serverless Function).
   Dipanggil oleh trigger database Supabase (lihat perbaikan-push.sql) setiap ada pesan baru,
   undangan panggilan, atau undangan pertemanan. Variabel lingkungan yang dibutuhkan (Vercel > Settings > Environment Variables):
   VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (mis. mailto:emailanda@gmail.com), SUPABASE_URL, SUPABASE_SERVICE_KEY, PUSH_SECRET */
const webpush = require("web-push");

const E = process.env;
const K = E.SUPABASE_SERVICE_KEY || "";
/* Kunci lama (service_role) berbentuk JWT "eyJ..." dan dikirim juga sebagai Authorization; kunci baru "sb_secret_..." cukup lewat apikey */
const H = {apikey: K, "Content-Type": "application/json", ...(K.startsWith("eyJ") ? {Authorization: "Bearer " + K} : {})};
let ready = false;

async function rest(path, opt = {}) {
  const r = await fetch(E.SUPABASE_URL + "/rest/v1/" + path, {...opt, headers: {...H, ...(opt.headers || {})}});
  if (!r.ok) throw new Error("Supabase " + r.status + " " + (await r.text()).slice(0, 200));
  return r.status === 204 ? null : r.json();
}
async function nameOf(id) {
  try { const [p] = await rest("profiles?select=display_name&id=eq." + id); return p?.display_name || "Seseorang"; }
  catch { return "Seseorang"; }
}

/* Susun isi notifikasi dari baris yang baru masuk; null = tidak perlu notifikasi */
async function build(table, op, r) {
  if (table === "messages" && op === "INSERT") {
    if (/^📞 Panggilan (suara|video) ·/.test(r.body || "")) return null;
    const name = await nameOf(r.sender);
    return {to: r.recipient, p: {title: name, body: r.file_path ? "📎 " + (r.file_name || "File") : (r.body || "Pesan baru"), tag: "msg-" + r.sender}, ttl: 86400};
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

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).end();
    if (!E.PUSH_SECRET || req.headers["x-push-secret"] !== E.PUSH_SECRET) return res.status(401).end();
    if (!ready) { webpush.setVapidDetails(E.VAPID_SUBJECT || "mailto:admin@example.com", E.VAPID_PUBLIC, E.VAPID_PRIVATE); ready = true; }
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const job = await build(b.table, b.op, b.record || {});
    if (!job) return res.status(200).json({skipped: true});
    const subs = await rest("push_subs?select=id,endpoint,p256dh,auth&user_id=eq." + job.to);
    let sent = 0;
    await Promise.all(subs.map(async s => {
      try {
        await webpush.sendNotification({endpoint: s.endpoint, keys: {p256dh: s.p256dh, auth: s.auth}}, JSON.stringify(job.p), {TTL: job.ttl, urgency: job.p.call ? "high" : "normal"});
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await rest("push_subs?id=eq." + s.id, {method: "DELETE"}).catch(() => {});
        else console.warn("push gagal", e.statusCode, e.body);
      }
    }));
    res.status(200).json({sent});
  } catch (e) {
    console.error(e);
    res.status(500).json({error: String(e.message || e)});
  }
};
