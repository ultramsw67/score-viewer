// 진단 상자 시험: node t09-diag.js — 부품을 막으면 8초 뒤 「앱이 다 열리지 않았습니다」가 뜨고, 정상일 땐 안 뜸
const path = require('path');
const { webkit } = require('C:/Users/ultramsw67/Desktop/homepage/node_modules/playwright-core');
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
(async () => {
  const bad = [], chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) bad.push(m); };
  const ctx = await webkit.launchPersistentContext(require('os').tmpdir() + '/wk-diag-' + Date.now(), { viewport: { width: 1180, height: 820 } });
  const pg = ctx.pages()[0];
  await pg.route('**/vendor/pdf.min.mjs', r => r.abort());
  await pg.goto(URL); await pg.waitForTimeout(9000);
  const t = await pg.evaluate(`document.querySelector('#diagBox')?.innerText || ''`);
  chk(t.includes('앱이 다 열리지 않았습니다') && t.includes('v1.4.4'), '부품 막힘 → 진단 상자');
  console.log('  ' + t.replace(/\n/g, ' | ').slice(0, 260));
  await pg.screenshot({ path: path.join(__dirname, 'd0-diag.png') });
  await pg.unroute('**/vendor/pdf.min.mjs');
  const p2 = await ctx.newPage(); await p2.goto(URL + '?d=' + Date.now()); await p2.waitForTimeout(9000);
  chk(await p2.evaluate(`!document.querySelector('#diagBox') && !!window.SSV`), '정상일 땐 안 뜸');
  console.log(bad.length ? '실패 ' + bad.length : '모두 통과'); await ctx.close();
})();
