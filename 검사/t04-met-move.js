// 메트로놈 손가락으로 옮기기·숨기기 (안드로이드 패드 흉내, t01-all.js 다음에): node cdp.js t04-met-move.js
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
module.exports = async (c) => {
  const ev = c.ev, sleep = c.sleep, bad = [];
  const chk = (ok, m) => { console.log((ok ? '✓ ' : '✗ ') + m); if (!ok) bad.push(m); };
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await c.size(1280, 800, true);
  await c.go(URL + '?mv=' + Date.now());
  await ev(`SSV.OPT.met.xy=null; SSV.OPT.met.hid=false; SSV.OPT.met.pos='tc'; 1`);
  await ev(`SSV.db.all('scores').then(a=>SSV.openViewer([a.find(s=>s.fileName==='c.pdf').id],0))`); await sleep(1500);
  const g = JSON.parse(await ev(`JSON.stringify(document.querySelector('#mvGrip').getBoundingClientRect())`));
  const tp = (type, x, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 6, radiusY: 6 }] });
  const x0 = g.x + g.width / 2, y0 = g.y + g.height / 2;
  await tp('touchStart', x0, y0); for (let k = 1; k <= 12; k++) { await tp('touchMove', x0 - k * 45, y0 + k * 38); await sleep(16); } await tp('touchEnd'); await sleep(500);
  const r = JSON.parse(await ev(`JSON.stringify(document.querySelector('#mvis').getBoundingClientRect())`));
  chk(r.x < g.x - 400 && r.y > 300, '손가락으로 끌어 왼쪽 아래로 옮김');
  chk(await ev(`SSV.V.page`) === 1, '끄는 동안 쪽 안 넘어감');
  await c.shot('s16-met-moved.png', false);
  const h = JSON.parse(await ev(`JSON.stringify(document.querySelector('#mvHide').getBoundingClientRect())`));
  await tp('touchStart', h.x + h.width / 2, h.y + h.height / 2); await sleep(40); await tp('touchEnd'); await sleep(500);
  chk(await ev(`document.querySelector('#mvis').hidden`), '손가락으로 ✕ = 사라짐');
  await c.shot('s17-met-hidden.png', false);
  await ev(`document.querySelector('#vMet').click(); document.querySelector('#mClose').click()`); await sleep(300);
  chk(await ev(`!document.querySelector('#mvis').hidden`), '위 ♩ 단추로 다시 보임');
  await ev(`SSV.OPT.met.xy=null; SSV.closeViewer()`); await sleep(300);
  console.log('bad', JSON.stringify(bad));
};
