// 화면 없는 Chrome 을 조종해 캡처·검사하는 작은 도구
// 사용: node cdp.js <스크립트.js>   (스크립트는 async (cdp) => {...} 를 module.exports)
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const SCR = __dirname;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = +process.env.CDP_PORT || 9333;
async function main() {
  const prof = path.join(SCR, 'chrome-prof' + (process.env.CDP_PORT ? '-' + process.env.CDP_PORT : ''));
  const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', ...(process.env.FAKE_WAV ? ['--use-file-for-fake-audio-capture=' + process.env.FAKE_WAV + '%noloop'] : []), 'about:blank'], { stdio: 'ignore' });
  let targets;
  // 앞 시험의 크롬이 아직 닫히는 중이면 늦게 뜬다 → 30초까지 기다린다 (2026-09-28)
  for (let i = 0; i < 150; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.some(x => x.type === 'page')) break; } catch (e) { } await new Promise(r => setTimeout(r, 200)); }
  if (!targets) throw new Error('크롬이 뜨지 않았습니다 (포트 ' + port + ')');
  const t = targets.find(x => x.type === 'page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; const logs = [];
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.consoleAPICalled') logs.push(d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description).join(' '));
    if (d.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + JSON.stringify(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  const cdp = {
    send, logs,
    async size(w, h, mobile = true) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile }); },
    async go(url) { await send('Page.navigate', { url }); await new Promise(r => setTimeout(r, 2500)); },
    async ev(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description)); return r.result.result.value; },
    async shot(file, full = true) {
      let clip;
      if (full) { const m = await send('Page.getLayoutMetrics'); const cs = m.result.cssContentSize; clip = { x: 0, y: 0, width: cs.width, height: Math.min(cs.height, 6000), scale: 1 }; }
      const r = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
      fs.writeFileSync(path.join(SCR, file), Buffer.from(r.result.data, 'base64'));
    },
    async shotEl(file, sel) {
      const rc = await cdp.ev(`(()=>{const n=document.querySelector('nav.tabs'); if(n) n.style.display='none'; const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()`);
      const r = await send('Page.captureScreenshot', { format: 'png', clip: rc, captureBeyondViewport: true });
      fs.writeFileSync(path.join(SCR, file), Buffer.from(r.result.data, 'base64'));
      await cdp.ev(`(()=>{const n=document.querySelector('nav.tabs'); if(n) n.style.display='';})()`);
    },
    sleep: ms => new Promise(r => setTimeout(r, ms)),
  };
  try { await require(path.resolve(process.argv[2]))(cdp); }
  catch (e) { console.log('SCRIPT ERR', e.message); }
  console.log('--- console ---\n' + logs.join('\n'));
  ws.close(); ch.kill();
  process.exit(0);
}
main();
