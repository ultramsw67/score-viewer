// 도우미 창 모양 확인 (악보 화면 위, 3초 기다린 뒤): node cdp.js t10b-look.js
const path = require('path');
const URL = process.env.SSV_URL || 'http://127.0.0.1:8781/';
module.exports = async (c) => {
  const ev = c.ev, sleep = c.sleep;
  await c.send('DOM.enable'); await c.size(1280, 800, false);
  await c.go(URL + '?l=' + Date.now()); await sleep(1500);
  if (!(await ev(`document.querySelectorAll('#grid .card').length`))) {
    const doc = await c.send('DOM.getDocument'); const n = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#fileIn' });
    await c.send('DOM.setFileInputFiles', { nodeId: n.result.nodeId, files: [path.resolve(__dirname, 'pdf', 'c.pdf')] }); await sleep(5000);
  }
  await ev(`document.querySelector('#grid .card .th').click()`); await sleep(2500);
  await ev(`SoodGuide.open('viewer', true)`);
  for (const t of [100, 400, 1500, 3000]) {
    await sleep(t);
    console.log(t, await ev(`(()=>{const p=document.querySelector('.sg-panel'); return getComputedStyle(p).opacity + ' anims ' + document.getAnimations().map(a=>a.animationName+':'+a.playState+':'+Math.round(a.currentTime)).slice(0,6).join(',')})()`));
  }
  await c.shot('g9-look.png', false);
};
