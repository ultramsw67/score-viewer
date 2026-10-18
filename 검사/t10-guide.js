// v1.5.0~ 수드 도우미 점검: node cdp.js t10-guide.js  (로컬 서버 8781, 또는 SSV_URL=실주소 — https 면 인터넷 끊고 도우미 파일 열림까지)
// 단추 표시·44px·창 열림·화면별 키·악보 화면 말풍선 없음·Esc/스페이스 충돌 없음·소리 기능 켜면 멈춤·설정 숨기기·가로 넘침 없음·녹음 파일 없을 때 오류 없음
const path = require('path'), fs = require('fs');
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
const PDF = ['a', 'c'].map(n => path.resolve(__dirname, 'pdf', n + '.pdf'));
module.exports = async (c) => {
  const L = m => console.log(m); const bad = [], chk = (cond, m) => { if (cond) L('✓ ' + m); else { bad.push(m); L('✗ ' + m); } };
  const ev = c.ev, sleep = c.sleep;
  const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return true; await sleep(150); } return false; };
  const setFiles = async (sel, files) => {
    const doc = await c.send('DOM.getDocument'); const n = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
    await c.send('DOM.setFileInputFiles', { nodeId: n.result.nodeId, files });
  };
  const fabBox = `(()=>{const f=document.querySelector('.sg-fab'); if(!f) return null; const r=f.getBoundingClientRect(), cs=getComputedStyle(f); return {w:r.width,h:r.height,l:r.left,b:innerHeight-r.bottom,vis:cs.visibility!=='hidden'&&cs.display!=='none'}})()`;
  const noOverflow = `document.documentElement.scrollWidth <= innerWidth + 1`;
  const key = async k => { const m = { Escape: ['Escape', 27], ' ': [' ', 32], m: ['m', 77] }[k];
    await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: m[0], code: k === ' ' ? 'Space' : k === 'm' ? 'KeyM' : 'Escape', windowsVirtualKeyCode: m[1], text: k.length === 1 ? k : undefined });
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: m[0], windowsVirtualKeyCode: m[1] }); await sleep(250); };
  await c.send('DOM.enable');

  // 1. 목록 화면
  await c.size(1280, 800, false);
  await c.go(URL); await until(`document.readyState==='complete'`, 20000);
  await ev(`new Promise(r=>{const q=indexedDB.deleteDatabase('sood-score'); q.onsuccess=q.onerror=q.onblocked=()=>r(1)})`);
  await ev(`localStorage.clear()`);
  await c.go(URL + '?sgidle=2&t=' + Date.now());
  await until(`!!window.SSV`, 20000);  // 다른 검사와 겹쳐 느릴 때 앱이 다 열릴 때까지
  chk(await ev(`SSV.VERSION.localeCompare('v1.5.1',undefined,{numeric:true})>=0`), '버전 v1.5.1 이상');
  chk(await ev(`!!window.SoodGuide && SoodGuide.version >= '1.1.0' && Object.keys(window.SOOD_HELPS).length >= 8`), '도우미 모듈·도움말 파일 읽힘 (' + await ev(`window.SoodGuide && SoodGuide.version`) + ')');
  let fb = await ev(fabBox);
  chk(fb && fb.vis && fb.w >= 44 && fb.h >= 44 && fb.l < 40 && fb.b < 40, '목록 화면 왼쪽 아래 음표 단추 (' + JSON.stringify(fb) + ')');
  chk(await ev(`SSV.sgCtx()`) === 'lib', '빈 목록 화면 키 = lib');
  chk(await ev(`!!document.querySelector('#libEmpty [data-sg=lib]')`), '빈 목록 안내에 「수드에게 쓰는 법 듣기」');
  // 말풍선 (시험용 2초)
  chk(await until(`!!document.querySelector('.sg-peek')`, 12000), '가만히 있으면 목록 화면에 「도움이 필요하세요?」 말풍선');
  chk(await ev(`document.querySelector('.sg-peek')?.textContent.includes('악보 넣는 법')`), '말풍선 문구 = 목록 화면용');
  await c.shot('g1-lib-peek.png', false);
  // 단추 누르기 → 창
  await ev(`document.querySelector('.sg-fab').click()`); await sleep(500);
  chk(await ev(`document.querySelector('.sg-wrap .sg-title')?.textContent.startsWith('악보 목록 쓰는 법') && document.querySelectorAll('.sg-wrap .sg-line').length===SOOD_HELPS.lib.lines.length`), '단추 누르면 「악보 목록 쓰는 법」 창');
  await sleep(1200);
  chk(await ev(`(()=>{const p=document.querySelector('.sg-panel'), r=p.getBoundingClientRect(); return getComputedStyle(p).opacity==='1' && r.top>=0 && r.left>=0 && r.bottom<=innerHeight+1 && r.right<=innerWidth+1})()`), '목록 화면 도우미 창 불투명도 1·화면 안에 있음');
  chk(await ev(`[...document.querySelectorAll('.sg-btns button')].every(b=>b.getBoundingClientRect().height>=44)`), '도우미 창 단추 44px 이상');
  await sleep(1500);
  chk(await ev(`!!document.querySelector('.sg-line.sg-on') || !window.speechSynthesis`), '읽기 진행 (노란 줄 — 녹음 파일, 없으면 기계 목소리)');
  await c.shot('g2-lib-panel.png', false);
  await key('Escape');
  chk(await ev(`!document.querySelector('.sg-wrap')`), 'Esc = 도우미 창 닫기');

  const vmiss = await ev(`(async()=>{const miss=[]; for(const h of Object.values(SOOD_HELPS)) for(const t of h.lines){ const r=await fetch('sood-voice/'+SoodGuide.voiceName(t)+'.mp3',{method:'HEAD',cache:'no-store'}); if(!r.ok) miss.push(t);} return miss})()`);
  chk(!vmiss.length, '도움말 문장마다 목소리 mp3 있음 (이름 = SoodGuide.voiceName(문장))' + (vmiss.length ? ' 없음: ' + vmiss.join(' / ') : ''));
  // 말풍선을 실제로 누르기 (마우스·손가락) → 창 열림 (모듈 1.1.0 고침 확인: 누르는 순간 말풍선을 먼저 지우던 것)
  const peekXY = `(()=>{const r=document.querySelector('.sg-peek').getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}})()`;
  await ev(`document.querySelector('#tabSets').click()`);
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });  // 사람 손이 닿은 것처럼 → 가만히 시간 다시 셈
  chk(await until(`!!document.querySelector('.sg-peek')`, 12000), '연주 목록 화면 말풍선');
  let pt = await ev(peekXY);
  for (const type of ['mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await sleep(500);
  chk(await ev(`document.querySelector('.sg-wrap .sg-title')?.textContent.startsWith('연주 목록 쓰는 법')`), '말풍선을 마우스로 누르면 도우미 창이 열림');
  await key('Escape');
  await ev(`document.querySelector('#tabLib').click()`); await ev(`document.querySelector('#btnSel').click()`);
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });  // 사람 손이 닿은 것처럼 → 가만히 시간 다시 셈
  chk(await until(`!!document.querySelector('.sg-peek')`, 12000), '고르기 화면 말풍선');
  pt = await ev(peekXY);
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pt.x, y: pt.y }] });
  await sleep(60);
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(600);
  chk(await ev(`document.querySelector('.sg-wrap .sg-title')?.textContent.startsWith('폴더로 정리하기')`), '말풍선을 손가락으로 누르면 도우미 창이 열림');
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await key('Escape'); await ev(`document.querySelector('#selEnd').click()`);
  // 2. 악보 넣기 → 화면별 키
  await setFiles('#fileIn', PDF);
  chk(await until(`!document.querySelector('#prog').classList.contains('on') && document.querySelectorAll('#grid .card').length===2`, 40000), '악보 2곡 넣기');
  await ev(`document.querySelector('#tabSets').click()`); await sleep(300);
  chk(await ev(`SSV.sgCtx()`) === 'sets', '연주 목록 탭 키 = sets');
  await ev(`document.querySelector('#tabLib').click()`); await sleep(200);
  await ev(`document.querySelector('#btnSel').click()`); await sleep(200);
  chk(await ev(`SSV.sgCtx()`) === 'folder', '고르기 중 키 = folder');
  fb = await ev(fabBox); const sel = await ev(`(()=>{const r=document.querySelector('#selbar').getBoundingClientRect();return {t:r.top}})()`);
  chk(800 - fb.b - fb.h + fb.h <= sel.t + 2 || 800 - fb.b - fb.h >= sel.t, '고르기 막대와 단추 겹치지 않음');
  await ev(`document.querySelector('#selEnd').click()`); await sleep(200);
  // 설정 창의 듣기 단추 → 설정 닫고 도우미
  await ev(`document.querySelector('#btnSettings').click()`); await sleep(400);
  chk(await ev(`SSV.sgCtx()`) === 'settings', '설정 창 키 = settings');
  await ev(`document.querySelector('#dSettings [data-sg=settings]').click()`); await sleep(400);
  chk(await ev(`!document.querySelector('#dSettings').open && document.querySelector('.sg-wrap .sg-title')?.textContent.startsWith('설정과 백업')`), '설정 「설정 도움말 듣기」 → 설정 닫고 도우미 창');
  await ev(`document.querySelector('.sg-close').click()`); await sleep(200);

  // 3. 악보 화면
  await ev(`window.__sgStops=0; const o=SoodGuide.stop; SoodGuide.stop=function(){window.__sgStops++; return o.apply(this,arguments)}`);
  await ev(`document.querySelector('#grid .card .th').click()`);
  chk(await until(`document.querySelectorAll('#stage .pg').length>=1 && SSV.V.n>=1 && document.body.classList.contains('ssv-v')`), '악보 열림');
  await sleep(300);
  chk(await ev(`SSV.sgCtx()`) === 'viewer', '악보 화면 키 = viewer');
  await ev(`(()=>{const v=document.querySelector('#viewer'); v.classList.remove('hidebars')})()`); await sleep(200);
  fb = await ev(fabBox);
  chk(fb && fb.vis && fb.w === 44 && fb.h === 44, '악보 화면: 막대가 보일 때 작은 단추 44px (' + JSON.stringify(fb) + ')');
  chk(await ev(`(()=>{const f=document.querySelector('.sg-fab').getBoundingClientRect(); return [...document.querySelectorAll('#navbar button,#navbar input,#navbar .pn')].every(e=>{const r=e.getBoundingClientRect(); return r.right<=f.left||r.left>=f.right||r.bottom<=f.top||r.top>=f.bottom})})()`), '단추가 아래 막대 단추·쪽 막대와 겹치지 않음');
  chk(await ev(`(()=>{const f=document.querySelector('.sg-fab').getBoundingClientRect(), s=document.querySelector('#navbar').getBoundingClientRect(); return f.top>=s.top-1})()`), '단추가 아래 막대 안(악보 위가 아님)');
  await c.shot('g3-viewer-bars.png', false);
  await ev(`document.querySelector('#viewer').classList.add('hidebars')`); await sleep(200);
  chk(!(await ev(fabBox)).vis, '막대가 숨으면(연주 중) 단추도 숨음');
  await sleep(3500);
  chk(await ev(`!document.querySelector('.sg-peek')`), '악보 화면에서는 말풍선이 저절로 안 나옴');
  // ⋯ 더 보기 → 도움말
  await ev(`document.querySelector('#vMore').click()`); await sleep(200);
  await ev(`document.querySelector('#mnHelp').click()`); await sleep(500);
  chk(await ev(`document.querySelector('.sg-wrap .sg-title')?.textContent.startsWith('악보 넘기는 법')`), '⋯ 더 보기 「이 화면 도움말 듣기」 → 악보 넘기는 법');
  await sleep(1200);
  chk(await ev(`!!document.querySelector('.sg-line.sg-on') || !window.speechSynthesis`), '악보 화면에서도 읽어 줌 (바쁨 아님)');
  chk(await ev(`(()=>{const p=document.querySelector('.sg-panel'), r=p.getBoundingClientRect(); return getComputedStyle(p).opacity==='1' && r.top>=0 && r.left>=0 && r.bottom<=innerHeight+1 && r.right<=innerWidth+1})()`), '도우미 창 불투명도 1·화면 안에 있음');
  await c.shot('g4-viewer-panel.png', false);
  const pg0 = await ev(`SSV.V.page`);
  await key(' ');
  chk(await ev(`SSV.V.page`) === pg0, '도우미 창이 떠 있을 때 스페이스로 쪽이 안 넘어감');
  if (!(await ev(`!!document.querySelector('.sg-wrap')`))) { await ev(`SoodGuide.open('viewer', true)`); await sleep(300); }  // 스페이스가 포커스된 「닫기」를 눌렀으면 다시 열기
  await key('Escape');
  chk(await ev(`!document.querySelector('.sg-wrap') && document.querySelector('#viewer').classList.contains('on')`), 'Esc = 도우미만 닫히고 악보는 그대로');
  // 메트로놈 켜면 도우미 멈춤
  const s0 = await ev(`window.__sgStops`);
  await key('m'); await sleep(300);
  chk(await ev(`SSV.MET.on`) && await ev(`window.__sgStops`) > s0, '메트로놈 켜면 도우미 목소리 멈춤');
  await ev(`SoodGuide.open('met')`); await sleep(700);
  chk(await ev(`!document.querySelector('.sg-line.sg-on')`), '메트로놈 소리 중에는 도우미가 읽지 않음 (글만)');
  await ev(`document.querySelector('.sg-close').click()`);
  await key('m');
  await ev(`document.querySelector('#vMet').click()`); await sleep(300);
  chk(await ev(`SSV.sgCtx()`) === 'met', '메트로놈 창 키 = met');
  await ev(`SSV.panel('tun')`); await sleep(400);
  chk(await ev(`SSV.sgCtx()`) === 'tun', '튜너 창 키 = tun');
  await ev(`SSV.panel('crop')`); await sleep(200);
  chk(await ev(`SSV.sgCtx()`) === 'more', '여백 자르기 창 키 = more');
  await ev(`SSV.panel(null)`);
  await ev(`document.querySelector('#vInk').click()`); await sleep(400);
  chk(await ev(`SSV.sgCtx()`) === 'ink', '필기 중 키 = ink');
  chk(!(await ev(fabBox)).vis, '필기 중엔 단추 숨김 (필기 막대와 안 겹침)');
  await ev(`document.querySelector('#vMore').click()`); await sleep(200); await ev(`document.querySelector('#mnHelp').click()`); await sleep(600);
  chk(await ev(`document.querySelector('.sg-wrap .sg-title')?.textContent.startsWith('악보에 필기하기')`), '필기 중 ⋯ → 「악보에 필기하기」');
  await c.shot('g5-ink-panel.png', false);
  await ev(`document.querySelector('.sg-close').click()`); await ev(`document.querySelector('#iDone').click()`); await sleep(200);
  // 밤 모드 모양
  await ev(`document.querySelector('#vNight').click()`); await ev(`document.querySelector('#viewer').classList.remove('hidebars')`); await sleep(300);
  await c.shot('g6-night.png', false);
  await ev(`document.querySelector('#vNight').click()`);
  await key('Escape'); await sleep(300); await key('Escape'); await sleep(500);
  chk(await ev(`!document.querySelector('#viewer').classList.contains('on') && !document.body.classList.contains('ssv-v')`), '악보 닫으면 큰 단추로 돌아옴');

  // 4. 설정 「숨기기」
  await ev(`document.querySelector('#btnSettings').click()`); await sleep(300);
  await ev(`(()=>{const s=document.querySelector('#optGuide'); s.value='0'; s.dispatchEvent(new Event('change'))})()`);
  await ev(`document.querySelector('#dSettings').close()`);
  chk(!(await ev(fabBox)).vis && await ev(`SSV.OPT.guide===false`), '설정 「수드 도우미 숨기기」 → 단추 사라짐');
  await c.go(URL + '?sgidle=1&h=' + Date.now()); await sleep(3000);
  chk(!(await ev(fabBox)).vis && await ev(`!document.querySelector('.sg-peek')`), '숨기면 새로 열어도 단추·말풍선 없음');
  await ev(`(()=>{SSV.OPT.guide=true; localStorage.setItem('ssv.opt', JSON.stringify(SSV.OPT))})()`);

  // 5. 폰 크기 — 넘침 없음
  await c.size(390, 800, true); await c.go(URL + '?p=' + Date.now()); await sleep(800);
  chk(await ev(noOverflow), '폰 목록 가로 넘침 없음');
  await ev(`document.querySelector('.sg-fab').click()`); await sleep(500);
  chk(await ev(noOverflow) && await ev(`document.querySelector('.sg-panel').getBoundingClientRect().right <= innerWidth`), '폰 도우미 창 가로 넘침 없음');
  await c.shot('g7-phone-panel.png', false);
  await ev(`document.querySelector('.sg-close').click()`);
  await ev(`document.querySelector('#grid .card .th').click()`); await until(`document.querySelectorAll('#stage .pg').length>=1`); await sleep(300);
  await ev(`document.querySelector('#viewer').classList.remove('hidebars')`); await sleep(200);
  chk(await ev(`(()=>{const f=document.querySelector('.sg-fab').getBoundingClientRect(); return [...document.querySelectorAll('#navbar button,#navbar input,#navbar .pn')].every(e=>{const r=e.getBoundingClientRect(); return r.right<=f.left||r.left>=f.right||r.bottom<=f.top||r.top>=f.bottom})})()`), '폰 악보 화면: 단추가 아래 막대 단추와 안 겹침');
  chk(await ev(noOverflow), '폰 악보 화면 가로 넘침 없음');
  await c.shot('g8-phone-viewer.png', false);
  await c.size(1280, 800, false);

  // 6. 실주소(https): 인터넷 끊고도 도우미 파일
  if (URL.startsWith('https')) {
    await c.go(URL + '?o=' + Date.now()); await sleep(4000);
    chk(await ev(`caches.keys().then(async ks=>{const k=ks.find(x=>x==='ssv-'+SSV.VERSION); if(!k) return false; const c=await caches.open(k); return !!(await c.match('sood-guide.js')) && !!(await c.match('sood-guide-helps.js'))})`), '서비스워커가 도우미 파일을 담아 둠 (ssv-버전)');
    await c.send('Network.enable');
    await c.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await c.go(URL); await sleep(2500);
    chk(await ev(`!!window.SoodGuide && !!window.SOOD_HELPS && !!document.querySelector('.sg-fab')`), '인터넷 끊고 열어도 도우미 단추');
    await ev(`document.querySelector('.sg-fab').click()`); await sleep(1500);
    chk(await ev(`!!document.querySelector('.sg-wrap')`), '인터넷 끊고도 도우미 창 열림');
    await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  }
  const exc = c.logs.filter(x => x.startsWith('EXC'));
  chk(!exc.length, '페이지 오류 없음' + (exc.length ? ' ' + exc.join(' | ') : ''));
  L('bad ' + JSON.stringify(bad));
};
