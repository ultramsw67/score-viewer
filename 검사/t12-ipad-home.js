// v1.6.2 아이패드 사파리: 악보를 열면 「홈 화면에 추가」 안내, 홈 화면(standalone)에선 안 뜸.  node t12-ipad-home.js [browser|standalone]  (SSV_URL 없으면 로컬 8781)
const path = require('path');
const { webkit } = require('C:/Users/ultramsw67/Desktop/homepage/node_modules/playwright-core');
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
const MODE = process.argv[2] || 'browser';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const bad = [], L = m => console.log(m), chk = (c, m) => c ? L('✓ ' + m) : (bad.push(m), L('✗ ' + m));
  const ctx = await webkit.launchPersistentContext(require('os').tmpdir() + '/wk-ssv12-' + Date.now(), { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, userAgent: UA });
  await ctx.addInitScript(m => { Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 }); localStorage.setItem('ssv.opt', JSON.stringify({ tour16: 1, tourV: 1, guide: false })); if (m === 'standalone') Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }); }, MODE);
  const pg = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  const ev = s => pg.evaluate(s);
  const until = async (s, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(s)) return true; await sleep(200); } return false; };
  await pg.goto(URL, { waitUntil: 'load' }); await sleep(1500);
  await pg.setInputFiles('#fileIn', [path.resolve(__dirname, 'pdf', 'a.pdf')]);
  chk(await until(`document.querySelectorAll('#grid .card').length===1 && !document.querySelector('#prog').classList.contains('on')`, 30000), '악보 넣기');
  await pg.tap('#grid .card .th'); await sleep(2500);
  const open = await ev(`document.querySelector('#dHome').open`);
  if (MODE === 'standalone') {
    chk(!open, '홈 화면 앱: 안내 창 안 뜸');
    chk(await ev(`document.querySelector('#mnHome').hidden`), '홈 화면 앱: ⋯ 메뉴 「홈 화면에 추가」 숨김');
  } else {
    chk(open, '사파리: 악보 열면 「사파리 메뉴 없이 보기」 안내 창');
    await pg.screenshot({ path: path.join(__dirname, 't12-home.png') });
    await pg.tap('#hmNever'); await sleep(400);
    chk(await ev(`!document.querySelector('#dHome').open && JSON.parse(localStorage.getItem('ssv.opt')).homeNo===1`), '「다시 보지 않기」 → 닫히고 기억');
    chk(await ev(`!document.querySelector('#mnHome').hidden`), '⋯ 더 보기에 「사파리 메뉴 없이 보기」 있음');
    await ev(`document.querySelector('#mnHome').click()`); await sleep(300);
    chk(await ev(`document.querySelector('#dHome').open`), '⋯ 메뉴에서 다시 열림');
    await ev(`document.querySelector('#dHome').close()`);
    // v1.6.3 전체 화면이면 「‹ 악보함」이 사파리 ✕(왼쪽 위 약 20~80px) 오른쪽으로 비킴
    await pg.tap('#vstrip .vt'); await ev(`document.documentElement.requestFullscreen().catch(()=>{})`); await sleep(1200);
    const fs = await ev(`!!(document.fullscreenElement||document.webkitFullscreenElement)`);
    if (!fs) { L('  (시험 브라우저가 전체 화면을 안 해 줌 → 사건만 흉내)'); await ev(`viewer.classList.add('fsx')`); }
    chk(await ev(`document.querySelector('#viewer').classList.contains('fsx') && document.querySelector('#vClose').getBoundingClientRect().left >= 90`), '전체 화면: 「‹ 악보함」이 ✕ 자리(왼쪽 90px) 밖으로 ' + await ev(`Math.round(document.querySelector('#vClose').getBoundingClientRect().left)`));
    await pg.screenshot({ path: path.join(__dirname, 't12-fs.png') });
    if (fs) { await ev(`document.exitFullscreen()`); await sleep(800); chk(await ev(`!document.querySelector('#viewer').classList.contains('fsx') && document.querySelector('#vClose').getBoundingClientRect().left < 20`), '전체 화면 풀면 제자리'); }
  }
  chk(!errs.length, '오류 없음 ' + errs.join(' | '));
  console.log('bad', JSON.stringify(bad)); await ctx.close();
})();
