/* obs-websocket v5 最小客户端 + OBS 启停 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';

const EXE_CANDIDATES = [
  'D:\\obs-studio\\bin\\64bit\\obs64.exe',
  'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
  'C:\\Program Files (x86)\\obs-studio\\bin\\64bit\\obs64.exe',
];
import { existsSync as _exists } from 'node:fs';
export const OBS_EXE = EXE_CANDIDATES.find((p) => _exists(p)) || EXE_CANDIDATES[0];
export const OBS_DIR = OBS_EXE.slice(0, OBS_EXE.lastIndexOf(String.fromCharCode(92)));
export const WSCFG = process.env.APPDATA + '\\obs-studio\\plugin_config\\obs-websocket\\config.json';

export function enableWebSocket({ auth = false } = {}) {
  if (existsSync(WSCFG) && !existsSync(WSCFG + '.stormbak')) copyFileSync(WSCFG, WSCFG + '.stormbak');
  const cfg = existsSync(WSCFG) ? JSON.parse(readFileSync(WSCFG, 'utf8')) : {};
  cfg.server_enabled = true;
  cfg.auth_required = auth;
  cfg.server_port = cfg.server_port || 4455;
  cfg.first_load = false;
  writeFileSync(WSCFG, JSON.stringify(cfg, null, 2), 'utf8');
  return cfg;
}

export function restoreWebSocket() {
  if (existsSync(WSCFG + '.stormbak')) {
    copyFileSync(WSCFG + '.stormbak', WSCFG);
    return true;
  }
  return false;
}

export async function launchObs() {
  const proc = spawn(OBS_EXE, ['--minimize-to-tray', '--disable-shutdown-check', '--multi'], {
    cwd: OBS_DIR, stdio: 'ignore', detached: true,
  });
  proc.unref();
  return proc;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function connectObs({ port = 4455, timeoutMs = 45000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) break;
    } catch {}
    await sleep(500);
  }
  const sock = new WebSocket(`ws://127.0.0.1:${port}`);
  const pending = new Map();
  let identResolve, identReject;
  const identified = new Promise((res, rej) => { identResolve = res; identReject = rej; });
  let rpcVer = 1;

  sock.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.op === 0) {
      const d = { rpcVersion: 1 };
      if (m.d.authentication) d.authentication = m.d.authentication.challenge; // 未启用鉴权时不会走到
      sock.send(JSON.stringify({ op: 1, d }));
    } else if (m.op === 2) {
      rpcVer = m.d.negotiatedRpcVersion || 1;
      sock.send(JSON.stringify({ op: 3, d: {} })); // 订阅事件
      identResolve(m.d);
    } else if (m.op === 7) {
      const id = m.d.requestId;
      if (pending.has(id)) { pending.get(id)(m.d); pending.delete(id); }
    }
  });
  sock.addEventListener('error', (e) => identReject(new Error('ws error ' + (e.message || ''))));

  await new Promise((res, rej) => {
    sock.addEventListener('open', res);
    sock.addEventListener('error', rej);
    setTimeout(() => rej(new Error('ws open timeout')), 20000);
  });
  await Promise.race([identified, sleep(15000).then(() => { throw new Error('identify timeout'); })]);

  let n = 0;
  const request = (requestType, requestData = {}) => new Promise((res, rej) => {
    const id = 'r' + (++n);
    pending.set(id, (d) => d.requestStatus && d.requestStatus.result
      ? res(d.responseData)
      : rej(new Error(requestType + ' failed: ' + (d.requestStatus?.comment || 'unknown') + ' code=' + d.requestStatus?.code)));
    sock.send(JSON.stringify({ op: 6, d: { requestType, requestId: id, requestData } }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(requestType + ' timeout')); } }, 20000);
  });

  return { sock, request, rpcVer };
}

export { sleep };
