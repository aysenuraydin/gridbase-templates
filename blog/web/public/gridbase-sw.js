// GridBase Web Push service worker. Sitenin köküne kopyala (ör. public/gridbase-sw.js).
// Kendi service worker'ın varsa bu iki dinleyiciyi ona ekle ve subscribeWeb'e registration ver.
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(message.title || '', {
      body: message.body || '',
      data: message.data || {},
    }),
  );
});

// data.url verilmişse o adres, yoksa site açılır. Açık sekme varsa ona geçilir.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((client) => client.url === target);
      if (open) return open.focus();
      return self.clients.openWindow(target);
    }),
  );
});
