// 아이패드(사파리 엔진 WebKit) 점검: node t08-ipad.js [safari|chrome|chrome-m|private|kakao]   (SSV_URL 없으면 실제 주소)
// 아이패드 크롬도 속은 WebKit(애플 규칙) → 같은 엔진에 크롬 UA 로 시험
// 사파리와 같은 WebKit 으로 아이패드 화면·터치를 흉내 낸다. 실제 아이패드 기기 시험을 대신하지는 못함
const path = require('path'), fs = require('fs');
const { webkit } = require('C:/Users/ultramsw67/Desktop/homepage/node_modules/playwright-core');
const URL = process.env.SSV_URL || 'https://ultramsw67.github.io/score-viewer/';
const PDF = ['a', 'b2', 'b3', 'c'].map(n => path.resolve(__dirname, 'pdf', n + '.pdf'));
// 아이패드 사파리는 기본이 「데스크톱 사이트」 → 맥 UA 를 보낸다
const MODE = process.argv[2] || 'safari';
const UAS = {
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Safari/604.1',  // 크롬 기본(데스크톱 사이트)
  'chrome-m': 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1',  // 크롬 모바일 사이트
};
UAS.private = UAS.safari;
UAS.kakao = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.8.2';  // 카카오톡 안 화면
const UA = UAS[MODE];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const bad = [], L = m => console.log(m), chk = (c, m) => c ? L('✓ ' + m) : (bad.push(m), L('✗ ' + m));
  // 일반 창 = 저장 폴더 있는 프로필 (프로필 없이 띄우면 사파리 개인정보 보호 모드처럼 PDF 저장이 막힘)
  const prof = require('os').tmpdir() + '/wk-ssv-' + Date.now();
  const opt = { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: false, userAgent: UA };
  let ctx, br0;
  if (MODE === 'private') { br0 = await webkit.launch(); ctx = await br0.newContext(opt); } else ctx = await webkit.launchPersistentContext(prof, opt);
  await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 }));  // 실제 아이패드 = 5
  const br = { version: () => 'WebKit · ' + MODE, close: () => (br0 || ctx).close() };
  if (MODE === 'kakao') await ctx.addInitScript(() => { window.__ssvNav = []; });  // 실제로 넘기지 않고 넘길 주소만 모음
  const pg = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('EXC ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('ERR ' + m.text()); });
  const ev = (s) => pg.evaluate(s);
  const until = async (s, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(s)) return true; await sleep(200); } return false; };
  const shot = f => pg.screenshot({ path: path.join(__dirname, MODE + '-' + f) });

  await pg.goto(URL, { waitUntil: 'load' }); await sleep(1500);
  if (MODE === 'kakao') {
    const nav = await ev(`window.__ssvNav`);
    chk(nav.length === 1 && nav[0].startsWith('kakaotalk://web/openExternal?url=') && decodeURIComponent(nav[0].split('url=')[1]).startsWith(URL), '카카오톡 → 사파리로 바로 넘김 (' + (nav[0] || '없음').slice(0, 60) + ')');
    chk(await ev(`!!document.querySelector('#inappGate') && document.querySelector('#inappGate h2').textContent.includes('사파리')`), '안 넘어가면 「사파리에서 열어 주세요」 안내 화면');
    await shot('k0-gate.png');
    await pg.tap('#inappGo'); await sleep(300);
    chk((await ev(`window.__ssvNav.length`)) === 2, '「사파리로 열기」 단추 = 다시 넘김');
    await pg.tap('#inappSkip'); await sleep(300);
    chk(await ev(`!document.querySelector('#inappGate') && !document.querySelector('#libEmpty').hidden`), '「그냥 여기서 둘러보기」 → 앱 화면');
    await pg.reload({ waitUntil: 'load' }); await sleep(800);
    chk((await ev(`window.__ssvNav.length`)) === 0 && !(await ev(`!!document.querySelector('#inappGate')`)), '1분 안에 다시 열면 되풀이 안 함·둘러보기 기억');
    L(bad.length ? '실패 ' + bad.length + ': ' + bad.join(', ') : '모두 통과'); await br.close(); return;
  }
  chk(await ev(`!document.querySelector('#inappGate') && !window.SSV_INAPP`), '사파리·크롬에선 안내 화면 안 뜸');
  L('버전 ' + await ev(`SSV.VERSION`) + ' · 엔진 ' + br.version());
  chk(await ev(`!document.querySelector('#libEmpty').hidden`), '첫 화면 열림');
  const feat = await ev(`({ idb: !!window.indexedDB, persist: !!navigator.storage?.persist, wake: !!navigator.wakeLock, full: !!document.documentElement.requestFullscreen,
    rec: ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(x=>window.MediaRecorder?.isTypeSupported?.(x))||'없음', audio: !!(window.AudioContext||window.webkitAudioContext),
    coarse: matchMedia('(pointer: coarse)').matches, fine: matchMedia('(any-pointer: fine)').matches, touchPts: navigator.maxTouchPoints, addDir: !document.querySelector('#btnAddDir').hidden })`);
  L('기능: ' + JSON.stringify(feat));
  chk(!feat.addDir, '아이패드에선 「폴더째 넣기」 단추 숨김');
  await shot('i0-empty.png');
  if (MODE === 'private') {
    await pg.setInputFiles('#fileIn', [PDF[0]]);
    chk(await until(`document.querySelector('#toast').textContent.includes('시크릿')`, 30000), '시크릿 창: 「일반 창에서 열어 주세요」 안내');
    L('안내: ' + await ev(`document.querySelector('#toast').textContent`));
    L(bad.length ? '실패 ' + bad.length + ': ' + bad.join(', ') : '모두 통과'); await br.close(); return;
  }

  // 넣기
  await pg.setInputFiles('#fileIn', PDF);
  chk(await until(`!document.querySelector('#prog').classList.contains('on') && document.querySelectorAll('#grid .card').length===4`, 60000), '악보 4곡 넣기');
  chk(await until(`[...document.querySelectorAll('#grid .card img')].every(i=>i.complete && i.naturalWidth>0)`, 10000), '미리보기 그림');
  await sleep(500); await shot('i1-lib.png');

  // 열기 (손가락 탭)
  const idC = await ev(`SSV.db.all('scores').then(a=>a.find(s=>s.fileName==='c.pdf').id)`);
  await pg.tap(`#grid .card[data-id="${idC}"] .th`);
  chk(await until(`document.querySelectorAll('#stage .pg').length>=1 && SSV.V.n>1`), '탭으로 악보 열림');
  await sleep(1200);
  const ink = `(()=>{const cv=document.querySelector('#stage canvas.pdf'); if(!cv) return -1; const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let k=0; for(let i=0;i<d.length;i+=4*97) if(d[i]<200) k++; return k})()`;
  chk(await ev(ink) > 20, '쪽이 실제로 그려짐');
  chk(await ev(`document.querySelectorAll('#stage .pg').length`) === 2, '가로 = 두 쪽');
  await shot('i2-two.png');

  // 탭으로 넘기기 (오른쪽 끝 / 왼쪽 끝)
  await pg.touchscreen.tap(1120, 410); await sleep(800);
  chk(await ev(`SSV.V.page`) === 3, '오른쪽 탭 → 다음 (1→3)');
  await pg.touchscreen.tap(60, 410); await sleep(800);
  chk(await ev(`SSV.V.page`) === 1, '왼쪽 탭 → 앞으로');
  // 가운데 탭 → 막대 보이기/숨기기
  const bars0 = await ev(`document.querySelector('#viewer').className`);
  await pg.touchscreen.tap(590, 410); await sleep(600);
  chk(await ev(`document.querySelector('#viewer').className`) !== bars0, '가운데 탭 → 막대 바뀜');
  await pg.touchscreen.tap(590, 410); await sleep(600);

  // 세로
  await pg.setViewportSize({ width: 820, height: 1180 }); await sleep(1200);
  chk(await ev(`document.querySelectorAll('#stage .pg').length`) === 1, '세로 = 한 쪽');
  chk(await ev(ink) > 20, '세로에서도 그려짐');
  await shot('i3-portrait.png');
  await pg.setViewportSize({ width: 1180, height: 820 }); await sleep(1000);

  // 필기 (WebKit 포인터로 한 획)
  await ev(`SSV.OPT.pen='any'`);
  await ev(`document.querySelector('#vInk').click()`); await sleep(500);
  const r = await ev(`JSON.parse(JSON.stringify(document.querySelector('#stage .pg canvas.ink').getBoundingClientRect()))`);
  await pg.mouse.move(r.x + r.width * .3, r.y + r.height * .3); await pg.mouse.down();
  for (let i = 1; i <= 12; i++) await pg.mouse.move(r.x + r.width * (.3 + i * .02), r.y + r.height * (.3 + i * .01));
  await pg.mouse.up(); await sleep(800);
  chk(await ev(`(SSV.V.ink[1]||[]).length===1`), '필기 한 획 저장');
  await shot('i4-ink.png');
  await ev(`document.querySelector('#vInk').click()`); await sleep(400);

  // 다시 열기 → 남아 있나
  await pg.reload({ waitUntil: 'load' }); await sleep(2000);
  chk(await ev(`document.querySelectorAll('#grid .card').length===4`), '다시 열어도 악보 4곡 남음');
  chk(await ev(`SSV.db.all('ink').then(a=>a.some(x=>x.id==='${idC}'))`), '다시 열어도 필기 남음');
  const est = await ev(`navigator.storage.estimate().then(e=>Math.round(e.usage/1024)+'KB 사용 / '+Math.round(e.quota/1048576)+'MB 한도')`);
  L('저장 공간: ' + est + ' · 영구 저장 ' + await ev(`navigator.storage.persisted?.()`));

  // 설정 화면·메트로놈 화면이 깨지지 않나 (모양만)
  await shot('i5-reload.png');
  L('오류: ' + (errs.length ? errs.join(' | ') : '없음'));
  chk(!errs.some(e => e.startsWith('EXC')), '프로그램 오류 없음');
  L(bad.length ? '실패 ' + bad.length + ': ' + bad.join(', ') : '모두 통과');
  await br.close();
})().catch(e => { console.error('중단:', e.message); process.exit(1); });
