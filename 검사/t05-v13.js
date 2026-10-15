// v1.3.0 (Piascore 처럼) 점검: FAKE_WAV=<검사/pdf/a440.wav 절대 경로> node cdp.js t05-v13.js
// 새 디자인·펜 7가지·굵기·도장·글자·점프 단추·여백 자르기(필기 제자리)·반쪽 넘기기·자동 스크롤·쪽 순서/반복·열린 곡 탭·인쇄·튜너(440Hz)·녹음·백업·DB v1→v2
const path = require('path'), fs = require('fs');
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
const PDF = ['a', 'b2', 'b3', 'c'].map(n => path.resolve(__dirname, 'pdf', n + '.pdf'));
module.exports = async (c) => {
  const L = m => { fs.appendFileSync(path.join(__dirname, 'trace.txt'), m + String.fromCharCode(10)); console.log(m); }; const bad = [], ok = m => L('✓ ' + m), chk = (cond, m) => cond ? ok(m) : (bad.push(m), L('✗ ' + m));
  const ev = c.ev, sleep = c.sleep;
  const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return true; await sleep(150); } return false; };
  const setFiles = async (sel, files) => {
    const doc = await c.send('DOM.getDocument'); const n = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
    await c.send('DOM.setFileInputFiles', { nodeId: n.result.nodeId, files });
  };
  const mx = (t, x, y) => c.send('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', buttons: t === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  const click = async (x, y) => { await mx('mousePressed', x, y); await mx('mouseReleased', x, y); };
  const rect = sel => ev(`JSON.stringify(document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect())`).then(JSON.parse);
  const inkPx = `(()=>{let k=0;document.querySelectorAll('#stage .pg canvas.ink').forEach(cv=>{const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;for(let i=3;i<d.length;i+=4*7)if(d[i]>0)k++});return k})()`;
  await c.send('DOM.enable');

  // 0. 예전(v1) 저장소에서 올라와도 열림 + 녹음 저장소 생김
  await c.size(1366, 820, false);
  await c.go(URL + 'LICENSES.txt');  // 앱이 저장소를 열지 않은 같은 주소의 쪽에서 지우고 v1 을 만든다
  await ev(`new Promise(r=>{const q=indexedDB.deleteDatabase('sood-score'); q.onsuccess=q.onerror=q.onblocked=()=>r(1)})`);
  await ev(`new Promise(r=>{const q=indexedDB.open('sood-score',1); q.onupgradeneeded=()=>{const d=q.result; d.createObjectStore('scores',{keyPath:'id'}); d.createObjectStore('files',{keyPath:'id'}); d.createObjectStore('ink',{keyPath:'key'}); d.createObjectStore('sets',{keyPath:'id'});}; q.onsuccess=()=>{q.result.close(); r(1)}; q.onerror=()=>r(0)})`);
  await ev(`localStorage.clear()`);
  await c.go(URL + '?v=' + Date.now());
  chk(await ev(`SSV.VERSION==='v1.3.0'`), '버전 v1.3.0');
  chk(await ev(`SSV.db.all('takes').then(a=>Array.isArray(a))`), 'v1 저장소 → v2 로 올라가 녹음 저장소 생김');
  chk(await ev(`getComputedStyle(document.querySelector('#btnAdd')).backgroundColor==='rgb(20, 112, 224)'`), '첫 화면 단추 = Piascore 파랑');
  await setFiles('#fileIn', PDF);
  chk(await until(`!document.querySelector('#prog').classList.contains('on') && document.querySelectorAll('#grid .card').length===4`, 40000), '4곡 넣기');
  await sleep(400); await c.shot('v1-lib.png', false);
  const id = await ev(`SSV.db.all('scores').then(a=>a.find(s=>s.fileName==='c.pdf').id)`);
  const idA = await ev(`SSV.db.all('scores').then(a=>a.find(s=>s.fileName==='a.pdf').id)`);
  await ev(`document.querySelector('#grid .card[data-id="${id}"] .th').click()`);
  await until(`document.querySelectorAll('#stage .pg').length>=1 && SSV.V.n>1`); await sleep(500);
  chk(await ev(`getComputedStyle(document.querySelector('#topbar')).backgroundColor.startsWith('rgba(250, 251, 253')`), '보기 화면 위 막대 = 밝은 유리');
  chk(await ev(`document.querySelectorAll('#topbar>button svg').length>=10 && document.querySelector('#vFit span').textContent==='쪽 맞춤'`), '위 막대 = 선 아이콘 + 글자');
  await ev(`SSV.panel && document.querySelector('#viewer').classList.remove('hidebars')`);
  await c.shot('v2-viewer.png', false);
  await ev(`document.querySelector('#vNight').click()`); await sleep(300);
  chk(await ev(`getComputedStyle(document.querySelector('#topbar')).backgroundColor.startsWith('rgba(22, 24, 30')`), '밤 모드 = 어두운 막대');
  await c.shot('v3-night.png', false);
  await ev(`document.querySelector('#vNight').click()`); await sleep(200);

  // 1. 열린 곡 탭
  chk(await ev(`document.querySelectorAll('#vTabs .tb').length===1 && document.querySelector('#vTabs .tb.on')`), '탭 1개 (지금 곡)');
  await ev(`document.querySelector('#vTabs [data-add]').click()`); await sleep(300);
  chk(await ev(`document.querySelector('#dPick').open && document.querySelectorAll('#pkList button').length===4`), '+ 누르면 곡 고르기');
  await ev(`document.querySelector('#pkList button[data-id="${idA}"]').click()`);
  await until(`SSV.V.score && SSV.V.score.id==='${idA}' && document.querySelectorAll('#stage .pg').length>=1`); await sleep(300);
  chk(await ev(`document.querySelectorAll('#vTabs .tb').length===2 && document.querySelector('#vTabs .tb.on').dataset.id==='${idA}'`), '두 번째 곡이 탭으로 열림');
  await ev(`document.querySelector('#vTabs .tb[data-id="${id}"] b').click()`);
  await until(`SSV.V.score.id==='${id}' && document.querySelectorAll('#stage .pg').length>=1`); await sleep(300);
  chk(await ev(`SSV.V.score.id==='${id}'`), '탭 눌러 앞 곡으로 돌아감');
  await ev(`SSV.next()`); await sleep(300);
  chk(await ev(`SSV.V.score.id==='${id}'`), '탭 곡은 마지막 쪽에서도 다음 곡으로 안 넘어감(연주 목록만)') ;
  await ev(`SSV.go(1)`); await sleep(300);

  // 2. 필기: 펜 7가지·굵기·도장·글자·점프
  await ev(`document.querySelector('#vTwo').click()`); await sleep(300);  // 한 쪽으로
  await ev(`document.querySelector('#vInk').click()`); await sleep(600);
  chk(await ev(`document.querySelectorAll('#iPens .pen').length===7 && document.querySelectorAll('#iWidth button').length===3`), '펜 7가지·굵기 3단계');
  let r = await rect('#stage .pg canvas.ink');
  await ev(`document.querySelector('#iPens .pen[data-c="#18a058"]').click(); document.querySelector('#iWidth [data-w="l"]').click()`);
  await mx('mousePressed', r.x + 80, r.y + 120); for (let k = 1; k <= 8; k++) await mx('mouseMoved', r.x + 80 + k * 15, r.y + 120); await mx('mouseReleased', r.x + 200, r.y + 120); await sleep(300);
  chk(await ev(`(()=>{const s=SSV.V.ink[1].at(-1); return s.c==='#18a058' && s.w===0.006})()`), '초록 굵은 펜으로 그림');
  await ev(`document.querySelector('#iPens .pen[data-c="hl:#ff7ac6"]').click()`);
  await mx('mousePressed', r.x + 80, r.y + 160); for (let k = 1; k <= 8; k++) await mx('mouseMoved', r.x + 80 + k * 15, r.y + 160); await mx('mouseReleased', r.x + 200, r.y + 160); await sleep(300);
  chk(await ev(`(()=>{const s=SSV.V.ink[1].at(-1); return s.c==='#ff7ac6' && s.a<1})()`), '형광 분홍');
  await ev(`document.querySelector('#iPens .pen[data-c="#d62828"]').click(); document.querySelector('#iStamp').click()`); await sleep(300);
  chk(await ev(`!document.querySelector('#stampPop').hidden && document.querySelectorAll('#spGroups button').length>=30`), '도장 창 (30가지 넘음)');
  chk(await ev(`(()=>{const cv=document.querySelector('#spGroups button[data-k="fermata"] canvas');const d=cv.getContext('2d').getImageData(0,0,84,84).data;let k=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)k++;return k>30})()`), '도장 그림이 그려짐 (늘임표)');
  await c.shot('v4-stamps.png', false);
  await ev(`document.querySelector('#spGroups button[data-k="mf"]').click()`); await sleep(200);
  await click(r.x + 300, r.y + 200); await sleep(300);
  await ev(`document.querySelector('#spGroups button[data-k="fermata"]').click()`); await sleep(100);
  await click(r.x + 360, r.y + 200); await sleep(300);
  chk(await ev(`SSV.V.ink[1].filter(s=>s.t==='s').map(s=>s.k).join()==='mf,fermata'`), '도장 mf·늘임표 찍힘');
  await ev(`document.querySelector('#iText').click()`); await sleep(100);
  await click(r.x + 300, r.y + 260); await sleep(300);
  chk(await ev(`document.querySelector('#dText').open`), '글자 넣기 창');
  await ev(`document.querySelector('#xQuick [data-t="여기서 숨"]').click(); document.querySelector('#xOk').click()`); await sleep(300);
  chk(await ev(`SSV.V.ink[1].some(s=>s.t==='x' && s.s==='여기서 숨')`), '글자 「여기서 숨」 들어감');
  await ev(`document.querySelector('#iJump').click()`); await sleep(100);
  await click(r.x + 300, r.y + 330); await sleep(300);
  chk(await ev(`document.querySelector('#dJump').open`), '점프 단추 창');
  await ev(`document.querySelector('#jLabels [data-t="D.C."]').click(); document.querySelector('#jTo').value='1'; document.querySelector('#jOk').click()`); await sleep(400);
  chk(await ev(`SSV.V.score.jumps?.length===1 && SSV.V.score.jumps[0].l==='D.C.' && document.querySelectorAll('#stage .jmp').length===1`), '점프 단추 「D.C. → 1쪽」 생김');
  chk(await ev(inkPx) > 200, '필기·도장·글자가 화면에 보임');
  await c.shot('v5-ink.png', false);
  // 지우개로 도장 지우기 → 되돌리기
  await ev(`document.querySelector('#iErase').click()`);
  await mx('mousePressed', r.x + 300, r.y + 200); await mx('mouseMoved', r.x + 302, r.y + 201); await mx('mouseReleased', r.x + 302, r.y + 201); await sleep(300);
  chk(await ev(`!SSV.V.ink[1].some(s=>s.k==='mf')`), '지우개로 도장 지움');
  await ev(`document.querySelector('#iUndo').click()`); await sleep(300);
  chk(await ev(`SSV.V.ink[1].some(s=>s.k==='mf')`), '되돌리기로 도장 되살아남');
  const inkN = await ev(`SSV.V.ink[1].length`);
  await ev(`document.querySelector('#iDone').click()`); await sleep(500);
  // 점프 단추 눌러 건너뛰기
  await ev(`SSV.go(2)`); await sleep(400);
  chk(await ev(`document.querySelectorAll('#stage .jmp').length===0`), '다른 쪽에는 점프 단추 없음');
  await ev(`SSV.go(1)`); await sleep(400);
  await ev(`SSV.V.page=1`); await ev(`SSV.go(1)`); await sleep(300);

  // 3. 여백 자르기: 화면이 커지고 필기는 제자리
  const p0 = await ev(`(()=>{const pg=document.querySelector('#stage .pg');return pg.offsetHeight})()`);
  await ev(`document.querySelector('#vMore').click()`); await sleep(200);
  chk(await ev(`!document.querySelector('#vMoreM').hidden`), '⋯ 더 보기 메뉴');
  await ev(`document.querySelector('#mnCrop').click()`); await sleep(300);
  chk(await ev(`!document.querySelector('#cropP').hidden`), '여백 자르기 창');
  await ev(`document.querySelector('#cAuto').click()`);
  await until(`SSV.V.crop.t>0 || SSV.V.crop.l>0`, 8000); await sleep(800);
  const cr = await ev(`JSON.stringify(SSV.V.crop)`);
  chk(await ev(`SSV.V.crop.t+SSV.V.crop.b+SSV.V.crop.l+SSV.V.crop.r>0.03 && SSV.db.get('scores','${id}').then(s=>!!s.crop)`), '자동으로 흰 여백 자름 ' + cr);
  await c.shot('v6-crop.png', false);
  // 수동: 위 10%
  await ev(`(()=>{const e=document.querySelector('#cT'); e.value='10'; e.dispatchEvent(new Event('input'))})()`); await sleep(700);
  chk(await ev(`Math.abs(SSV.V.crop.t-0.1)<1e-9 && document.querySelector('#cTo').textContent==='10%'`), '위 여백 10% 직접 맞춤');
  // 필기 좌표는 그대로(쪽 전체 기준)
  chk(await ev(`SSV.V.ink[1].length===${inkN}`), '자른 뒤에도 필기 수 그대로');
  await ev(`document.querySelector('#cReset').click()`); await sleep(600);
  chk(await ev(`SSV.V.crop.t===0 && SSV.db.get('scores','${id}').then(s=>!s.crop)`), '원래대로');
  await ev(`document.querySelector('#cAuto').click()`); await until(`SSV.V.crop.t>0 || SSV.V.crop.l>0`, 8000); await sleep(600);
  // 자른 상태에서 그린 획 → 자르기 풀어도 같은 자리(쪽 좌표)
  await ev(`document.querySelector('#cDone').click()`);
  await ev(`document.querySelector('#vInk').click()`); await sleep(600);
  r = await rect('#stage .pg canvas.ink');
  await ev(`document.querySelector('#iPens .pen[data-c="#1f5fd6"]').click()`);
  await mx('mousePressed', r.x + r.width / 2, r.y + r.height / 2); for (let k = 1; k <= 5; k++) await mx('mouseMoved', r.x + r.width / 2 + k * 10, r.y + r.height / 2); await mx('mouseReleased', r.x + r.width / 2 + 50, r.y + r.height / 2); await sleep(300);
  const pt = JSON.parse(await ev(`JSON.stringify(SSV.V.ink[1].at(-1).p.slice(0,2))`)), C = JSON.parse(await ev(`JSON.stringify(SSV.V.crop)`));
  const ex = C.l + 0.5 * (1 - C.l - C.r), ey = C.t + 0.5 * (1 - C.t - C.b);
  chk(Math.abs(pt[0] - ex) < 0.01 && Math.abs(pt[1] - ey) < 0.01, '자른 화면에서 그린 점 = 쪽 전체 좌표 (' + pt.map(x => x.toFixed(3)) + ' ≈ ' + [ex, ey].map(x => x.toFixed(3)) + ')');
  await ev(`document.querySelector('#iDone').click()`); await sleep(400);
  const p1 = await ev(`document.querySelector('#stage .pg').offsetHeight`);
  chk(p1 >= p0 - 2, '자르면 쪽이 같거나 더 크게 보임 (' + p0 + '→' + p1 + ')');
  await ev(`SSV.setCrop({l:0,t:0,r:0,b:0}, true)`); await sleep(300);

  // 4. 반쪽 넘기기
  await ev(`document.querySelector('#vHalf').click()`); await sleep(500);
  await ev(`SSV.go(1)`); await sleep(400);
  await ev(`SSV.next()`); await sleep(700);
  chk(await ev(`SSV.V.half && document.querySelector('#stage .halfw') && document.querySelector('.halfw .pg.top').dataset.idx==='2' && document.querySelector('.halfw .pg.bot').dataset.idx==='1' && document.querySelector('#vPage').textContent.startsWith('1½')`), '반쪽: 위 = 2쪽 위 절반, 아래 = 1쪽 아래 절반');
  await c.shot('v7-half.png', false);
  await ev(`SSV.next()`); await sleep(600);
  chk(await ev(`!SSV.V.half && SSV.V.page===2 && !document.querySelector('#stage .halfw')`), '한 번 더 넘기면 2쪽 전체');
  await ev(`SSV.next()`); await sleep(500); await ev(`SSV.prev()`); await sleep(500);
  chk(await ev(`!SSV.V.half && SSV.V.page===2`), '반쪽에서 앞으로 = 지금 쪽 전체');
  await ev(`document.querySelector('#vHalf').click()`); await sleep(400);

  // 5. 자동 스크롤
  await ev(`SSV.go(1)`); await sleep(300);
  await ev(`SSV.OPT.autoSpp=10; document.querySelector('#vAuto').click()`); await sleep(800);
  chk(await ev(`SSV.V.auto.on && !document.querySelector('#autoC').hidden && document.querySelectorAll('#stage .pg').length===2`), '자동 스크롤 켜짐 (쪽 둘 이어 붙임)');
  const s0 = await ev(`document.querySelector('#stage').scrollTop`); await sleep(1500);
  const s1 = await ev(`document.querySelector('#stage').scrollTop`);
  chk(s1 > s0 + 20, '저절로 내려감 (' + s0 + '→' + s1 + ')');
  chk(await until(`SSV.V.page===2`, 14000), '다음 쪽으로 이어서 넘어감');
  await c.shot('v8-auto.png', false);
  await ev(`document.querySelector('#aPlay').click()`); await sleep(400); const s2 = await ev(`document.querySelector('#stage').scrollTop`); await sleep(700);
  chk(await ev(`document.querySelector('#stage').scrollTop`) === s2, '멈춤');
  await ev(`document.querySelector('#aStop').click()`); await sleep(500);
  chk(await ev(`!SSV.V.auto.on && document.querySelector('#autoC').hidden && SSV.OPT.fit==='page'`), '자동 스크롤 끔 (쪽 맞춤으로 돌아옴)');

  // 6. 쪽 순서·반복
  const np = await ev(`SSV.V.doc.numPages`);
  await ev(`document.querySelector('#vMore').click()`); await ev(`document.querySelector('#mnPages').click()`); await sleep(1500);
  chk(await ev(`document.querySelector('#dPages').open && document.querySelectorAll('#pGrid .pcell').length===${np} && [...document.querySelectorAll('#pGrid img')].every(i=>i.src.startsWith('data:'))`), '쪽 순서 창 · 쪽 그림');
  await ev(`document.querySelector('#pGrid .pcell[data-i="0"] [data-a="d"]').click()`); await sleep(400);
  chk(await ev(`document.querySelectorAll('#pGrid .pcell').length===${np + 1} && document.querySelectorAll('#pGrid .pcell.dup').length===2`), '1쪽 복사 (반복)');
  await c.shot('v9-pages.png', false);
  await ev(`document.querySelector('#pSave').click()`); await sleep(600);
  chk(await ev(`SSV.V.n===${np + 1} && SSV.db.get('scores','${id}').then(s=>JSON.stringify(s.ord.slice(0,3))==='[1,1,2]')`), '저장: 1·1·2… 순서');
  await ev(`SSV.go(2)`); await sleep(400);
  chk(await ev(`document.querySelector('#stage .pg').dataset.page==='1' && document.querySelectorAll('#stage .jmp').length===1`), '2번째 = PDF 1쪽 (필기·점프 같이 보임)');
  await ev(`document.querySelector('#stage .jmp').click()`); await sleep(500);
  chk(await ev(`SSV.V.page===1 && document.querySelector('#toast').textContent.includes('되돌아가기')`), '점프 단추 누르면 1쪽으로 · 되돌아가기 안내');

  // 7. 인쇄 (실제 인쇄 창은 막고 만든 쪽 수만 확인)
  await ev(`window.print=()=>{window.__printed=document.querySelectorAll('#printArea img').length}`);
  await ev(`document.querySelector('#vMore').click()`); await ev(`document.querySelector('#mnPrint').click()`);
  chk(await until(`window.__printed>0`, 20000) && await ev(`window.__printed===${np + 1}`), '인쇄용 쪽 ' + (np + 1) + '장 (반복 포함, 필기 넣음)');

  // 8. 튜너 (가짜 마이크 = 440Hz)
  await ev(`document.querySelector('#vTun').click()`); await sleep(400);
  chk(await ev(`!document.querySelector('#tunP').hidden && document.querySelectorAll('#tTr button').length===4`), '튜너 창 · 악기 조 4가지');
  chk(await until(`/^A/.test(document.querySelector('#tNote b')?.textContent||'') && document.querySelector('#tNote sub')?.textContent==='4'`, 12000), '440Hz 소리 → A4 (' + await ev(`document.querySelector('#tNote').textContent+' '+document.querySelector('#tHz').textContent`) + ')');
  chk(await ev(`Math.abs(parseInt(document.querySelector('#tCents b')?.textContent||'99'))<=3 && document.querySelector('#tGauge').classList.contains('ok')`), '센트 ±3 안 · 초록');
  await ev(`document.querySelector('#tTr [data-v="2"]').click()`); await sleep(500);
  chk(await until(`document.querySelector('#tNote b')?.textContent==='B'`, 4000), 'B♭ 악기 = 악보 음 B 로 보임');
  await ev(`document.querySelector('#tTr [data-v="0"]').click()`);
  await c.shot('v10-tuner.png', false);
  chk(await ev(`(${'(f=>Math.abs(f-440)<2)'})(SSV.pitchOf(Float32Array.from({length:4096},(_, i)=>Math.sin(2*Math.PI*440*i/48000)),48000))`), '소리 높이 찾기 계산 = 440Hz');
  // 녹음
  await ev(`document.querySelector('#tunP .mtabs [data-tab="rec"]').click()`); await sleep(300);
  chk(await ev(`!SSV.T.stream`), '녹음 탭으로 가면 튜너 마이크 끔');
  await ev(`document.querySelector('#rBtn').click()`);
  chk(await until(`!!SSV.T.rec && document.querySelector('#vTun').classList.contains('rec')`, 5000), '녹음 시작 (위 단추 빨간 점)');
  await sleep(2200);
  await ev(`document.querySelector('#rBtn').click()`);
  chk(await until(`document.querySelectorAll('#rList .take').length===1`, 6000), '녹음 1개 저장');
  chk(await ev(`SSV.db.all('takes').then(a=>a.length===1 && a[0].sid==='${id}' && a[0].blob.size>500 && a[0].dur>=2)`), '녹음 파일 크기·길이·곡 연결');
  await c.shot('v11-rec.png', false);
  await ev(`document.querySelector('#tClose').click()`); await sleep(200);

  // 9. 메트로놈 창 새 디자인 + 창은 하나만
  await ev(`document.querySelector('#vMet').click()`); await sleep(300);
  chk(await ev(`!document.querySelector('#met').hidden && getComputedStyle(document.querySelector('#met')).backgroundColor.startsWith('rgba(255, 255, 255')`), '메트로놈 창 = 밝은 카드');
  await c.shot('v12-met.png', false);
  await ev(`document.querySelector('#vTun').click()`); await sleep(200);
  chk(await ev(`document.querySelector('#met').hidden && !document.querySelector('#tunP').hidden`), '창은 한 번에 하나');
  await ev(`document.querySelector('#tClose').click()`);

  // 10. 백업에 자르기·순서·점프 같이 감
  const j = await ev(`(async()=>{const s=await SSV.db.get('scores','${id}'); return JSON.stringify({ord:s.ord,jumps:s.jumps})})()`);
  chk(JSON.parse(j).ord && JSON.parse(j).jumps.length === 1, '곡 정보에 순서·점프 저장 (백업에 같이 들어감)');
  await ev(`SSV.closeViewer()`); await sleep(400);
  chk(await ev(`!SSV.T.rec && !SSV.T.stream && !SSV.V.auto.on`), '닫으면 마이크·녹음·자동 스크롤 모두 끔');
  await c.go(URL + '?r=' + Date.now());
  await ev(`document.querySelector('#grid .card[data-id="${id}"] .th').click()`); await until(`document.querySelectorAll('#stage .pg').length>=1`); await sleep(500);
  chk(await ev(`SSV.V.n===${np + 1} && document.querySelectorAll('#vTabs .tb').length===2`), '새로 열어도 쪽 순서·열린 탭 유지');
  // 휴대폰 폭
  await ev(`SSV.closeViewer()`); await sleep(300);
  await c.size(390, 844, true); await sleep(400);
  chk(await ev(`document.documentElement.scrollWidth<=390`), '폭 390 가로 넘침 없음');
  await c.shot('v13-phone.png', false);
  await ev(`document.querySelector('#grid .card[data-id="${id}"] .th').click()`); await until(`document.querySelectorAll('#stage .pg').length>=1`); await sleep(500);
  await ev(`document.querySelector('#viewer').classList.remove('hidebars')`); await sleep(300);
  chk(await ev(`document.querySelector('#topbar').getBoundingClientRect().height<200`), '휴대폰에서 위 막대 높이 적당 (' + await ev(`Math.round(document.querySelector('#topbar').getBoundingClientRect().height)`) + 'px)');
  await c.shot('v14-phone-viewer.png', false);
  console.log('bad', JSON.stringify(bad));
};
