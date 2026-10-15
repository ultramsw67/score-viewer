// v1.3.1~ 점검: node cdp.js t06-v131.js — 터치패드·휠로 넘기기(관성에 여러 쪽 안 건너뜀), 두 손가락 옆으로 밀기 '뒤로' 막기,
// 노트북 자동 전체 화면 안 함, 첫 쪽 단추, Esc = 목록으로 (반쪽 넘기기는 v1.4.0 에서 뺌)
const path = require('path'), fs = require('fs');
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
const PDF = ['c'].map(n => path.resolve(__dirname, 'pdf', n + '.pdf'));
module.exports = async (c) => {
  const L = m => console.log(m); const bad = [], chk = (cond, m) => cond ? L('✓ ' + m) : (bad.push(m), L('✗ ' + m));
  const ev = c.ev, sleep = c.sleep;
  const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch (e) { } await sleep(150); } return false; };
  const wheel = (dx, dy, x = 683, y = 420) => c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: dx, deltaY: dy });
  const key = async (k, code, kc) => { await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: kc }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: kc }); await sleep(500); };
  const pg = () => ev(`''+SSV.V.page`);
  await c.send('DOM.enable'); await c.size(1366, 768, false);
  await c.go(URL + 'LICENSES.txt');
  await ev(`new Promise(r=>{const q=indexedDB.deleteDatabase('sood-score'); q.onsuccess=q.onerror=q.onblocked=()=>r(1)})`); await ev(`localStorage.clear()`);
  await c.go(URL + '?v=' + Date.now());
  chk(await ev(`SSV.VERSION.localeCompare('v1.3.0',undefined,{numeric:true})>=0`), '버전 v1.3.0 이상');
  // v1.3.2: 예전 「켜기」(full '1') 가 있던 기기도 「패드에서만」으로 한 번 바뀜, 노트북(마우스)에선 열 때 전체 화면 안 함
  await ev(`localStorage.setItem('ssv.opt', JSON.stringify({full:'1'}))`); await c.go(URL + '?v=' + Date.now());
  chk(await ev(`SSV.OPT.full==='touch' && SSV.OPT.fullV2===1 && document.querySelector('#optFull option').value==='touch'`), '전체 화면 설정 = 패드·폰에서만 (예전 켜기도 바뀜)');
  await ev(`localStorage.clear()`); await c.go(URL + '?v=' + Date.now());
  chk(await ev(`getComputedStyle(document.documentElement).overscrollBehaviorX==='none' && getComputedStyle(document.body).overscrollBehaviorX==='none'`), '두 손가락 옆으로 밀기 = 뒤로 가기 막음 (overscroll-behavior-x)');
  const doc = await c.send('DOM.getDocument'); const n = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#fileIn' });
  await c.send('DOM.setFileInputFiles', { nodeId: n.result.nodeId, files: PDF });
  await until(`document.querySelectorAll('#grid .card').length===1`, 40000); await sleep(400);
  const h0 = await ev('history.length');
  await ev(`document.querySelector('#grid .card .th').click()`); await until(`document.querySelectorAll('#stage .pg').length>=1 && SSV.V.n>1`); await sleep(500);
  chk(await ev(`!document.fullscreenElement`), '노트북에선 악보 열 때 전체 화면 안 함 (브라우저 X 안 뜸)');
  // 휠: 쪽 맞춤·두 쪽(가로 화면)에서 한 번 = 두 쪽 넘김
  await wheel(0, 120); await sleep(500);
  chk(await ev('SSV.V.page') === 3, '휠 한 번 → 다음 두 쪽 (3쪽)');
  await sleep(300); await wheel(0, -120); await sleep(500);
  chk(await ev('SSV.V.page') === 1, '휠 거꾸로 → 앞 (1쪽)');
  // 한 쪽 보기로 바꾸고 한 단계씩
  await ev(`document.querySelector('#vTwo').click()`); await sleep(500); await ev('SSV.go(1)'); await sleep(400);
  await wheel(0, 120); await sleep(500); chk(await pg() === '2', '한 쪽 보기에서 휠 → 2쪽');
  // 터치패드: 잘게 30번(관성) → 한 단계만
  await sleep(300); for (let i = 0; i < 30; i++) { await wheel(0, 12); await sleep(15); } await sleep(600);
  chk(await pg() === '3', '터치패드 한 번 밀기(잘게 30번) → 한 단계만 (3쪽)');
  // 두 손가락 옆으로 밀기 → 넘기기, 앱에 그대로 있음
  await sleep(300); for (let i = 0; i < 20; i++) { await wheel(15, 1); await sleep(15); } await sleep(600);
  chk(await pg() === '4', '두 손가락 왼쪽으로 밀기 → 다음 (4쪽)');
  await sleep(300); for (let i = 0; i < 20; i++) { await wheel(-15, 1); await sleep(15); } await sleep(600);
  chk(await pg() === '3', '두 손가락 오른쪽으로 밀기 → 앞 쪽 (3쪽), 뒤로 가지 않음');
  chk(await ev(`document.querySelector('#viewer').classList.contains('on') && location.href.startsWith(${JSON.stringify(URL)})`), '밀어도 악보 화면·앱 주소 그대로');
  // 첫 쪽 단추
  await ev(`document.querySelector('#vFirst').click()`); await sleep(500);
  chk(await pg() === '1', '첫 쪽 단추 → 1쪽');
  await ev('SSV.go(4)'); await sleep(300); await key('Home', 'Home', 36); chk(await pg() === '1', 'Home 키 → 1쪽');
  // 폭 맞춤에선 휠 = 원래 스크롤
  await ev(`document.querySelector('#vFit').click()`); await sleep(600);
  await sleep(300); await wheel(0, 200); await sleep(500);
  chk(await ev('SSV.V.page') === 1, '폭 맞춤에선 휠 = 원래 스크롤 (쪽 안 넘김)');
  await ev(`document.querySelector('#vFit').click()`); await sleep(500);
  chk(await ev(`!document.querySelector('#vHalf') && !document.querySelector('#vAuto')`), '반쪽 넘기기·자동 스크롤 단추 없음');
  await c.shot('v13-firstbtn.png', false);
  // Esc → 목록, 기록 한 칸만 되돌림
  await key('Escape', 'Escape', 27);
  chk(await ev(`!document.querySelector('#viewer').classList.contains('on') && history.length===${h0 + 1} && !(history.state&&history.state.viewer)`), 'Esc → 목록 화면 (앱 안)');
  L('bad ' + JSON.stringify(bad));
};
