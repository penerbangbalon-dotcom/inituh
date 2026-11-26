/* Service worker Inituh: menampilkan notifikasi di Android/Chrome dan menangani klik. */
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

/* Disiapkan untuk Web Push (saat aplikasi tertutup) bila nanti server push ditambahkan. */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(d.title || "Inituh", {body: d.body || "Pesan baru", tag: d.tag || "inituh"}));
});
