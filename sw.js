/* Service worker Orbit: menampilkan notifikasi (juga saat aplikasi tertutup lewat Web Push) dan menangani klik. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type: "window", includeUncontrolled: true}).then(list => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    })
  );
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { try { d = {body: e.data.text()}; } catch {} }
  e.waitUntil((async () => {
    /* Bila aplikasi sedang terbuka dan terlihat, aplikasi sendiri yang menampilkan notifikasinya.
       Notifikasi uji selalu ditampilkan. */
    if (d.tag !== "test") {
      const list = await self.clients.matchAll({type: "window", includeUncontrolled: true});
      if (list.some(c => c.visibilityState === "visible" && c.focused)) return;
    }
    await self.registration.showNotification(d.title || "Orbit", {
      body: d.body || "Pesan baru",
      tag: d.tag || "orbit",
      renotify: true,
      requireInteraction: !!d.call,
      vibrate: d.call ? [400, 200, 400, 200, 400] : [120],
      icon: "icon-192.png",
      badge: "icon-192.png"
    });
  })());
});

/* Bila langganan push dicabut/berganti oleh browser, daftarkan ulang saat aplikasi dibuka berikutnya */
self.addEventListener("pushsubscriptionchange", e => {
  e.waitUntil(self.clients.matchAll({includeUncontrolled: true}).then(l => l.forEach(c => c.postMessage({t: "resub"}))));
});
