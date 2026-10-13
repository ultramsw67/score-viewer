// 수드 악보 보기 전체 점검: node cdp.js t01-all.js  (먼저 개발 원본 폴더에서 python -m http.server 8781 --bind 127.0.0.1)
// 넣기·같은 파일 거르기·보기·넘기기·가로 두 쪽·폭 맞춤·필기 저장·연주 목록 이어 넘기기·태그·검색·백업 왕복·안드로이드 패드 손가락 넘기기
// 통과: bad [] 이고 console 에 EXC 없음
const path = require('path'), fs = require('fs');
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
const PDF = ['a', 'b2', 'b3', 'c'].map(n => path.resolve(__dirname, 'pdf', n + '.pdf'));
const UA_TAB = 'Mozilla/5.0 (Linux; Android 14; SM-X710N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
module.exports = async (c) => {
  const L = m => { fs.appendFileSync(path.join(__dirname, 'trace.txt'), m + String.fromCharCode(10)); console.log(m); }; const bad = [], ok = m => L('✓ ' + m), chk = (cond, m) => cond ? ok(m) : (bad.push(m), L('✗ ' + m));
  const ev = c.ev, sleep = c.sleep;
  const until = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return true; await sleep(150); } return false; };
  const setFiles = async (sel, files) => {
    const doc = await c.send('DOM.getDocument'); const n = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
    await c.send('DOM.setFileInputFiles', { nodeId: n.result.nodeId, files });
  };
  const blank = `(()=>{const cv=document.querySelector('#stage canvas.pdf'); if(!cv) return -1; const g=cv.getContext('2d'); const d=g.getImageData(0,0,cv.width,cv.height).data; let k=0; for(let i=0;i<d.length;i+=4*97) if(d[i]<200) k++; return k})()`;
  L('start'); await c.send('DOM.enable'); L('dom');
  const dl = path.join(__dirname, 'out'); fs.mkdirSync(dl, { recursive: true }); for (const f of fs.readdirSync(dl)) fs.unlinkSync(path.join(dl, f)); // rmSync 는 한글 경로에서 node 24 가 죽음
  await c.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl }).catch(() => c.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dl }));

  // 1. 빈 화면
  await c.size(1280, 800, false);
  await c.go(URL);
  await ev(`new Promise(r=>{const q=indexedDB.deleteDatabase('sood-score'); q.onsuccess=q.onerror=q.onblocked=()=>r(1)})`);
  await ev(`localStorage.clear()`);
  await c.go(URL + '?t=' + Date.now());
  chk(await ev(`!document.querySelector('#libEmpty').hidden`), '처음엔 빈 목록 안내');
  await c.shot('s0-empty.png', false);

  // 2. 넣기
  await setFiles('#fileIn', PDF);
  chk(await until(`!document.querySelector('#prog').classList.contains('on') && document.querySelectorAll('#grid .card').length===4`, 40000), '4곡 넣기');
  chk(await ev(`[...document.querySelectorAll('#grid .card img')].every(i=>i.src.startsWith('data:image/jpeg'))`), '미리보기 그림 4개');
  await sleep(500); await c.shot('s1-lib.png', false);
  await setFiles('#fileIn', [PDF[0]]);
  await until(`document.querySelector('#toast').textContent.includes('이미')`, 10000);
  chk(await ev(`document.querySelectorAll('#grid .card').length===4`), '같은 파일은 다시 안 들어감');
  chk(await ev(`document.querySelector('.sood .wm')?.textContent==='수트와후드' && document.querySelector('.sood img').naturalWidth>0`), '목록 위 수트와후드 이미지·워터마크');
  // 즐겨찾기: 카드 ☆ 누르기 → ★ · 「★ 즐겨찾기」 칩으로 모아 보기 · 다시 누르면 끔
  const idB2 = await ev(`SSV.db.all('scores').then(a=>a.find(s=>s.fileName==='b2.pdf').id)`);
  await ev(`document.querySelector('#grid .card[data-id="${idB2}"] [data-fav]').click()`); await sleep(500);
  chk(await ev(`SSV.db.get('scores','${idB2}').then(s=>s.fav===true)`) && await ev(`document.querySelector('#grid .card[data-id="${idB2}"]').classList.contains('isfav') && document.querySelector('#grid .card[data-id="${idB2}"] [data-fav]').textContent==='★'`), '즐겨찾기 켜기 (★ 표시·저장)');
  chk(await ev(`SSV.V.doc===null && !document.querySelector('#viewer').classList.contains('on')`), '☆ 눌러도 악보가 열리지 않음');
  await ev(`document.querySelector('#tagChips [data-fav]').click()`); await sleep(300);
  chk(await ev(`document.querySelectorAll('#grid .card').length===1 && document.querySelector('#tagChips [data-fav]').textContent.includes('1')`), '「★ 즐겨찾기」 칩 = 즐겨찾기만 보기');
  await c.go(URL + '?tf=' + Date.now());
  chk(await ev(`document.querySelectorAll('#grid .card').length===1`), '새로고침해도 즐겨찾기 보기 유지');
  await ev(`document.querySelector('#tagChips [data-t=""]').click()`); await sleep(300);
  chk(await ev(`document.querySelectorAll('#grid .card').length===4`), '「전체」 누르면 다시 4곡');
  await ev(`document.querySelector('#grid .card[data-id="${idB2}"] [data-fav]').click()`); await sleep(400);
  chk(await ev(`SSV.db.get('scores','${idB2}').then(s=>!s.fav)`) && await ev(`document.querySelector('#grid .card[data-id="${idB2}"] [data-fav]').textContent==='☆'`), '즐겨찾기 끄기');

  // 3. 보기·넘기기 (가로 → 두 쪽)
  const idC = await ev(`SSV.db.all('scores').then(a=>a.find(s=>s.fileName==='c.pdf').id)`);
  await ev(`document.querySelector('#grid .card[data-id="${idC}"] .th').click()`);
  chk(await until(`document.querySelectorAll('#stage .pg').length>=1 && SSV.V.n>1`), '악보 열림');
  await sleep(400);
  chk(await ev(blank) > 20, '쪽이 실제로 그려짐 (빈 화면 아님)');
  chk(await ev(`document.querySelectorAll('#stage .pg').length`) === 2, '가로 화면 = 두 쪽');
  chk(await ev(`getComputedStyle(document.querySelector('#stage .pg'),'::after').content.includes('수트와후드')`), '악보 쪽 오른쪽 아래 수트와후드 워터마크');
  await ev(`document.querySelector('#vFav').click()`); await sleep(400);
  chk(await ev(`document.querySelector('#vFav').textContent==='★' && SSV.db.get('scores','${idC}').then(s=>s.fav===true)`), '보기 화면에서 즐겨찾기 켜기');
  await c.shot('s2-two.png', false);
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(600);
  chk(await ev(`SSV.V.page`) === 3, '→ 키(페달)로 두 쪽 넘김 (1→3)');
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'PageUp', code: 'PageUp', windowsVirtualKeyCode: 33 });
  await sleep(600);
  chk(await ev(`SSV.V.page`) === 1, 'PageUp 으로 앞으로');

  // 세로 → 한 쪽
  await c.size(800, 1280, false); await sleep(900);
  chk(await ev(`document.querySelectorAll('#stage .pg').length`) === 1, '세로 화면 = 한 쪽');
  await c.shot('s3-one.png', false);

  // 폭 맞춤: 다음 = 아래로 내리기 먼저
  await c.size(1280, 800, false); await sleep(600);
  await ev(`document.querySelector('#vFit').click()`); await sleep(1200);
  const sh = await ev(`[document.querySelector('#stage').scrollHeight, document.querySelector('#stage').clientHeight]`);
  chk(sh[0] > sh[1], '폭 맞춤이면 쪽이 화면보다 길다');
  await ev(`SSV.next()`); await sleep(900);
  chk(await ev(`SSV.V.page===1 && document.querySelector('#stage').scrollTop>0`), '폭 맞춤: 다음 = 같은 쪽 아래로');
  await ev(`document.querySelector('#vFit').click()`); await sleep(800);

  // 4. 필기: 마우스로 한 획
  await ev(`document.querySelector('#vInk').click()`); await sleep(500);
  const r = JSON.parse(await ev(`JSON.stringify(document.querySelector('#stage .pg canvas.ink').getBoundingClientRect())`));
  const mx = (t, x, y) => c.send('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', buttons: t === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  await mx('mousePressed', r.x + 100, r.y + 100);
  for (let k = 1; k <= 10; k++) await mx('mouseMoved', r.x + 100 + k * 15, r.y + 100 + k * 6);
  await mx('mouseReleased', r.x + 250, r.y + 160); await sleep(500);
  chk(await ev(`(SSV.V.ink[1]||[]).length===1 && SSV.V.ink[1][0].p.length>=10`), '필기 한 획 그려짐');
  chk(await ev(`(()=>{const cv=document.querySelector('#stage .pg canvas.ink');const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let k=0;for(let i=3;i<d.length;i+=4*13)if(d[i]>0)k++;return k>5})()`), '필기가 화면에 보임');
  chk(await ev(`document.querySelector('#stage .pg').dataset.page==='1' && SSV.V.page===1`), '필기 중에는 눌러도 안 넘어감');
  await c.shot('s4-ink.png', false);
  await ev(`document.querySelector('#iUndo').click()`); await sleep(300);
  chk(await ev(`(SSV.V.ink[1]||[]).length===0`), '되돌리기');
  await mx('mousePressed', r.x + 120, r.y + 300);
  for (let k = 1; k <= 8; k++) await mx('mouseMoved', r.x + 120 + k * 20, r.y + 300);
  await mx('mouseReleased', r.x + 280, r.y + 300); await sleep(400);
  await ev(`document.querySelector('#iDone').click()`);
  await ev(`SSV.closeViewer()`); await sleep(500);
  await c.go(URL + '?t2=' + Date.now());
  await ev(`document.querySelector('#grid .card[data-id="${idC}"] .th').click()`);
  await until(`document.querySelectorAll('#stage .pg').length>=1`); await sleep(500);
  chk(await ev(`(SSV.V.ink[1]||[]).length===1`), '새로고침 뒤에도 필기 남음');
  await ev(`SSV.closeViewer()`); await sleep(400);

  // 5. 태그·검색
  const idA = await ev(`SSV.db.all('scores').then(a=>a.find(s=>s.fileName==='a.pdf').id)`);
  await ev(`document.querySelector('#grid .card[data-id="${idA}"] [data-edit]').click()`); await sleep(300);
  await ev(`document.querySelector('#eTags').value='알토, 10월 공연'; document.querySelector('#eTitle').value='그래피티 알토'; document.querySelector('#eSave').click()`);
  await sleep(600);
  chk(await ev(`[...document.querySelectorAll('#tagChips .chip')].some(b=>b.textContent.includes('10월 공연'))`), '태그 칩 생김');
  await ev(`document.querySelector('#q').value='그래 피티'; document.querySelector('#q').dispatchEvent(new Event('input'))`); await sleep(300);
  chk(await ev(`document.querySelectorAll('#grid .card').length`) === 1, '띄어쓰기 달라도 검색됨');
  await ev(`document.querySelector('#q').value=''; document.querySelector('#q').dispatchEvent(new Event('input'))`);

  // 6. 연주 목록: a(4쪽) → c(9쪽), a 끝에서 넘기면 c 가 열림
  await ev(`document.querySelector('#tabSets').click()`); await sleep(300);
  await ev(`document.querySelector('#btnNewSet').click()`); await sleep(400);
  await ev(`document.querySelector('#sName').value='10월 정기 공연'`);
  await ev(`document.querySelector('#sPick .row[data-id="${idA}"] [data-add]').click()`);
  await ev(`document.querySelector('#sPick .row[data-id="${idC}"] [data-add]').click()`);
  chk(await ev(`document.querySelectorAll('#sItems .row').length`) === 2, '목록에 2곡');
  await c.shot('s5-set.png', false);
  await ev(`document.querySelector('#sPlay').click()`);
  await until(`SSV.V.doc && SSV.V.score && SSV.V.score.id==='${idA}' && document.querySelectorAll('#stage .pg').length>0`);
  await ev(`SSV.go(SSV.V.n)`); await sleep(500);
  await ev(`SSV.next()`);
  chk(await until(`SSV.V.score.id==='${idC}' && SSV.V.page===1 && document.querySelectorAll('#stage .pg').length>0`), '마지막 쪽에서 넘기면 다음 곡');
  await sleep(300); await c.shot('s6-nextsong.png', false);
  await ev(`SSV.prev()`);
  chk(await until(`SSV.V.score.id==='${idA}' && SSV.V.page>=3`), '첫 쪽에서 앞으로 = 앞 곡 끝');
  await ev(`SSV.closeViewer()`); await sleep(400);

  // 6-1. 메트로놈 (v1.2.0): 창 열기 · 시작 · 박 표시 · 빠르기말 · 박자 · 강세 · 탭 · 넘겨도 계속 · M 키 · 곡에 저장 · 점검 빠르게 · 닫으면 멈춤
  await ev(`document.querySelector('#grid .card[data-id="${idC}"] .th').click()`);
  await until(`document.querySelectorAll('#stage .pg').length>0`); await sleep(400);
  await ev(`document.querySelector('#vMet').click()`); await sleep(300);
  chk(await ev(`!document.querySelector('#met').hidden && !document.querySelector('#mvis').hidden`), '메트로놈 창·표시 열림');
  await ev(`document.querySelector('#mTerms button[data-v="Allegro"]').click()`); await sleep(100);
  chk(await ev(`SSV.MO.bpm===138 && document.querySelector('#mBpm').value==='138' && document.querySelector('#mTerm').textContent.startsWith('Allegro')`), '빠르기말 Allegro → 138');
  await ev(`document.querySelector('#mPlay').click()`);
  chk(await until(`SSV.MET.on && SSV.MET.seen>=6`, 5000), '시작하면 박이 흐름 (소리 시계 기준)');
  chk(await ev(`SSV.MET.ctx.state==='running' && document.querySelector('#vMet').classList.contains('run')`), '소리 켜짐·위 단추 초록');
  chk(await until(`document.querySelector('#mEdge').getAnimations().length>0`, 3000), '테두리 빛 깜빡임');
  chk(await until(`!!document.querySelector('#mvDots span.now')`, 3000), '박 점 표시');
  await ev(`['pend','num','flash'].forEach(v=>document.querySelector('#mVisOpt button[data-v="'+v+'"]').click())`); await sleep(400);
  const pa = await ev(`document.querySelector('#mvPend i').style.transform`); await sleep(170);
  chk(await ev(`!document.querySelector('#mvPend').hidden && !document.querySelector('#mvNum').hidden && document.querySelector('#mvPend i').style.transform!==${JSON.stringify(pa)}`), '진자·큰 숫자 켜기 (진자가 움직임)');
  chk(await until(`document.querySelector('#mFlash').getAnimations().length>0`, 3000), '화면 깜빡임');
  await ev(`document.querySelector('#mMeter button[data-v="6/8"]').click()`); await sleep(300);
  chk(await ev(`JSON.stringify(SSV.MO.acc)==='[3,1,1,2,1,1]' && document.querySelectorAll('#mvDots span').length===6 && document.querySelector('#mUnit').textContent==='♪='`), '6/8 = 6박·1·4박 강세·♪ 기준');
  await ev(`document.querySelector('#mAcc button[data-i="1"]').click()`);
  chk(await ev(`SSV.MO.acc[1]===0 && document.querySelector('#mAcc button[data-i="1"]').classList.contains('a0')`), '박 누르면 세기 바뀜 (약 → 쉼)');
  await ev(`document.querySelector('#mMeter button[data-v="4/4"]').click()`);
  await ev(`document.querySelector('#mSnd button[data-v="wood"]').click()`);
  chk(await ev(`SSV.MO.snd==='wood' && document.querySelector('#mSnd button.on').dataset.v==='wood'`), '소리 바꾸기 (우드블록)');
  for (let i = 0; i < 5; i++) { await ev(`document.querySelector('#mTap').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`); await sleep(500); }
  const tb = await ev(`SSV.MO.bpm`);
  chk(tb >= 108 && tb <= 126, '탭 0.5초 간격 → 약 120 (' + tb + ')');
  await c.shot('s12-met.png', false);
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 }); await sleep(600);
  chk(await ev(`SSV.V.page===3 && SSV.MET.on`), '메트로놈 켠 채 페달(→)로 넘김');
  const key = async k => { await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: 'KeyM', text: k, windowsVirtualKeyCode: 77 }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: 'KeyM', windowsVirtualKeyCode: 77 }); await sleep(300); };
  await key('m');
  chk(await ev(`!SSV.MET.on && document.querySelector('#mPlay').textContent.includes('시작')`), 'M 키로 멈춤');
  await ev(`document.querySelector('#mBpm').value='96'; document.querySelector('#mBpm').dispatchEvent(new Event('change'))`);
  await ev(`document.querySelector('#mSave').click()`); await sleep(400);
  chk(await ev(`SSV.db.get('scores','${idC}').then(s=>s.met&&s.met.bpm===96&&s.met.meter==='4/4')`) && await ev(`document.querySelector('#mSave').textContent.includes('저장됨')`), '이 곡 빠르기로 저장 (96)');
  // 점점 빠르게: 240, 2마디마다 +5 → 약 2초 뒤 245
  await ev(`document.querySelector('#mBpm').value='240'; document.querySelector('#mBpm').dispatchEvent(new Event('change')); document.querySelector('#mTrBars').value='2'; document.querySelector('#mTrBars').dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#mTrOn').click()`);
  await key('m');
  chk(await ev(`SSV.MO.trMax===280`), '점점 빠르게: 최고가 지금보다 낮으면 +40 (280)');
  chk(await until(`SSV.MO.bpm>=245`, 6000), '점점 빠르게 (2마디마다 +5)');
  await ev(`document.querySelector('#mTrOn').click()`);
  await ev(`document.querySelector('#mClose').click()`); await sleep(200);
  chk(await ev(`document.querySelector('#met').hidden && SSV.MET.on && !document.querySelector('#mvis').hidden`), '창 접어도 소리·표시 계속');
  await ev(`SSV.closeViewer()`); await sleep(400);
  chk(await ev(`!SSV.MET.on`), '악보 닫으면 메트로놈 멈춤');
  await ev(`document.querySelector('#grid .card[data-id="${idC}"] .th').click()`);
  await until(`document.querySelectorAll('#stage .pg').length>0`); await sleep(300);
  chk(await ev(`SSV.MO.bpm===96`), '곡을 다시 열면 저장한 빠르기(96)');
  await ev(`SSV.closeViewer()`); await sleep(400);

  // 7. 백업 왕복: 전체 백업 → 다 지우기 → 가져오기
  await ev(`document.querySelector('#btnSettings').click()`); await sleep(500);
  await c.shot('s7-settings.png', false);
  await ev(`document.querySelector('#bxAll').click()`);
  let bk; for (let i = 0; i < 60 && !bk; i++) { await sleep(250); bk = fs.readdirSync(dl).find(f => f.endsWith('.soodscore')); }
  chk(!!bk, '전체 백업 파일 내려받음');
  await ev(`document.querySelector('#bxMeta').click()`); await sleep(1200);
  chk(fs.readdirSync(dl).some(f => f.endsWith('.json')), '목록·필기 파일 내려받음');
  await ev(`new Promise(r=>{SSV.db.all('scores').then(()=>{})}) && 1`).catch(() => { });
  await ev(`(async()=>{for (const s of ['scores','files','ink','sets']) for (const x of await SSV.db.all(s)) await SSV.db.del(s, x.id||x.key); return 1})()`);
  await c.go(URL + '?t3=' + Date.now());
  chk(await ev(`document.querySelectorAll('#grid .card').length`) === 0, '지운 뒤 빈 목록');
  if (bk) {
    await ev(`document.querySelector('#btnSettings').click()`); await sleep(300);
    await setFiles('#backupIn', [path.join(dl, bk)]);
    await until(`document.querySelectorAll('#grid .card').length===4`, 15000);
    chk(await ev(`SSV.db.all('ink').then(a=>a.length===1)`), '백업에서 필기 되살아남');
    chk(await ev(`SSV.db.all('sets').then(a=>a.length===1&&a[0].items.length===2)`), '백업에서 연주 목록 되살아남');
    chk(await ev(`SSV.db.all('files').then(a=>a.length===4)`), '백업에서 PDF 4곡 되살아남');
    chk(await ev(`SSV.db.get('scores','${idC}').then(s=>s.fav===true)`), '백업에서 즐겨찾기 되살아남');
    chk(await ev(`SSV.db.get('scores','${idC}').then(s=>s.met&&s.met.bpm===96)`), '백업에서 곡 빠르기 되살아남');
  }
  // 목록·필기만 가져오면 PDF 없는 곡 → 같은 PDF 넣으면 연결
  const js = fs.readdirSync(dl).find(f => f.endsWith('.json'));
  await ev(`(async()=>{for (const s of ['scores','files','ink','sets']) for (const x of await SSV.db.all(s)) await SSV.db.del(s, x.id||x.key); return 1})()`);
  await c.go(URL + '?t4=' + Date.now());
  await setFiles('#backupIn', [path.join(dl, js)]);
  await until(`document.querySelectorAll('#grid .card').length===4`, 10000);
  chk(await ev(`document.querySelectorAll('#grid .card.missing').length`) === 4, '목록만 가져오면 「PDF 없음」 표시');
  await setFiles('#fileIn', [PDF[3]]);
  await until(`document.querySelectorAll('#grid .card.missing').length===3`, 15000);
  chk(await ev(`SSV.db.get('scores','${idC}').then(s=>s.has && s.tags!==undefined)`) && await ev(`SSV.db.all('ink').then(a=>a.some(x=>x.id==='${idC}'))`), '같은 PDF 넣으면 필기·정보 연결');
  await c.shot('s8-missing.png', false);
  await setFiles('#fileIn', PDF.slice(0, 3)); await until(`document.querySelectorAll('#grid .card.missing').length===0`, 20000);

  // 8. 안드로이드 패드 흉내: 손가락으로 오른쪽 누르기·밀기
  await c.send('Emulation.setUserAgentOverride', { userAgent: UA_TAB, platform: 'Android' });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await c.size(1280, 800, true);
  await c.go(URL + '?t5=' + Date.now());
  chk(await ev(`document.querySelector('#btnAddDir').hidden`), '안드로이드에서는 폴더 단추 숨김');
  const tp = (type, x, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 8, radiusY: 8 }] });
  const tap = async (x, y) => { await tp('touchStart', x, y); await sleep(40); await tp('touchEnd'); await sleep(700); };
  await ev(`document.querySelector('#grid .card[data-id="${idC}"] .th').click()`);
  await until(`document.querySelectorAll('#stage .pg').length>0`); await sleep(500);
  await tap(1150, 400);
  chk(await ev(`SSV.V.page`) === 3, '패드: 오른쪽 누르면 다음 (두 쪽)');
  await tap(100, 400);
  chk(await ev(`SSV.V.page`) === 1, '패드: 왼쪽 누르면 앞');
  await tp('touchStart', 900, 400); for (let k = 1; k <= 6; k++) { await tp('touchMove', 900 - k * 40, 405); await sleep(20); } await tp('touchEnd'); await sleep(700);
  chk(await ev(`SSV.V.page`) === 3, '패드: 왼쪽으로 밀면 다음');
  await tap(640, 400);
  chk(await ev(`!document.querySelector('#viewer').classList.contains('hidebars')`), '패드: 가운데 누르면 메뉴');
  await c.shot('s9-pad-bars.png', false);
  // 펜만 설정이면 손가락은 안 그림
  await ev(`SSV.OPT.pen='pen'; document.querySelector('#vInk').click()`); await sleep(400);
  await tp('touchStart', 500, 300); for (let k = 1; k <= 5; k++) await tp('touchMove', 500 + k * 20, 300); await tp('touchEnd'); await sleep(400);
  chk(await ev(`(SSV.V.ink[3]||[]).length===0`), '「펜만」이면 손가락으로는 안 그려짐');
  await ev(`SSV.OPT.pen='any'`);
  await tp('touchStart', 500, 300); for (let k = 1; k <= 5; k++) await tp('touchMove', 500 + k * 20, 300); await tp('touchEnd'); await sleep(400);
  chk(await ev(`(SSV.V.ink[3]||[]).length===1`), '손가락 필기');
  await ev(`document.querySelector('#iDone').click()`);
  // 휴대폰 폭 목록 화면
  await ev(`SSV.closeViewer()`); await sleep(300);
  await c.size(390, 844, true); await sleep(500);
  chk(await ev(`document.documentElement.scrollWidth<=390`), '폭 390 에서 가로 넘침 없음');
  await c.shot('s10-phone.png', false);
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }); await sleep(300);
  await c.shot('s11-dark.png', false);
  console.log('bad', JSON.stringify(bad));
};
