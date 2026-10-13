// 메트로놈 창 생김새 캡처 (t01-all.js 다음에 돌림 — 그 검사가 남긴 악보를 씀): node cdp.js t03-met-look.js
// 탭 4개 · 박 표시(진자·숫자·점) · 휴대폰 폭 · 위 막대
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
module.exports = async (c) => {
  const ev = c.ev, sleep = c.sleep, bad = [];
  const chk = (ok, m) => { console.log((ok ? '✓ ' : '✗ ') + m); if (!ok) bad.push(m); };
  await c.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0' });
  await c.size(1280, 800, false);
  await c.go(URL + '?look=' + Date.now());
  await ev(`SSV.OPT.met.vis=['dots','pend','num','edge']; SSV.OPT.met.tab='beat'; 1`);
  await ev(`SSV.db.all('scores').then(a=>SSV.openViewer([a.find(s=>s.fileName==='c.pdf').id],0))`); await sleep(1500);
  await ev(`document.querySelector('#vMet').click()`); await sleep(300);
  await ev(`document.querySelector('#mPlay').click()`); await sleep(1300);
  for (const t of ['beat', 'sound', 'look', 'prac']) {
    await ev(`document.querySelector('.mtabs button[data-tab="${t}"]').click()`); await sleep(350);
    chk(await ev(`[...document.querySelectorAll('#met .mpane')].filter(p=>!p.hidden).map(p=>p.dataset.pane).join()==='${t}'`), '탭 ' + t + ' 만 보임');
    await c.shot('s13-met-' + t + '.png', false);
  }
  chk(await ev(`document.querySelector('#met').scrollWidth<=document.querySelector('#met').clientWidth+1`), '창 가로 넘침 없음');
  await c.size(390, 844, true); await sleep(900);
  await ev(`document.querySelector('.mtabs button[data-tab="beat"]').click()`); await sleep(300);
  chk(await ev(`(()=>{const r=document.querySelector('#met').getBoundingClientRect();return r.left>=0&&r.right<=390})()`), '휴대폰 폭: 창이 화면 안');
  await c.shot('s14-met-phone.png', false);
  await ev(`SSV.closeViewer()`); await sleep(300);
  console.log('bad', JSON.stringify(bad));
};
