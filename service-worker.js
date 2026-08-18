// Service worker: cache แค่ "เปลือกแอป" (HTML/ไอคอน/ฟอนต์) ให้เปิดได้ทันทีและออฟไลน์ได้
// ไม่ยุ่งกับข้อมูลรายจ่าย ซึ่ง Firestore จัดการ offline persistence ของตัวเองอยู่แล้ว

const CACHE_NAME = 'expense-tracker-shell-v1';

const SHELL_FILES = [
  './expense-tracker.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // เฉพาะ GET เท่านั้น ปล่อย request อื่น (เช่น Firestore) ผ่านไปตามปกติ
  if (req.method !== 'GET') return;

  // อย่าไปยุ่งกับ Firestore/Firebase network calls เลย ให้ SDK จัดการ offline เอง
  if (req.url.includes('firestore.googleapis.com') || req.url.includes('firebaseio.com')) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      // cache-first ให้เปิดไว, อัปเดต cache เงียบๆ เบื้องหลัง (stale-while-revalidate)
      return cached || network;
    })
  );
});
