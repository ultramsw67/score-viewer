// 수드 악보 보기 — 인터넷 없이도 열리게 앱 파일을 기기에 담아 둔다
// 앱을 고치면 VER 를 올린다 (index.html 의 VERSION 과 같게)
const VER = 'ssv-v1.2.6';
const CORE = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/sood-192.jpg',
  'vendor/pdf.min.mjs', 'vendor/pdf.worker.min.mjs', 'LICENSES.txt'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // 화면(index)은 인터넷이 되면 새것, 안 되면 담아 둔 것
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VER).then(c => c.put('index.html', cp)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // 나머지(pdf.js·글꼴 표)는 담아 둔 것 먼저, 없으면 받아서 담기
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); }
    return r;
  })));
});
