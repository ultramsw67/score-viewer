// 수드 악보 보기 — 인터넷 없이도 열리게 앱 파일을 기기에 담아 둔다
// 앱을 고치면 VER 를 올린다 (index.html 의 VERSION 과 같게)
const VER = 'ssv-v1.5.2';
const CORE = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/sood-192.jpg',
  'vendor/pdf.min.mjs', 'vendor/pdf.worker.min.mjs', 'LICENSES.txt',
  'sood-guide.js', 'sood-guide-helps.js'];  // v1.5.0 수드 도우미 (목소리 sood-voice/*.mp3 는 들은 것만 아래 fetch 에서 담음)
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
    if (r.status === 200) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)).catch(() => { }); }  // 206(부분 응답)은 담지 않음
    return r;
  })));
});
