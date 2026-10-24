// v1.6.0 Piascore 식 화면 점검: SSV_TOUR=1 node cdp.js t11-v16.js (로컬 서버 8781)
// 왼쪽 줄(악보함·최근·연주 목록·태그) · 정렬/보기 모양 단추 · 「편집」 · 연주 목록 칸 · 악보 화면 맨 위 「‹ 악보함」 줄 · 예전처럼 숨기기 설정 · 새 화면 안내 목소리
const path = require('path');
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
const PDF = ['a', 'b2', 'b3', 'c'].map(n => path.resolve(__dirname, 'pdf', n + '.pdf'));
module.exports = async (c) => {
  const L = m => console.log(m); const bad = [], chk = (cond, m) => cond ? L('✓ ' + m) : (bad.push(m), L('✗ ' + m));
  const ev = c.ev, sleep = c.sleep;
  const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch (e) { } await sleep(150); } return false; };
  const setFiles = async (sel, files) => {
    const doc = await c.send('DOM.getDocument'); const n = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
    await c.send('DOM.setFileInputFiles', { nodeId: n.result.nodeId, files });
  };
  const click = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  const center = sel => ev(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,vis:r.width>0&&getComputedStyle(document.querySelector(${JSON.stringify(sel)})).opacity>0.5}})()`);
  const key = async (k, code, kc) => { await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: kc }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: kc }); };
  await c.send('DOM.enable'); await c.size(1366, 820, false);
  await c.go(URL + 'LICENSES.txt');
  await ev(`new Promise(r=>{const q=indexedDB.deleteDatabase('sood-score'); q.onsuccess=q.onerror=q.onblocked=()=>r(1)})`);
  await ev(`localStorage.removeItem('ssv.opt')`);
  await c.go(URL + '?v=' + Date.now());
  chk(await ev(`SSV.VERSION.localeCompare('v1.6.0',undefined,{numeric:true})>=0`), '버전 v1.6.0 이상');
  // 1. 새 화면 안내 (처음 한 번)
  if (!process.env.SSV_TOUR) L('※ SSV_TOUR=1 없이 돌림 — 안내 검사 건너뜀');
  else {
    chk(await until(`document.querySelector('.sg-wrap .sg-title')?.textContent.startsWith('화면이 새로 바뀌었어요')`, 5000), '처음 열면 「화면이 새로 바뀌었어요」 안내 창');
    chk(await ev(`document.querySelectorAll('.sg-wrap .sg-line').length===6 && [...document.querySelectorAll('.sg-wrap .sg-line')].some(l=>l.textContent.includes('「악보함」'))`), '안내에 돌아가는 법(「악보함」) 문장');
    chk(await ev(`!!document.querySelector('.sg-wrap .sg-play')`), '안내 창에 🔊 듣기 단추');
    await key('Escape', 'Escape', 27); await sleep(300);
    await c.go(URL + '?v=' + Date.now()); await sleep(900);
    chk(await ev(`!document.querySelector('.sg-wrap')`), '다시 열면 안내 안 나옴 (한 번만)');
  }
  await setFiles('#fileIn', PDF);
  chk(await until(`!document.querySelector('#prog').classList.contains('on') && document.querySelectorAll('#grid .card').length===4`, 40000), '4곡 넣기');
  const ids = await ev(`SSV.db.all('scores').then(a=>Object.fromEntries(a.map(s=>[s.fileName.replace('.pdf',''),s.id])))`);
  // 태그 2개 + 연주 목록 하나 (c → a → b2)
  await ev(`(async()=>{const a=await SSV.db.all('scores'); for(const s of a){ s.tags = s.fileName==='a.pdf'?['알토']:s.fileName==='c.pdf'?['알토','행진곡']:[]; await SSV.db.put('scores',s);} await SSV.db.put('sets',{id:'sT',name:'토요 합주',items:['${ids.c}','${ids.a}','${ids.b2}'],updated:Date.now()}); await SSV.renderLib();})()`);
  await sleep(300);
  await ev(`(()=>{SSV.OPT.tourV=1; localStorage.setItem('ssv.opt', JSON.stringify(SSV.OPT));})()`);  // 악보 화면 안내는 8번에서 따로
  // 2. 왼쪽 줄
  const side = await ev(`[...document.querySelectorAll('#fside .fh span')].map(x=>x.textContent.replace(/ \\d+$/,''))`);
  chk(JSON.stringify(side) === JSON.stringify(['악보함', '폴더', '연주 목록', '태그']), '왼쪽 줄 묶음 = 악보함·폴더·연주 목록·태그 ' + JSON.stringify(side));
  chk(await ev(`['all','recent','fav','set:sT','tag:알토','tag:행진곡'].every(v=>document.querySelector('#fside .fi[data-v="'+v+'"]'))`), '모든 악보·최근 본 악보·즐겨찾기·연주 목록·태그 칸');
  chk(await ev(`document.querySelector('#fside .fi[data-v="set:sT"] .ct').textContent==='3' && document.querySelector('#fside .fi[data-v="tag:알토"] .ct').textContent==='2'`), '연주 목록 곡 수 3 · 태그 「알토」 2곡');
  chk(await ev(`document.querySelectorAll('#fside .fi .ic svg').length>=6 && !!document.querySelector('#btnNewSet2')`), '선 아이콘 + 「＋ 새 목록」');
  // 3. 정렬·보기 모양·편집
  chk(await ev(`document.querySelector('#sortSeg button.on').dataset.s==='title' && document.querySelector('#modeSeg button.on').dataset.m==='grid'`), '정렬 = 이름, 보기 = 그림 (처음)');
  await ev(`document.querySelector('#modeSeg [data-m="list"]').click()`); await sleep(300);
  const row = await ev(`(()=>{const c=document.querySelector('#grid .card').getBoundingClientRect(); return {g:document.querySelector('#grid').classList.contains('rows'), h:c.height, w:c.width}})()`);
  chk(row.g && row.h < 90 && row.w > 700 && await ev(`SSV.OPT.lmode==='list'`), '「줄」 = 한 줄에 한 곡 ' + JSON.stringify(row));
  await c.shot('n2-list.png', false);
  await ev(`document.querySelector('#modeSeg [data-m="grid"]').click()`); await sleep(200);
  await ev(`document.querySelector('#sortSeg [data-s="added"]').click()`); await sleep(200);
  chk(await ev(`SSV.OPT.sort==='added' && document.querySelector('#sortSeg [data-s="added"]').classList.contains('on')`), '정렬 단추 「넣은 순」');
  await ev(`document.querySelector('#sortSeg [data-s="title"]').click()`); await sleep(200);
  chk(await ev(`document.querySelector('#btnSel').textContent.includes('편집')`), '「☑ 편집」 단추');
  await ev(`document.querySelector('#btnSel').click()`); await sleep(200);
  chk(await ev(`!document.querySelector('#selbar').hidden && document.querySelector('#btnSel').textContent.includes('완료')`), '편집 중 = 「✓ 완료」 + 아래 막대');
  await ev(`document.querySelector('#btnSel').click()`); await sleep(200);
  // 4. 태그 칸
  await ev(`document.querySelector('#fside .fi[data-v="tag:행진곡"]').click()`); await sleep(300);
  chk(await ev(`document.querySelector('#fTitle').textContent==='# 행진곡' && document.querySelectorAll('#grid .card').length===1`), '태그 칸 = 그 태그 곡만');
  // 5. 연주 목록 칸
  await ev(`document.querySelector('#fside .fi[data-v="set:sT"]').click()`); await sleep(300);
  const st = await ev(`({t:document.querySelector('#fTitle').textContent, bar:!document.querySelector('#setBar').hidden, sort:document.querySelector('#sortSeg').hidden, names:[...document.querySelectorAll('#grid .card .t')].map(x=>x.textContent)})`);
  chk(st.t === '▶ 토요 합주' && st.bar && st.sort && st.names.length === 3 && st.names[0].startsWith('1. ') && st.names[2].startsWith('3. '), '연주 목록 칸 = 정한 순서 번호 + 「▶ 연주 시작」 ' + JSON.stringify(st));
  chk(await ev(`SSV.sgCtx()`) === 'sets', '연주 목록 칸 도우미 키 = sets');
  await c.shot('n1-lib-set.png', false);
  await ev(`document.querySelectorAll('#grid .card .th')[1].click()`);
  chk(await until(`SSV.V.doc && SSV.V.queue.length===3 && SSV.V.qi===1 && SSV.V.score.id==='${ids.a}'`), '두 번째 카드 → 그 곡부터 연주 (3곡 중 2번째)');
  // 6. 악보 화면 맨 위 줄
  await ev(`document.querySelector('#viewer').classList.add('hidebars')`); await sleep(500);
  const strip = await center('#vClose');
  chk(strip.vis && strip.y < 46 && strip.x < 120, '막대가 숨어도 왼쪽 위 「‹ 악보함」 보임 ' + JSON.stringify(strip));
  chk(await ev(`document.querySelector('#vClose').textContent.includes('악보함') && document.querySelector('#vTitle').textContent.length>0 && /\\d+ \\/ \\d+쪽/.test(document.querySelector('#vPgS').textContent)`), '맨 위 줄 = 악보함 · 곡 이름 · 쪽 수');
  const stg = await ev(`(()=>{const s=document.querySelector('#stage').getBoundingClientRect(), p=document.querySelector('#stage .pg').getBoundingClientRect(); return {st:s.top, pt:p.top}})()`);
  chk(stg.st >= 45 && stg.pt >= 45, '악보가 맨 위 줄에 가리지 않음 ' + JSON.stringify(stg));
  await c.shot('n3-viewer.png', false);
  await click(strip.x, strip.y); await sleep(600);
  chk(await ev(`!document.querySelector('#viewer').classList.contains('on') && document.querySelector('#fTitle').textContent==='▶ 토요 합주'`), '「‹ 악보함」 한 번 누르면 목록으로 (보던 칸 그대로)');
  // Esc 도 그대로
  await ev(`document.querySelectorAll('#grid .card .th')[0].click()`); await until(`SSV.V.doc`); await sleep(400);
  await key('Escape', 'Escape', 27); await sleep(500);
  chk(await ev(`!document.querySelector('#viewer').classList.contains('on')`), 'Esc → 목록');
  // 7. 설정 「도구 막대와 같이 숨기기」 = 예전처럼
  await ev(`(()=>{SSV.OPT.strip=false; localStorage.setItem('ssv.opt', JSON.stringify(SSV.OPT));})()`);
  await ev(`document.querySelector('#fside .fi[data-v="all"]').click()`); await sleep(200);
  await ev(`document.querySelector('#grid .card .th').click()`); await until(`SSV.V.doc`); await sleep(400);
  await ev(`document.querySelector('#viewer').classList.add('hidebars')`); await sleep(500);
  const ns = await ev(`({op:getComputedStyle(document.querySelector('#vstrip')).opacity, top:document.querySelector('#stage').getBoundingClientRect().top})`);
  chk(+ns.op < 0.1 && ns.top === 0, '「예전처럼」 설정: 막대가 숨으면 맨 위 줄도 숨고 악보가 화면 가득 ' + JSON.stringify(ns));
  await ev(`document.querySelector('#viewer').classList.remove('hidebars')`); await sleep(400);
  chk((await center('#vClose')).vis, '「예전처럼」 설정: 가운데 눌러 막대를 꺼내면 「‹ 악보함」 보임');
  await ev(`SSV.closeViewer()`); await sleep(400);
  await ev(`(()=>{SSV.OPT.strip=true; localStorage.setItem('ssv.opt', JSON.stringify(SSV.OPT));})()`);
  // 8. 처음 악보를 열 때 안내 (목소리)
  if (process.env.SSV_TOUR) {
    await ev(`(()=>{delete SSV.OPT.tourV; localStorage.setItem('ssv.opt', JSON.stringify(SSV.OPT));})()`);
    const th = await center('#grid .card .th'); await click(th.x, th.y);
    chk(await until(`document.querySelector('.sg-wrap .sg-title')?.textContent.startsWith('악보 화면에서 꼭 알아 둘 것')`, 8000), '처음 악보 열 때 「악보 화면에서 꼭 알아 둘 것」 안내');
    chk(await until(`!!document.querySelector('.sg-wrap .sg-line.sg-on')`, 5000), '안내를 바로 읽기 시작 (노란 줄)');
    await key('Escape', 'Escape', 27); await sleep(300); await ev(`SSV.closeViewer()`); await sleep(400);
    await ev(`document.querySelector('#grid .card .th').click()`); await until(`SSV.V.doc`); await sleep(800);
    chk(await ev(`!document.querySelector('.sg-wrap')`), '두 번째부터는 안내 안 나옴');
    await ev(`SSV.closeViewer()`); await sleep(300);
  }
  // 9. 폰
  await c.size(390, 800, true); await c.go(URL + '?v=' + Date.now()); await sleep(600);
  chk(await ev(`document.documentElement.scrollWidth<=391`), '폰 390: 가로 넘침 없음');
  await c.shot('n4-phone.png', false);
  await ev(`document.querySelector('#grid .card .th').click()`); await until(`SSV.V.doc`); await sleep(500);
  const ph = await center('#vClose');
  chk(ph.vis && ph.w >= 44 && ph.h >= 40, '폰: 「‹ 악보함」 누르기 충분한 크기 ' + JSON.stringify(ph));
  await c.shot('n5-phone-viewer.png', false);
  L('bad ' + JSON.stringify(bad));
};
