// v1.4.0 폴더 점검: node cdp.js t07-folders.js (로컬 서버 8781 — 「폴더째 넣기」 시험이 검사/pdf 를 읽음)
// 새 폴더·이름 중복 막기·고르기로 옮기기·끌어 놓기·폴더에서 넣기·폴더째 넣기·이름 바꾸기·정보 창 폴더·지우기/되살리기·검색·백업 왕복·폰 화면
const path = require('path'), fs = require('fs');
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
  const key = async (k, code, kc, text) => { await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: kc }); if (text) await c.send('Input.dispatchKeyEvent', { type: 'char', text }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: kc }); await sleep(300); };
  const cards = () => ev(`document.querySelectorAll('#grid .card').length`);
  const fcount = v => ev(`(document.querySelector('#fside [data-v="${v}"] .ct')||{}).textContent`);
  await c.send('DOM.enable'); await c.size(1366, 820, false);
  await c.go(URL + 'LICENSES.txt');
  await ev(`new Promise(r=>{const q=indexedDB.deleteDatabase('sood-score'); q.onsuccess=q.onerror=q.onblocked=()=>r(1)})`);
  await ev(`localStorage.setItem('ssv.opt', JSON.stringify({favOnly:false}))`);
  await c.go(URL + '?v=' + Date.now());
  chk(await ev(`SSV.VERSION==='v1.4.0'`), '버전 v1.4.0');
  chk(await ev(`new Promise(r=>{const q=indexedDB.open('sood-score'); q.onsuccess=()=>{const d=q.result; r(d.version===3 && d.objectStoreNames.contains('folders')); d.close();}})`), '저장소 v3 + 폴더 칸');
  chk(await ev(`SSV.OPT.favOnly===undefined && SSV.OPT.view==='all'`), '예전 설정(즐겨찾기만 보기) → 새 보기 설정으로');
  await setFiles('#fileIn', PDF);
  chk(await until(`!document.querySelector('#prog').classList.contains('on') && document.querySelectorAll('#grid .card').length===4`, 40000), '4곡 넣기');
  const ids = await ev(`SSV.db.all('scores').then(a=>Object.fromEntries(a.map(s=>[s.fileName.replace('.pdf',''),s.id])))`);
  chk(await ev(`document.querySelector('#fside [data-v="all"]').classList.contains('on') && document.querySelector('#fTitle').textContent==='모든 악보' && document.querySelector('#fCount').textContent==='4곡'`), '왼쪽 「모든 악보」 4곡');
  chk(await ev(`document.querySelector('#fside .fnote') && !document.querySelector('#fside [data-v="none"]')`), '폴더가 없을 땐 안내 글, 「폴더 없음」 칸 없음');
  await c.shot('f1-lib.png', false);

  // 1. 새 폴더 — 추천 이름 눌러 넣고 저장
  await ev(`document.querySelector('#btnNewFolder').click()`); await sleep(300);
  chk(await ev(`document.querySelector('#dFolder').open && document.querySelector('#fdTitle').textContent==='새 폴더 만들기' && document.querySelector('#fdDel').hidden && document.querySelectorAll('#fdSug .chip').length>=8`), '새 폴더 창 + 추천 이름');
  await ev(`document.querySelector('#fdSave').click()`); await sleep(200);
  chk(await ev(`!document.querySelector('#fdErr').hidden && document.querySelector('#dFolder').open`), '빈 이름이면 안내 (창 그대로)');
  await ev(`[...document.querySelectorAll('#fdSug .chip')].find(b=>b.dataset.s==='정기 공연').click()`);
  chk(await ev(`document.querySelector('#fdName').value==='정기 공연'`), '추천 이름 누르면 칸에 들어감');
  await ev(`document.querySelector('#fdName').value='10월 정기 공연'`); await ev(`document.querySelector('#fdName').focus()`);
  await key('Enter', 'Enter', 13); await sleep(400);
  const fA = await ev(`(SSV.folders().find(f=>f.name==='10월 정기 공연')||{}).id`);
  chk(fA && await ev(`!document.querySelector('#dFolder').open && document.querySelector('#fTitle').textContent==='📁 10월 정기 공연' && document.querySelector('#grid .empty').textContent.includes('비어 있습니다')`), 'Enter 로 저장 → 새 폴더로 들어감 (비어 있음 안내)');
  chk(await ev(`!document.querySelector('#fRename').hidden`), '폴더 제목 옆 「이름 바꾸기·지우기」');
  // 같은 이름 막기
  await ev(`document.querySelector('#btnNewFolder').click()`); await sleep(300);
  await ev(`document.querySelector('#fdName').value=' 10월  정기 공연 '; document.querySelector('#fdSave').click()`); await sleep(300);
  chk(await ev(`!document.querySelector('#fdErr').hidden && document.querySelector('#fdErr').textContent.includes('이미 있습니다')`), '같은 이름(띄어쓰기 달라도) 막기');
  await ev(`document.querySelector('#fdName').value='합주'; document.querySelector('#fdSave').click()`); await sleep(400);
  const fB = await ev(`(SSV.folders().find(f=>f.name==='합주')||{}).id`);
  chk(!!fB && await ev(`SSV.folders().length===2 && SSV.folders()[0].name==='10월 정기 공연'`), '두 번째 폴더 「합주」 (이름순)');

  // 2. 고르기 → 폴더로 옮기기
  await ev(`document.querySelector('#fside [data-v="all"]').click()`); await sleep(300);
  await ev(`document.querySelector('#btnSel').click()`); await sleep(300);
  chk(await ev(`!document.querySelector('#selbar').hidden && document.querySelector('#grid').classList.contains('sel') && document.querySelector('#selMove').disabled`), '「고르기」 켜면 아래 막대, 고르기 전엔 옮기기 흐림');
  await ev(`document.querySelector('#grid .card[data-id="${ids.a}"] .th').click()`); await ev(`document.querySelector('#grid .card[data-id="${ids.c}"] .meta').click()`); await sleep(300);
  chk(await ev(`document.querySelector('#selN').textContent==='2곡 고름' && document.querySelectorAll('#grid .card.picked').length===2 && !document.querySelector('#viewer').classList.contains('on')`), '카드 두 장 고름 (악보는 안 열림)');
  await c.shot('f2-select.png', false);
  await ev(`document.querySelector('#selMove').click()`); await sleep(300);
  chk(await ev(`document.querySelector('#dMove').open && document.querySelectorAll('#mvList [data-f]').length===3`), '옮길 폴더 창 (폴더 2 + 폴더 없음)');
  await ev(`document.querySelector('#mvList [data-f="${fA}"]').click()`); await sleep(500);
  chk(await ev(`SSV.db.all('scores').then(a=>a.filter(s=>s.folder==='${fA}').length===2)`) && await ev(`document.querySelector('#selbar').hidden && !document.querySelector('#grid').classList.contains('sel')`), '2곡 「10월 정기 공연」으로 옮김, 고르기 끝남');
  chk(await fcount(fA) === '2' && await fcount('none') === '2', '왼쪽 숫자: 정기 공연 2 · 폴더 없음 2');
  chk(await ev(`document.querySelector('#grid .card[data-id="${ids.a}"] .fd').textContent.includes('10월 정기 공연')`), '모든 악보에선 카드에 폴더 이름');
  await ev(`[...document.querySelectorAll('.toast button')].find(b=>b.textContent==='되돌리기').click()`); await sleep(500);
  chk(await ev(`SSV.db.all('scores').then(a=>a.every(s=>!s.folder))`), '「되돌리기」 → 원래대로');
  await ev(`SSV.doMove(['${ids.a}','${ids.c}'], '${fA}')`); await sleep(400);
  // 보이는 것 모두 고르기 + Esc 로 끝내기
  await ev(`document.querySelector('#btnSel').click()`); await sleep(200); await ev(`document.querySelector('#selAll').click()`); await sleep(200);
  chk(await ev(`document.querySelector('#selN').textContent==='4곡 고름' && document.querySelector('#selAll').textContent==='모두 풀기'`), '「보이는 것 모두 고르기」 → 4곡, 단추는 「모두 풀기」');
  await key('Escape', 'Escape', 27);
  chk(await ev(`document.querySelector('#selbar').hidden`), 'Esc 로 고르기 끝내기');

  // 3. 카드를 왼쪽 폴더로 끌어 놓기
  await ev(`(()=>{const dt=new DataTransfer(); const card=document.querySelector('#grid .card[data-id="${ids.b2}"]'); const tgt=document.querySelector('#fside [data-v="${fB}"]');
    card.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt})); tgt.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));
    window.__ok = tgt.classList.contains('dropok'); tgt.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt})); card.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt}));})()`); await sleep(500);
  chk(await ev(`window.__ok`) && await ev(`SSV.db.get('scores','${ids.b2}').then(s=>s.folder==='${fB}')`), '카드를 「합주」로 끌어 놓기 → 옮겨짐 (놓을 곳 점선)');
  await ev(`(()=>{const dt=new DataTransfer(); const card=document.querySelector('#grid .card[data-id="${ids.b3}"]'); const tgt=document.querySelector('#fside [data-v="fav"]');
    card.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt})); tgt.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt})); tgt.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));})()`); await sleep(500);
  chk(await ev(`SSV.db.get('scores','${ids.b3}').then(s=>s.fav===true && !s.folder)`), '「★ 즐겨찾기」로 끌어 놓기 → 즐겨찾기 켬');

  // 4. 폴더 보기 · 폴더에서 넣으면 그 폴더로
  await ev(`document.querySelector('#fside [data-v="${fA}"]').click()`); await sleep(300);
  chk(await cards() === 2 && await ev(`!document.querySelector('#grid .card .fd')`), '폴더를 누르면 그 폴더 악보만 (카드에 폴더 이름 안 보임)');
  await c.shot('f3-folder.png', false);
  await ev(`SSV.db.del('scores','${ids.a}').then(()=>SSV.db.del('files','${ids.a}')).then(()=>SSV.renderLib())`); await sleep(400);
  await setFiles('#fileIn', [PDF[0]]);
  chk(await until(`SSV.db.get('scores','${ids.a}').then(s=>s&&s.folder==='${fA}')`), '폴더를 보면서 「＋ 악보 넣기」 → 그 폴더에 들어감');
  await sleep(500);
  // 「폴더째 넣기」 흉내: PC 폴더 이름 = 앱 폴더, 하위 폴더 = 태그
  await ev(`SSV.db.del('scores','${ids.b3}').then(()=>SSV.db.del('files','${ids.b3}'))`);
  await ev(`fetch('검사/pdf/b3.pdf').then(r=>r.blob()).then(b=>{const f=new File([b],'b3.pdf',{type:'application/pdf'}); Object.defineProperty(f,'webkitRelativePath',{value:'코리아나윈드/알토/b3.pdf'}); return SSV.addFiles([f]);})`); await sleep(800);
  const fK = await ev(`(SSV.folders().find(f=>f.name==='코리아나윈드')||{}).id`);
  chk(!!fK && await ev(`SSV.db.get('scores','${ids.b3}').then(s=>s.folder==='${fK}' && s.tags.join()==='알토')`), '폴더째 넣기 → PC 폴더 이름으로 앱 폴더 만듦, 하위 폴더는 태그');
  chk(await ev(`document.querySelector('#fTitle').textContent==='📁 코리아나윈드'`), '넣은 뒤 그 폴더를 보여 줌');

  // 5. 이름 바꾸기 (⋯) · 정보 창 폴더 고르기
  await ev(`document.querySelector('#fside [data-v="${fB}"] [data-fm]').click()`); await sleep(300);
  chk(await ev(`document.querySelector('#dFolder').open && document.querySelector('#fdTitle').textContent==='폴더 이름 바꾸기' && document.querySelector('#fdName').value==='합주' && !document.querySelector('#fdDel').hidden`), '폴더 ⋯ → 이름 바꾸기 창');
  await ev(`document.querySelector('#fdName').value='토요 합주'; document.querySelector('#fdSave').click()`); await sleep(400);
  chk(await ev(`SSV.folders().some(f=>f.id==='${fB}' && f.name==='토요 합주') && document.querySelector('#fside [data-v="${fB}"] .nm').textContent==='토요 합주'`), '이름이 「토요 합주」로 바뀜');
  await ev(`document.querySelector('#fside [data-v="all"]').click()`); await sleep(300);
  await ev(`document.querySelector('#grid .card[data-id="${ids.b2}"] [data-edit]').click()`); await sleep(400);
  chk(await ev(`document.querySelector('#eFolder').value==='${fB}' && document.querySelectorAll('#eFolder option').length===5`), '정보 창 「폴더」 = 지금 폴더 (폴더 없음·3폴더·새 폴더)');
  await ev(`document.querySelector('#eFolder').value='${fK}'; document.querySelector('#eSave').click()`); await sleep(400);
  chk(await ev(`SSV.db.get('scores','${ids.b2}').then(s=>s.folder==='${fK}')`), '정보 창에서 폴더 바꾸기');
  await ev(`document.querySelector('#grid .card[data-id="${ids.b2}"] [data-edit]').click()`); await sleep(300);
  await ev(`(()=>{const s=document.querySelector('#eFolder'); s.value='__new'; s.dispatchEvent(new Event('change'));})()`); await sleep(300);
  await ev(`document.querySelector('#fdName').value='레슨'; document.querySelector('#fdSave').click()`); await sleep(400);
  const fL = await ev(`(SSV.folders().find(f=>f.name==='레슨')||{}).id`);
  chk(!!fL && await ev(`document.querySelector('#dEdit').open && document.querySelector('#eFolder').value==='${fL}'`), '정보 창 「＋ 새 폴더 만들기」 → 만들고 바로 골라짐');
  await ev(`document.querySelector('#eSave').click()`); await sleep(300);

  // 6. 검색은 모든 폴더에서
  await ev(`document.querySelector('#fside [data-v="${fA}"]').click()`); await sleep(200);
  await ev(`(()=>{const q=document.querySelector('#q'); q.value='b2'; q.dispatchEvent(new Event('input'));})()`); await sleep(300);
  chk(await ev(`document.querySelector('#fTitle').textContent.includes('모든 폴더') && document.querySelectorAll('#grid .card').length===1 && document.querySelector('#grid .card .fd').textContent.includes('레슨')`), '폴더 안에서 찾아도 모든 폴더에서 찾음 (폴더 이름 표시)');
  await ev(`(()=>{const q=document.querySelector('#q'); q.value='레슨'; q.dispatchEvent(new Event('input'));})()`); await sleep(300);
  chk(await cards() === 1, '폴더 이름으로도 찾기');
  await ev(`(()=>{const q=document.querySelector('#q'); q.value=''; q.dispatchEvent(new Event('input'));})()`); await sleep(200);

  // 7. 새로고침해도 보던 폴더 그대로
  await c.go(URL + '?r=' + Date.now()); await sleep(500);
  chk(await ev(`document.querySelector('#fTitle').textContent==='📁 10월 정기 공연' && document.querySelectorAll('#grid .card').length===2`), '새로고침해도 보던 폴더 그대로');

  // 8. 백업 왕복 (폴더 포함)
  const meta = await ev(`SSV.metaJson().then(j=>JSON.stringify(j))`);
  chk(JSON.parse(meta).folders.length === 4, '백업 파일에 폴더 4개');
  const bk = path.join(__dirname, 'out', 'folders-backup.json'); fs.mkdirSync(path.dirname(bk), { recursive: true }); fs.writeFileSync(bk, meta);
  await ev(`Promise.all(SSV.folders().map(f=>SSV.db.del('folders',f.id))).then(()=>SSV.db.all('scores')).then(a=>Promise.all(a.map(s=>{s.folder='';return SSV.db.put('scores',s)}))).then(()=>SSV.renderLib())`); await sleep(300);
  chk(await ev(`SSV.folders().length===0`), '(시험) 폴더 모두 지움');
  await ev(`document.querySelector('#btnSettings').click()`); await sleep(300);
  await setFiles('#backupIn', [bk]); await sleep(1500);
  chk(await ev(`SSV.folders().length===4`) && await ev(`SSV.db.get('scores','${ids.a}').then(s=>s.folder==='${fA}')`) && await ev(`document.querySelector('.toast').textContent.includes('폴더 4개')`), '백업 가져오기 → 폴더·악보 자리 되살아남');

  // 9. 폴더 지우기 → 악보는 「폴더 없음」, 되살리기
  await ev(`document.querySelector('#fside [data-v="${fA}"]').click()`); await sleep(300);
  await ev(`document.querySelector('#fRename').click()`); await sleep(300);
  await ev(`document.querySelector('#fdDel').click()`); await sleep(500);
  chk(await ev(`!SSV.folders().some(f=>f.id==='${fA}') && document.querySelector('#fTitle').textContent==='모든 악보'`) && await ev(`SSV.db.all('scores').then(a=>a.length===4 && a.filter(s=>!s.folder).length===2)`), '폴더 지우기 → 악보 4곡 그대로, 2곡은 폴더 없음');
  await ev(`[...document.querySelectorAll('.toast button')].find(b=>b.textContent==='되살리기').click()`); await sleep(600);
  chk(await ev(`SSV.folders().some(f=>f.id==='${fA}')`) && await ev(`SSV.db.all('scores').then(a=>a.filter(s=>s.folder==='${fA}').length===2)`), '「되살리기」 → 폴더와 악보 자리 되돌아옴');

  // 10. 여러 곡 지우기 → 되살리기
  await ev(`document.querySelector('#fside [data-v="all"]').click()`); await sleep(200);
  await ev(`document.querySelector('#btnSel').click()`); await sleep(200);
  await ev(`document.querySelector('#grid .card[data-id="${ids.a}"]').click(); document.querySelector('#grid .card[data-id="${ids.c}"]').click()`); await sleep(200);
  await ev(`document.querySelector('#selDel').click()`); await sleep(800);
  chk(await ev(`SSV.db.all('scores').then(a=>a.length===2)`), '고른 2곡 지우기');
  await ev(`[...document.querySelectorAll('.toast button')].find(b=>b.textContent==='되살리기').click()`); await sleep(800);
  chk(await ev(`SSV.db.all('scores').then(a=>a.length===4)`) && await ev(`SSV.db.get('files','${ids.c}').then(f=>!!f)`), '「되살리기」 → 4곡·PDF 되돌아옴');
  // 지운 곡을 열 수 있는지
  await ev(`document.querySelector('#grid .card[data-id="${ids.c}"] .th').click()`);
  chk(await until(`document.querySelectorAll('#stage .pg').length>=1`), '되살린 곡 열림');
  await ev(`SSV.closeViewer()`); await sleep(500);
  await c.shot('f4-all.png', false);

  // 11. 폰 화면 — 폴더가 위 가로 줄
  await c.size(390, 844, true); await sleep(600);
  chk(await ev(`getComputedStyle(document.querySelector('#fside')).flexDirection==='row' && document.documentElement.scrollWidth<=391`), '폰: 폴더가 위 가로 줄, 옆으로 넘치지 않음');
  await c.shot('f5-phone.png', false);
  await ev(`document.querySelector('#btnSel').click()`); await sleep(200); await ev(`document.querySelector('#grid .card').click()`); await sleep(200);
  chk(await ev(`(()=>{const r=document.querySelector('#selbar').getBoundingClientRect(); return r.left>=0 && r.right<=390;})()`), '폰: 고르기 막대가 화면 안');
  await c.shot('f6-phone-sel.png', false);
  L('bad ' + JSON.stringify(bad));
};
