/**
 * Storm Semester — 演示视频自动录制
 *
 * 用法：
 *   node scripts/record-demo.mjs
 *
 * 前提：
 *   - OBS Studio 已安装（默认 D:\obs-studio）；脚本会自动开 obs-websocket 并拉起 OBS
 *   - 显示器分辨率建议 2560x1600 或更宽（Chrome 以 kiosk 全屏录制）
 *   - 录制期间 Chrome 会全屏接管桌面约 100 秒，不要动鼠标键盘
 *
 * 产出：C:\Users\<你>\Videos\<时间戳>.mp4（1920x1080 / 30fps / 约 28 MB / 96 秒）
 *
 * 它做的事：启动 kiosk Chrome（?today=2026-11-13&lang=en）→ 注入字幕层与标题/片尾卡
 * → 只采集该 Chrome 窗口（不录桌面）→ 按分镜驱动交互 → 停录。
 */
import * as OBS from './obs-client.mjs';
import { spawn } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const fs = await import('node:fs');
const CHROME = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!CHROME) { console.error('找不到 Chrome / Edge'); process.exit(1); }

const REC_DIR = process.env.USERPROFILE + '\\Videos';
const PROFILE = process.env.TEMP + '\\stormrec-' + Date.now();
const PAGE = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/') + '?today=2026-11-13&lang=en';
const PORT = 9335;

const log = (...a) => console.log('[' + new Date().toISOString().slice(11, 19) + ']', ...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 覆盖层样式 ---------- */
const CSS = [
  '::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}',
  'html{scrollbar-width:none!important;-ms-overflow-style:none!important}',
  '.timeline-scroll{scrollbar-width:none!important}',
  '#recCap{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);max-width:78vw;',
  'padding:13px 28px;border-radius:999px;background:rgba(6,5,12,.88);color:#f4f6fa;',
  'font-size:31px;line-height:1.3;font-weight:500;text-align:center;z-index:2147483000;',
  'opacity:0;transition:opacity .3s ease;pointer-events:none;white-space:nowrap;',
  'border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 34px rgba(0,0,0,.5);',
  'font-family:-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif}',
  '#recCap.on{opacity:1}',
  '#recCard{position:fixed;inset:0;z-index:2147483001;display:grid;place-items:center;',
  'text-align:center;opacity:0;transition:opacity .45s ease;pointer-events:none;',
  'background:radial-gradient(circle at 50% 45%,rgba(26,19,42,.86),rgba(4,3,8,.97) 70%);',
  'font-family:-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif}',
  '#recCard.on{opacity:1}',
  '#recCard .t{font-size:84px;font-weight:700;letter-spacing:-.02em;color:#fff}',
  '#recCard .s{margin-top:18px;font-size:32px;color:rgba(255,255,255,.74)}',
  '#recCard .m{margin-top:32px;font-size:25px;color:rgba(255,255,255,.55)}',
  '#recCard .u{margin-top:12px;font-size:28px;color:#9fd0ff;font-family:ui-monospace,Consolas,monospace}',
].join('');

const chrome = spawn(CHROME, [
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + PROFILE,
  '--kiosk', '--no-first-run', '--no-default-browser-check',
  '--disable-features=Translate,MediaRouter',
  '--autoplay-policy=no-user-gesture-required',
  PAGE,
], { stdio: 'ignore' });
log('chrome pid', chrome.pid);

/* ---------- CDP ---------- */
let wsUrl = null;
for (let i = 0; i < 60; i++) {
  await wait(300);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
  } catch {}
}
if (!wsUrl) { console.error('无法连接 Chrome 调试端口'); chrome.kill(); process.exit(1); }

const sock = new WebSocket(wsUrl);
let id = 0; const pend = new Map();
sock.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
await new Promise((r) => sock.addEventListener('open', r));
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pend.set(n, res); sock.send(JSON.stringify({ id: n, method, params })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r && r.exceptionDetails) { log('EVAL ERR:', (r.exceptionDetails.exception?.description || '').slice(0, 140)); return undefined; }
  return r?.result?.value;
};
await send('Runtime.enable');

await wait(1200);
const injected = await ev('(function(){' +
  'if(document.getElementById("recCap"))return "already";' +
  'var st=document.createElement("style");st.textContent=' + JSON.stringify(CSS) + ';' +
  'document.head.appendChild(st);' +
  'var cap=document.createElement("div");cap.id="recCap";document.body.appendChild(cap);' +
  'var cd=document.createElement("div");cd.id="recCard";document.body.appendChild(cd);' +
  'return "ok";})()');
log('overlay inject:', injected);
if (injected !== 'ok') { chrome.kill(); process.exit(1); }

const setCap = (text) => ev('(function(){var c=document.getElementById("recCap");if(!c)return "nocap";' +
  (text ? 'c.textContent=' + JSON.stringify(text) + ';c.classList.add("on");' : 'c.classList.remove("on");') +
  'return "ok";})()');

const card = (html, on) => ev('(function(){var c=document.getElementById("recCard");if(!c)return "nocard";' +
  (on ? 'c.innerHTML=' + JSON.stringify(html) + ';c.classList.add("on");' : 'c.classList.remove("on");') +
  'return "ok";})()');

/* ---------- OBS ---------- */
OBS.enableWebSocket({ auth: false });
await OBS.launchObs();
const { request } = await OBS.connectObs();
await request('SetVideoSettings', { baseWidth: 1920, baseHeight: 1080, outputWidth: 1920, outputHeight: 1080, fpsNumerator: 30, fpsDenominator: 1 });

const props = await request('GetInputPropertiesListPropertyItems', { inputName: '窗口采集', propertyName: 'window' });
const win = props.propertyItems.find((p) => /Storm Semester/.test(p.itemName) && /chrome|edge/i.test(p.itemName));
if (!win) { console.error('OBS 窗口清单里找不到 Chrome，请确认浏览器已启动'); chrome.kill(); process.exit(1); }
await request('SetInputSettings', { inputName: '窗口采集', inputSettings: { window: win.itemValue, method: 2, capture_cursor: false }, overlay: true });

const items = await request('GetSceneItemList', { sceneName: '场景 3' });
for (const it of items.sceneItems) {
  if (it.inputKind === 'monitor_capture') await request('SetSceneItemEnabled', { sceneName: '场景 3', sceneItemId: it.sceneItemId, sceneItemEnabled: false });
  if (it.inputKind === 'window_capture') {
    await request('SetSceneItemEnabled', { sceneName: '场景 3', sceneItemId: it.sceneItemId, sceneItemEnabled: true });
    await request('SetSceneItemTransform', { sceneName: '场景 3', sceneItemId: it.sceneItemId,
      sceneItemTransform: { positionX: 0, positionY: 0, alignment: 5, boundsAlignment: 0,
        boundsType: 'OBS_BOUNDS_SCALE_INNER', boundsWidth: 1920, boundsHeight: 1080 } });
  }
}
log('capturing:', win.itemName);

await wait(2600);
const before = new Set(fs.readdirSync(REC_DIR).filter((f) => f.endsWith('.mp4')));
await request('StartRecord');
log('REC START');

try {
  await card('<div><div class="t">Storm Semester</div><div class="s">Your semester has a weather forecast</div></div>', true);
  await wait(3300);
  await card('', false);

  await setCap('Five deadlines land on the same Friday.'); await wait(3800);
  await setCap('My calendar lists every date.'); await wait(3400);
  await setCap('It never tells me what to start today.'); await wait(3400);
  await setCap('So I turned my semester into a weather forecast.'); await wait(3000);

  await ev('document.getElementById("cityEnter").click()'); await wait(1700);
  await setCap('Every unfinished deadline adds pressure to the days before it.'); await wait(4300);
  await setCap('Clear skies, or a black rainstorm.'); await wait(3600);
  await setCap('Next storm: the first high-load day in thirty days.'); await wait(3600);

  await setCap('One task, chosen by preparation window, not just the deadline.'); await wait(4400);
  await setCap('The rule is simple and visible. Not a black box.'); await wait(3400);

  await ev('document.querySelector(".week").scrollIntoView({block:"center"})'); await wait(1400);
  await setCap('The whole semester at a glance.'); await wait(3400);
  await ev('document.querySelector(".timeline").scrollIntoView({block:"center"})'); await wait(1300);
  await setCap('The further out, the vaguer it gets — as a forecast should.'); await wait(3500);

  await ev('document.querySelector(".manage").scrollIntoView({block:"start"})'); await wait(1300);
  await setCap('Every item carries a weight and a preparation window.'); await wait(3600);
  await ev('(function(){var s=document.querySelector("[data-weight]");if(s)s.scrollIntoView({block:"center"});return "ok";})()'); await wait(1100);
  await setCap('Too heavy? Drag it. The forecast redraws immediately.'); await wait(2800);
  await ev('(function(){var s=document.querySelector("[data-weight]");if(!s)return "none";s.value=5.5;s.dispatchEvent(new Event("input",{bubbles:true}));return s.value;})()');
  await wait(1600);
  await setCap('Every schedule is different.'); await wait(2800);

  await ev('document.getElementById("appMain").scrollTop=0'); await wait(800);
  await setCap('Now the part that matters: finishing the work.'); await wait(2900);
  for (let i = 0; i < 5; i++) {
    const ok = await ev('(function(){var b=document.querySelector("#focusCard [data-done]");if(!b)return "none";b.click();return "clicked";})()');
    log('complete', i + 1, ok);
    if (i === 0) await setCap('Each completed deadline removes its pressure.');
    if (i === 2) await setCap('The city clears as I work through them.');
    await wait(3050);
  }
  await setCap('The forecast becomes feedback.'); await wait(2700);

  await ev('(function(){var m=document.querySelector(".manage");if(m)m.scrollIntoView({block:"start"});return "ok";})()');
  await setCap('Calendars import in the browser — no account, no backend.'); await wait(2900);
  await ev('(function(){var b=document.querySelector("#sceneSwitch, #citySwitch [data-city=\\"generic\\"]");if(b)b.click();return "ok";})()');
  await setCap('A generic island, or Hong Kong with its warning signals.'); await wait(3000);
  await ev('(function(){var b=document.querySelector("#citySwitch [data-city=\\"hongkong\\"]");if(b)b.click();return "ok";})()');
  await wait(1700);
  await ev('document.getElementById("cityBack").click()'); await wait(2300);

  await setCap('');
  await card('<div><div class="t">Storm Semester · 学期风暴</div>' +
    '<div class="s">See the workload building before it hits.</div>' +
    '<div class="u">github.com/water2H2O/storm-semester</div>' +
    '<div class="m">BUHACK 2.0 · EdTech · HKBU Coding Club</div></div>', true);
  await wait(4600);
} catch (e) {
  log('ERROR during drive:', e.message);
}

await request('StopRecord');
log('REC STOPPED');
await wait(2000);
const after = fs.readdirSync(REC_DIR).filter((f) => f.endsWith('.mp4') && !before.has(f));
for (const f of after) log('FILE:', f, (statSync(REC_DIR + '\\' + f).size / 1048576).toFixed(1) + ' MB');
if (after.length) console.log('RESULT=' + REC_DIR + '\\' + after[0]);

chrome.kill();
process.exit(0);
