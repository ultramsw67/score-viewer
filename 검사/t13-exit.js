// v1.6.7 「종료」 단추 점검: node cdp.js t13-exit.js [android|pc]  (로컬 서버 8781)
// android = 안드로이드 홈 화면 앱 흉내 (UA + navigator.standalone) → 종료 단추 보임, 악보를 열어도 기록(history) 안 늘어남, 뒤로 가기는 CloseWatcher
// pc = 보통 브라우저 → 종료 단추 숨김, 예전처럼 pushState
const path = require('path');
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
const PDF = ['a', 'c'].map(n => path.resolve(__dirname, 'pdf', n + '.pdf'));
const MODE = process.argv[3] || 'android';
module.exports = async (c) => {
  const L = m => console.log(m); const bad = [], chk = (cond, m) => cond ? L('✓ ' + m) : (bad.push(m), L('✗ ' + m));
  const ev = c.ev, sleep = c.sleep;
  const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch (e) { } await sleep(150); } return false; };
  const setFiles = async (sel, files) => {
    const doc = await c.send('DOM.getDocument'); const n = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
    await c.send('DOM.setFileInputFiles', { nodeId: n.result.nodeId, files });
  };
  const click = async sel => { const r = await ev(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`); for (const type of ['mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 }); };
  const vis = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().width>0})()`);
  await c.send('DOM.enable');
  if (MODE === 'android') {
    await c.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(navigator,'standalone',{get:()=>true})" });
  }
  await c.size(1280, 800, MODE === 'android');
  await c.go(URL + 'LICENSES.txt');
  await ev(`new Promise(r=>{const q=indexedDB.deleteDatabase('sood-score'); q.onsuccess=q.onerror=q.onblocked=()=>r(1)})`);
  await ev(`localStorage.removeItem('ssv.opt')`);
  await c.go(URL + '?v=' + Date.now());
  chk(await ev(`SSV.VERSION.localeCompare('v1.6.7',undefined,{numeric:true})>=0`), '버전 v1.6.7 이상');
  await ev(`(()=>{const o=JSON.parse(localStorage.getItem('ssv.opt')||'{}'); o.tourV=1; o.tour16=1; localStorage.setItem('ssv.opt',JSON.stringify(o)); Object.assign(SSV.OPT,o);})()`);
  await setFiles('#fileIn', PDF);
  chk(await until(`!document.querySelector('#prog').classList.contains('on') && document.querySelectorAll('#grid .card').length===2`, 40000), '2곡 넣기');
  if (MODE !== 'android') {
    chk(!(await vis('#btnExit')), '보통 브라우저: 악보함 「종료」 숨김');
    const h0 = await ev('history.length');
    const sid = await ev(`SSV.db.all('scores').then(a=>a[0].id)`);
    await ev(`SSV.openViewer(['${sid}'],0)`);
    await until(`document.querySelector('#viewer').classList.contains('on')`, 5000);
    chk(!(await vis('#vExit')), '보통 브라우저: 악보 화면 「종료」 숨김');
    chk(await ev('history.length') === h0 + 1, '보통 브라우저: 악보 열면 기록 하나 늘어남 (예전 그대로 — 뒤로 가기 = 악보함)');
    await ev('history.back()'); chk(await until(`!document.querySelector('#viewer').classList.contains('on')`, 4000), '뒤로 가기 → 악보함');
    L(bad.length ? 'bad ' + JSON.stringify(bad) : 'bad []'); return;
  }
  chk(await vis('#btnExit'), '악보함 맨 위 「종료」 보임');
  L('  기기 확인: ' + await ev(`document.querySelector('#btnSettings').click(), new Promise(r=>setTimeout(()=>{const t=document.querySelector('#verInfo').textContent; document.querySelector('#dSettings').close(); r(t)},400))`));
  const h0 = await ev('history.length');
  const sid = await ev(`SSV.db.all('scores').then(a=>a.find(s=>s.fileName==='c.pdf').id)`);
  await ev(`SSV.openViewer(['${sid}'],0)`);
  chk(await until(`document.querySelector('#viewer').classList.contains('on') && SSV.V.n>0`, 8000), '악보 열림');
  chk(await vis('#vExit'), '악보 화면 맨 위 줄에 「종료」 보임');
  chk(await ev('history.length') === h0, '악보를 열어도 기록이 안 늘어남 (window.close() 가 막히지 않게)');
  // 뒤로 가기 = CloseWatcher (헤드리스에서는 Esc 가 같은 「닫기 요청」)
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  chk(await until(`!document.querySelector('#viewer').classList.contains('on')`, 4000), '뒤로 가기(닫기 요청) → 악보함');
  chk(await ev('history.length') === h0, '닫은 뒤에도 기록 그대로');
  // 두 번째로 열어 3쪽까지 보고 「종료」 — 시험 창은 기록이 2라 안 닫힘 → 안내 창 + 보던 쪽 저장
  await ev(`SSV.openViewer(['${sid}'],0)`);
  await until(`document.querySelector('#viewer').classList.contains('on') && SSV.V.n>0`, 8000);
  const last = await ev('SSV.V.n'); await ev(`SSV.go(${Math.min(2, await ev('SSV.V.n'))})`); await sleep(300);
  const pg = await ev('SSV.V.page');
  await click('#vExit');
  chk(await until(`document.querySelector('#dBye').open`, 3000), '닫히지 않으면 「악보 보기를 마쳤습니다」 안내 창');
  chk(await ev(`!document.querySelector('#viewer').classList.contains('on')`), '안내 창 뒤는 악보함 (악보 닫힘)');
  chk(await ev(`document.querySelector('#byeDiag').textContent.includes('CloseWatcher')`), '안내 창에 기기 확인 줄');
  chk(await ev(`SSV.db.get('scores','${sid}').then(s=>s.lastPage)`) === pg, '보던 쪽(' + pg + '/' + last + ') 저장');
  await c.shot('t13-bye.png', false);
  await ev(`document.querySelector('#dBye').close()`);
  // 악보함에서 「종료」도 같은 안내
  await click('#btnExit');
  chk(await until(`document.querySelector('#dBye').open`, 3000), '악보함 「종료」 → 같은 안내 창');
  await ev(`document.querySelector('#dBye').close()`);
  await ev(`SSV.openViewer(['${sid}'],0)`); await until(`document.querySelector('#viewer').classList.contains('on') && SSV.V.n>0`, 8000); await sleep(500);
  await c.shot('t13-viewer.png', false);
  await ev(`SSV.closeViewer()`);
  await c.shot('t13-lib.png', false);
  L(bad.length ? 'bad ' + JSON.stringify(bad) : 'bad []');
};
