/* 수드 도우미 (sood-guide.js) v1.1.0 — 2026-10-18 (1.1.0: 목소리 = 릴스와 같은 Gemini Sadaltager 녹음 파일, 없으면 기계 목소리)
   voiceDir: 'sood-voice/' 처럼 주면 문장마다 <voiceDir>/<voiceName(문장)>.mp3 를 재생. 녹음은 make-voice.py 로 만든다
   도움말 글은 따로 파일 sood-guide-helps.js 에 window.SOOD_HELPS = {...} 로 두면 make-voice.py 가 읽어 녹음한다
   도움말이 필요할 때 수드 캐릭터가 나와 말풍선으로 보여 주고 목소리로 읽어 준다.
   음악 앱 4개(리듬 연습·음감 연습·악보 보기·악보 연주) 공통. 원본은 바탕화면 05 음악/수드 모션 캐릭터 샘플/sood-guide.js
   쓰는 법:
     SoodGuide.init({
       char: 'conductor' | 'listener' | 'note',   // ① 지휘자 ② 헤드폰 ③ 8분음표
       helps: { 화면키: { title: '제목', lines: ['한 문장', '한 문장'] } },
       context: () => '화면키',          // 지금 화면이 무엇인지
       isBusy: () => false,              // 녹음·연주 중이면 true → 저절로 나오지 않고 읽지 않음
       idleSec: 30,                      // 이만큼 아무것도 안 하면 살짝 나와 "도와드릴까요?" (0 이면 끔)
       corner: 'left' | 'right',         // 부르는 단추 자리 (기본 left)
       bottom: 16                        // 아래 여백 px
     });
     SoodGuide.open('화면키')  // 어디서든 도움말 열기 (기존 도움말 단추에 연결)
     SoodGuide.close() / SoodGuide.stop()
*/
(function () {
  'use strict';
  if (window.SoodGuide) return;

  var C = { navy: '#1f2a44', suit: '#4a5062', suitd: '#373c4c', skin: '#ffd5b2', blush: '#ffa0a0',
    hair: '#463a36', ink: '#24202c', coral: '#ff7a6b', mint: '#4fc7b0', yel: '#ffc94d', blue: '#5b7fe0' };

  function face() {
    return '<rect x="134" y="196" width="32" height="34" rx="10" fill="' + C.skin + '"/>' +
      '<circle cx="150" cy="140" r="80" fill="' + C.skin + '"/>' +
      '<path d="M70 142 Q66 56 150 54 Q236 56 230 142 Q222 104 176 96 Q150 112 112 104 Q82 112 70 142Z" fill="' + C.hair + '"/>' +
      '<path d="M150 58 Q168 76 176 96" stroke="#5c4d47" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="104" cy="178" rx="13" ry="7" fill="' + C.blush + '" opacity=".8"/>' +
      '<ellipse cx="196" cy="178" rx="13" ry="7" fill="' + C.blush + '" opacity=".8"/>' +
      '<g class="sg-mouth"><path d="M136 184 Q150 198 164 184" stroke="' + C.ink + '" stroke-width="5" fill="none" stroke-linecap="round"/></g>' +
      '<rect x="98" y="126" width="48" height="40" rx="15" fill="none" stroke="' + C.ink + '" stroke-width="5"/>' +
      '<rect x="154" y="126" width="48" height="40" rx="15" fill="none" stroke="' + C.ink + '" stroke-width="5"/>' +
      '<path d="M146 142 L154 142" stroke="' + C.ink + '" stroke-width="5"/>';
  }
  function eyes() {
    return '<g class="sg-blink"><ellipse cx="122" cy="147" rx="9" ry="11" fill="' + C.ink + '"/><ellipse cx="178" cy="147" rx="9" ry="11" fill="' + C.ink + '"/>' +
      '<circle cx="125" cy="142" r="3.4" fill="#fff"/><circle cx="181" cy="142" r="3.4" fill="#fff"/></g>';
  }
  function suit() {
    return '<path d="M66 330 Q70 236 150 224 Q230 236 234 330Z" fill="' + C.suit + '"/>' +
      '<path d="M126 228 L150 276 L174 228Z" fill="#fff"/>' +
      '<path d="M126 228 L150 276 L118 300 L104 246Z" fill="' + C.suitd + '"/>' +
      '<path d="M174 228 L150 276 L182 300 L196 246Z" fill="' + C.suitd + '"/>' +
      '<path d="M144 234 L156 234 L160 278 L150 292 L140 278Z" fill="' + C.coral + '"/>';
  }
  var SVG = {
    conductor: '<svg viewBox="-10 20 340 320" aria-hidden="true">' +
      '<text class="sg-note" x="270" y="120" font-size="34" fill="' + C.navy + '">♪</text>' +
      '<text class="sg-note sg-d2" x="292" y="140" font-size="28" fill="' + C.coral + '">♫</text>' + suit() +
      '<path d="M92 252 Q70 290 96 318" stroke="' + C.suit + '" stroke-width="24" fill="none" stroke-linecap="round"/>' +
      '<g class="sg-arm"><path d="M212 252 Q246 236 262 206" stroke="' + C.suit + '" stroke-width="24" fill="none" stroke-linecap="round"/>' +
      '<line x1="264" y1="204" x2="312" y2="146" stroke="#f3e2bd" stroke-width="5" stroke-linecap="round"/><circle cx="312" cy="146" r="5" fill="#fff"/>' +
      '<circle cx="264" cy="204" r="14" fill="' + C.skin + '"/></g>' +
      '<g class="sg-head">' + face() + eyes() + '</g></svg>',
    listener: '<svg viewBox="-10 20 320 320" aria-hidden="true">' + suit() +
      '<g class="sg-head">' + face() +
      '<path d="M112 150 Q122 140 132 150" stroke="' + C.ink + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M168 150 Q178 140 188 150" stroke="' + C.ink + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M66 150 Q62 44 150 42 Q238 44 234 150" stroke="' + C.navy + '" stroke-width="13" fill="none" stroke-linecap="round"/>' +
      '<rect x="50" y="122" width="32" height="58" rx="14" fill="' + C.mint + '" stroke="' + C.navy + '" stroke-width="5"/>' +
      '<rect x="218" y="122" width="32" height="58" rx="14" fill="' + C.mint + '" stroke="' + C.navy + '" stroke-width="5"/>' +
      '<circle class="sg-wave" cx="260" cy="151" r="22"/><circle class="sg-wave sg-d2" cx="40" cy="151" r="22"/></g>' +
      '<text class="sg-note" x="252" y="96" font-size="30" fill="' + C.navy + '">♪</text></svg>',
    note: '<svg viewBox="-20 -30 340 370" aria-hidden="true"><defs><clipPath id="sg-hc"><ellipse cx="140" cy="250" rx="90" ry="66" transform="rotate(-18 140 250)"/></clipPath></defs>' +
      '<g class="sg-bounce"><rect x="218" y="46" width="12" height="190" rx="6" fill="' + C.navy + '"/>' +
      '<path class="sg-flag" d="M226 46 Q290 70 282 140 Q272 104 228 96Z" fill="' + C.navy + '"/>' +
      '<ellipse cx="140" cy="250" rx="90" ry="66" transform="rotate(-18 140 250)" fill="' + C.skin + '"/>' +
      '<g clip-path="url(#sg-hc)"><path d="M40 262 Q64 206 132 210 Q178 214 192 196 Q210 206 240 190 L240 110 L40 110Z" fill="' + C.hair + '"/></g>' +
      '<ellipse cx="140" cy="250" rx="90" ry="66" transform="rotate(-18 140 250)" fill="none" stroke="' + C.navy + '" stroke-width="6"/>' +
      '<ellipse cx="88" cy="272" rx="11" ry="6" fill="' + C.blush + '" opacity=".85"/><ellipse cx="178" cy="262" rx="11" ry="6" fill="' + C.blush + '" opacity=".85"/>' +
      '<rect x="88" y="226" width="40" height="34" rx="13" fill="none" stroke="' + C.ink + '" stroke-width="5"/>' +
      '<rect x="138" y="220" width="40" height="34" rx="13" fill="none" stroke="' + C.ink + '" stroke-width="5"/><path d="M128 240 L138 238" stroke="' + C.ink + '" stroke-width="5"/>' +
      '<g class="sg-blink"><ellipse cx="108" cy="244" rx="7.5" ry="9" fill="' + C.ink + '"/><ellipse cx="158" cy="238" rx="7.5" ry="9" fill="' + C.ink + '"/>' +
      '<circle cx="110.5" cy="240" r="2.8" fill="#fff"/><circle cx="160.5" cy="234" r="2.8" fill="#fff"/></g>' +
      '<g class="sg-mouth"><path d="M122 276 Q136 288 150 272" stroke="' + C.ink + '" stroke-width="5" fill="none" stroke-linecap="round"/></g>' +
      '<path d="M120 304 L140 296 L160 304 L140 312Z M120 294 L120 314 L138 304Z M160 294 L160 314 L142 304Z" fill="' + C.coral + '"/><circle cx="140" cy="304" r="5" fill="#e0574a"/></g></svg>'
  };

  var CSS = '' +
    '.sg-wrap,.sg-peek{word-break:keep-all;overflow-wrap:anywhere}' +
    '.sg-fab{position:fixed;z-index:2147483000;width:62px;height:62px;border-radius:50%;border:3px solid #fff;background:#e6ecff;box-shadow:0 4px 14px rgba(31,42,68,.28);padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;touch-action:manipulation}' +
    '.sg-fab svg{width:52px;height:52px;margin-top:2px}' +
    '.sg-fab .sg-q{position:absolute;top:-4px;right:-4px;width:22px;height:22px;border-radius:50%;background:' + C.coral + ';color:#fff;font:800 14px/22px "Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif;text-align:center}' +
    '.sg-fab.sg-nudge{animation:sgNudge .9s ease-in-out 3}' +
    '.sg-peek{position:fixed;z-index:2147483000;max-width:230px;background:#fff;color:' + C.ink + ';border:2px solid ' + C.navy + ';border-radius:16px;padding:10px 14px;font:700 16px/1.45 "Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer}' +
    '.sg-wrap{position:fixed;inset:0;z-index:2147483001;background:rgba(20,24,40,.42);display:flex;align-items:flex-end;justify-content:center;padding:12px}' +
    '.sg-panel{position:relative;width:100%;max-width:560px;max-height:calc(100% - 12px);display:flex;flex-direction:column;background:#fff;color:' + C.ink + ';border-radius:24px;box-shadow:0 12px 40px rgba(0,0,0,.3);overflow:hidden;animation:sgUp .35s cubic-bezier(.2,.9,.3,1.2)}' +
    '.sg-top{display:flex;align-items:flex-end;gap:10px;padding:14px 16px 0;background:linear-gradient(180deg,#e6ecff,#fff)}' +
    '.sg-char{width:118px;height:118px;flex:none}.sg-char svg{width:100%;height:100%;overflow:visible}' +
    '.sg-title{font:800 20px/1.3 "Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif;padding-bottom:12px}' +
    '.sg-title small{display:block;font-size:13px;font-weight:600;color:#5f6578;margin-top:3px}' +
    '.sg-body{overflow:auto;padding:6px 18px 4px}' +
    '.sg-line{font:500 18px/1.6 "Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif;padding:8px 10px;margin:4px 0;border-radius:12px;transition:background .2s,color .2s}' +
    '.sg-line.sg-on{background:#fff3d6;color:#000;font-weight:700;box-shadow:inset 4px 0 0 ' + C.coral + '}' +
    '.sg-btns{display:flex;gap:8px;padding:12px 16px 16px;flex-wrap:wrap}' +
    '.sg-btns button{flex:1 1 30%;min-height:48px;border:0;border-radius:14px;font:700 16px "Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif;cursor:pointer;touch-action:manipulation}' +
    '.sg-play{background:' + C.navy + ';color:#fff}.sg-stopb{background:#e9ecf4;color:' + C.ink + '}.sg-close{background:#fff;color:' + C.ink + ';border:2px solid #d5dae6!important}' +
    '.sg-novoice{font:500 14px/1.5 "Pretendard Variable",Pretendard,sans-serif;color:#5f6578;padding:0 18px}' +
    '.sg-wm{position:absolute;right:16px;top:12px;font:800 11px "Pretendard Variable",Pretendard,sans-serif;letter-spacing:.2em;opacity:.16}' +
    '.sg-blink{transform-box:fill-box;transform-origin:center;animation:sgBlink 4s infinite}' +
    '.sg-head{transform-origin:150px 225px;animation:sgNod .5s ease-in-out infinite}' +
    '.sg-c-listener .sg-head{animation:sgSway 2.4s ease-in-out infinite}' +
    '.sg-arm{transform-origin:212px 252px;animation:sgConduct 2s cubic-bezier(.45,0,.3,1) infinite}' +
    '.sg-note{font-family:serif;font-weight:700;opacity:0;animation:sgRise 2s ease-out infinite}.sg-d2{animation-delay:.8s!important}' +
    '.sg-wave{fill:none;stroke:' + C.mint + ';stroke-width:4;transform-box:fill-box;transform-origin:center;animation:sgWave 1.6s ease-out infinite}' +
    '.sg-bounce{transform-origin:150px 320px;animation:sgBounce 1s cubic-bezier(.3,0,.4,1) infinite}' +
    '.sg-flag{transform-origin:226px 46px;animation:sgFlag .5s ease-in-out infinite alternate}' +
    '.sg-talk .sg-mouth{transform-box:fill-box;transform-origin:center;animation:sgTalk .22s ease-in-out infinite alternate}' +
    '@keyframes sgBlink{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}' +
    '@keyframes sgNod{0%,100%{transform:translateY(0)}50%{transform:rotate(-2deg) translateY(4px)}}' +
    '@keyframes sgSway{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}' +
    '@keyframes sgConduct{0%{transform:rotate(-24deg)}25%{transform:rotate(16deg)}50%{transform:rotate(-6deg)}75%{transform:rotate(28deg)}100%{transform:rotate(-24deg)}}' +
    '@keyframes sgRise{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(-30px,-90px)}}' +
    '@keyframes sgWave{0%{opacity:.9;transform:scale(.5)}100%{opacity:0;transform:scale(1.8)}}' +
    '@keyframes sgBounce{0%{transform:translateY(0) scale(1.12,.86)}15%{transform:translateY(-10px) scale(.94,1.08)}50%{transform:translateY(-50px)}85%{transform:translateY(-6px) scale(.96,1.05)}100%{transform:translateY(0) scale(1.12,.86)}}' +
    '@keyframes sgFlag{from{transform:rotate(-6deg)}to{transform:rotate(10deg)}}' +
    '@keyframes sgTalk{from{transform:scaleY(.6)}to{transform:scaleY(1.5)}}' +
    '@keyframes sgUp{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}' +
    '@keyframes sgNudge{0%,100%{transform:none}30%{transform:translateY(-10px) rotate(-8deg)}60%{transform:translateY(0) rotate(6deg)}}' +
    '@media print{.sg-fab,.sg-peek,.sg-wrap{display:none!important}}';

  var opt, fab, peek, wrap, curKey, idleT, nudged = {}, hidden = false, speaking = false, lineEls = [], ko = null;
  var synth = window.speechSynthesis;

  function pickVoice() {
    if (!synth) return null;
    var vs = synth.getVoices().filter(function (v) { return /^ko/i.test(v.lang); });
    if (!vs.length) return null;
    // 자연스러운 목소리 먼저 (Google·Microsoft 온라인·Yuna)
    var pref = ['Google', 'Online', 'Natural', 'Yuna', 'SunHi', 'InJoon', 'Heami'];
    for (var i = 0; i < pref.length; i++) {
      for (var j = 0; j < vs.length; j++) if (vs[j].name.indexOf(pref[i]) >= 0) return vs[j];
    }
    return vs[0];
  }
  if (synth) { ko = pickVoice(); synth.onvoiceschanged = function () { ko = pickVoice(); }; }

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function busy() { try { return !!(opt.isBusy && opt.isBusy()); } catch (e) { return false; } }
  function ctx() { try { return (opt.context && opt.context()) || Object.keys(opt.helps)[0]; } catch (e) { return Object.keys(opt.helps)[0]; } }
  function place(node, extra) {
    node.style.bottom = (opt.bottom + (extra || 0)) + 'px';
    node.style[opt.corner === 'right' ? 'right' : 'left'] = '16px';
  }

  // 녹음 파일 이름 = 문장 글자의 FNV-1a 32비트 (make-voice.py 와 같은 계산) — 글을 고치면 새 녹음이 필요함을 알 수 있다
  function voiceName(t) {
    var b = unescape(encodeURIComponent(t)), h = 0x811c9dc5;
    for (var i = 0; i < b.length; i++) { h ^= b.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  var audio = null, run = 0;

  function stop() {
    speaking = false; run++;
    if (synth) synth.cancel();
    if (audio) { audio.pause(); audio.onended = audio.onerror = null; }
    lineEls.forEach(function (l) { l.classList.remove('sg-on'); });
    if (wrap) wrap.querySelector('.sg-char').classList.remove('sg-talk');
    var b = wrap && wrap.querySelector('.sg-play'); if (b) b.textContent = '🔊 듣기';
  }

  function next(i, my) { if (speaking && my === run) setTimeout(function () { if (my === run) speakFrom(i + 1, my); }, 250); }

  // 기계 목소리 (녹음 파일이 없을 때만)
  function ttsLine(i, my) {
    if (!synth) { next(i, my); return; }
    var u = new SpeechSynthesisUtterance(lineEls[i].textContent);
    u.lang = 'ko-KR'; if (ko) u.voice = ko; u.rate = opt.rate; u.pitch = 1.05;
    u.onend = function () { next(i, my); };
    u.onerror = function () { next(i, my); };
    synth.speak(u);
  }

  function speakFrom(i, my) {
    if (!speaking || my !== run || i >= lineEls.length) { if (my === run) stop(); return; }
    if (busy()) { stop(); return; }
    lineEls.forEach(function (l, k) { l.classList.toggle('sg-on', k === i); });
    lineEls[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (!opt.voiceDir) { ttsLine(i, my); return; }
    // 수드 목소리 녹음 (릴스와 같은 Gemini Sadaltager) — 같은 audio 하나를 계속 써야 아이폰이 이어서 재생함
    // 파일이 없으면 error 이벤트와 play() 거절이 둘 다 오므로 한 번만 기계 목소리로 넘긴다
    var fell = false;
    function fallback() { if (fell || my !== run) return; fell = true; audio.onended = audio.onerror = null; ttsLine(i, my); }
    audio.onended = function () { if (!fell) next(i, my); };
    audio.onerror = fallback;
    audio.src = opt.voiceDir.replace(/\/?$/, '/') + voiceName(lineEls[i].textContent) + '.mp3';
    var pr = audio.play(); if (pr && pr.catch) pr.catch(function (e) { if (e && e.name !== 'AbortError') fallback(); });
  }

  function play() {
    if (!synth && !opt.voiceDir) return;
    stop(); speaking = true;
    if (opt.voiceDir && !audio) { audio = new Audio(); audio.preload = 'auto'; }
    wrap.querySelector('.sg-char').classList.add('sg-talk');
    wrap.querySelector('.sg-play').textContent = '🔊 읽는 중';
    // 크롬은 오래 말하면 멈추는 일이 있어 문장 하나씩 끊어 읽는다
    speakFrom(0, run);
  }

  function close() {
    stop();
    if (wrap) { wrap.remove(); wrap = null; }
    if (fab) fab.focus({ preventScroll: true });
  }

  function open(key, auto) {
    hidePeek();
    key = key || ctx();
    var h = opt.helps[key]; if (!h) { key = Object.keys(opt.helps)[0]; h = opt.helps[key]; }
    curKey = key;
    if (wrap) close();
    wrap = el('div', 'sg-wrap');
    wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', '수드 도우미: ' + h.title);
    var p = el('div', 'sg-panel sg-c-' + opt.char);
    p.appendChild(el('span', 'sg-wm', '수트와후드'));
    var top = el('div', 'sg-top');
    top.appendChild(el('div', 'sg-char', SVG[opt.char]));
    top.appendChild(el('div', 'sg-title', esc(h.title) + '<small>수드가 읽어 드려요. 글자를 같이 따라 읽어 보세요.</small>'));
    p.appendChild(top);
    var body = el('div', 'sg-body');
    lineEls = h.lines.map(function (t) { var d = el('div', 'sg-line'); d.textContent = t; body.appendChild(d); return d; });
    p.appendChild(body);
    if (!synth && !opt.voiceDir) p.appendChild(el('p', 'sg-novoice', '이 기기·브라우저는 소리 내어 읽기를 지원하지 않아요. 글로 읽어 주세요.'));
    var btns = el('div', 'sg-btns');
    var bp = el('button', 'sg-play', '🔊 듣기'); bp.type = 'button'; bp.onclick = play; if (!synth && !opt.voiceDir) bp.disabled = true;
    var bs = el('button', 'sg-stopb', '■ 그만'); bs.type = 'button'; bs.onclick = stop;
    var bc = el('button', 'sg-close', '✕ 닫기'); bc.type = 'button'; bc.onclick = close;
    btns.appendChild(bp); btns.appendChild(bs); btns.appendChild(bc);
    p.appendChild(btns);
    wrap.appendChild(p);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    document.body.appendChild(wrap);
    bc.focus({ preventScroll: true });
    // 단추를 눌러 연 경우(사용자 동작)는 바로 읽기 — 아이폰은 사용자 동작 안에서만 소리가 남
    if (!auto && !busy() && opt.autoSpeak) play();
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function hidePeek() { if (peek) { peek.remove(); peek = null; } if (fab) fab.classList.remove('sg-nudge'); }

  function nudge() {
    var k = ctx();
    if (hidden || wrap || peek || nudged[k] || busy() || document.hidden) return;
    nudged[k] = 1;
    fab.classList.add('sg-nudge');
    peek = el('div', 'sg-peek', esc((opt.helps[k] && opt.helps[k].peek) || '도움이 필요하세요? 저를 누르면 읽어 드려요 🎵'));
    place(peek, 74);
    peek.onclick = function () { open(k); };
    document.body.appendChild(peek);
    setTimeout(hidePeek, 9000);
  }

  function resetIdle() {
    if (!opt.idleSec) return;
    clearTimeout(idleT);
    idleT = setTimeout(nudge, opt.idleSec * 1000);
  }

  function init(o) {
    opt = Object.assign({ char: 'note', helps: {}, idleSec: 30, corner: 'left', bottom: 16, rate: 0.95, autoSpeak: true }, o || {});
    if (!document.getElementById('sg-style')) { var st = el('style'); st.id = 'sg-style'; st.textContent = CSS; document.head.appendChild(st); }
    fab = el('button', 'sg-fab', SVG.note.replace('viewBox="-20 -30 340 370"', 'viewBox="36 30 270 300"') + '<span class="sg-q">?</span>');
    fab.type = 'button'; fab.title = '수드 도우미 — 도움말 듣기'; fab.setAttribute('aria-label', '수드 도우미: 도움말 듣기');
    place(fab);
    fab.onclick = function () { open(); };
    document.body.appendChild(fab);
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, function () { hidePeek(); resetIdle(); }, { passive: true, capture: true });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && wrap) close(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
    resetIdle();
    return api;
  }

  var api = { init: init, open: open, close: close, stop: stop,
    setVisible: function (v) { hidden = !v; if (fab) fab.style.display = v ? '' : 'none'; if (!v) { hidePeek(); } },
    voiceName: voiceName,
    get speaking() { return speaking; }, version: '1.1.0' };
  window.SoodGuide = api;
})();
