// 실주소 점검: 서비스워커가 앱을 담아 두고, 인터넷을 끊어도 열리는지 + 악보가 열리는지
// SSV_URL=https://ultramsw67.github.io/score-viewer/ node cdp.js t02-live.js
const path = require('path');
module.exports = async c => {
  const U = process.env.SSV_URL, L = m => console.log(m);
  await c.send('DOM.enable'); await c.send('Network.enable'); await c.size(1280, 800, false);
  await c.go(U + '?a=' + Date.now()); await c.sleep(4000);
  L('sw ' + await c.ev(`navigator.serviceWorker.getRegistration().then(r=>!!(r&&r.active))`));
  L('cache ' + await c.ev(`caches.keys().then(k=>k.join(','))`));
  const doc = await c.send('DOM.getDocument'); const n = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#fileIn' });
  await c.send('DOM.setFileInputFiles', { nodeId: n.result.nodeId, files: [path.resolve(__dirname, 'pdf', 'a.pdf')] });
  await c.sleep(4000);
  await c.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await c.go(U); await c.sleep(2500);
  L('offline cards ' + await c.ev(`document.querySelectorAll('#grid .card').length`));
  await c.ev(`document.querySelector('#grid .card .th').click()`); await c.sleep(3000);
  L('offline render ' + await c.ev(`(()=>{const cv=document.querySelector('#stage canvas.pdf'); if(!cv) return -1; const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let k=0; for(let i=0;i<d.length;i+=4*97) if(d[i]<200) k++; return k})()`));
};
