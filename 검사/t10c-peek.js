// 말풍선 진단 (실주소): SSV_URL=... node cdp.js t10c-peek.js
module.exports = async (c) => {
  const U = process.env.SSV_URL || 'http://127.0.0.1:8781/', ev = c.ev;
  await c.size(1280, 800, false);
  await c.go(U + '?sgidle=2&t=' + Date.now());
  for (let i = 0; i < 6; i++) {
    await c.sleep(1000);
    console.log(i, await ev(`JSON.stringify({peek:!!document.querySelector('.sg-peek'), wrap:!!document.querySelector('.sg-wrap'), dlg:[...document.querySelectorAll('dialog[open]')].map(d=>d.id), hidden:document.hidden, viewer:document.querySelector('#viewer').classList.contains('on'), guide:SSV.OPT.guide, met:SSV.MET.on, T:[!!SSV.T.rec,!!SSV.T.stream,!!SSV.T.tone], ctx:SSV.sgCtx(), q:location.search})`));
  }
};
