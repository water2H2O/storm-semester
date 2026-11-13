/**
 * 引擎自检（不依赖浏览器）
 * node scripts/verify.mjs
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const E = require(path.join(root, 'engine.js'));
const S = require(path.join(root, 'store.js'));

const events = S.SEED_EVENTS;
const done = new Set();
let fail = 0;

function ok(name, cond, detail) {
  if (cond) console.log(`  ✓ ${name}`);
  else { console.log(`  ✗ ${name}  ${detail || ''}`); fail++; }
}

/* ---------- 数据完整性 ---------- */
console.log('\n[数据]');
const ids = new Set();
let dup = 0;
for (const e of events) {
  if (ids.has(e.id)) dup++;
  ids.add(e.id);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(e.due)) { console.log('  bad due', e.id, e.due); fail++; }
  if (!E.TYPES[e.type]) { console.log('  unknown type', e.id, e.type); fail++; }
}
ok(`事项 ${events.length} 条、id 唯一`, dup === 0);
ok('类型全部已注册', events.every((e) => !!E.TYPES[e.type]));

/* ---------- 天气 ---------- */
console.log('\n[11 月天气]');
for (const d of ['2026-11-09', '2026-11-11', '2026-11-13', '2026-11-14', '2026-11-20', '2026-11-27']) {
  const w = E.weatherOn(d, events, done);
  console.log(`  ${d}  score=${String(w.score).padStart(5)}  ${w.count} 件  -> ${w.level.label}`);
}
const w13 = E.weatherOn('2026-11-13', events, done);
ok('11/13 是黑色暴雨', w13.level.key === 'black', `实际 ${w13.level.label} (${w13.score})`);
ok('11/13 有 5 个到期', w13.count === 5, `实际 ${w13.count}`);

/* ---------- 完成后放晴 ---------- */
const doneAll = new Set(['e05', 'e06', 'e07', 'e08', 'e09']);
const after = E.weatherOn('2026-11-13', events, doneAll);
console.log(`\n[勾掉 11/13 的 5 件后] ${w13.score} → ${after.score}  (${after.level.label})`);
ok('勾掉后当天明显好转', after.score < w13.score * 0.5);

/* ---------- 曲线 ---------- */
console.log('\n[类型曲线：同样是 3 天前]');
const mk = (type, extra) => Object.assign({ id: 'x', type, due: '2026-11-20T23:59:00+08:00' }, extra || {});
const pairs = [
  ['lab', mk('lab', { weight: 3 })],
  ['exam', mk('exam', { weight: 3, leadDays: 10 })],
  ['quiz', mk('quiz', { weight: 3, leadDays: 5 })],
  ['per', mk('per', { weight: 3, leadDays: 5 })],
];
for (const [name, e] of pairs) {
  const c = E.contribution('2026-11-17', e);
  console.log(`  ${name.padEnd(5)} 权重 3 → ${c.toFixed(2)}`);
}
ok('考试比实验更早产生压力', E.contribution('2026-11-17', pairs[1][1]) > E.contribution('2026-11-17', pairs[0][1]));
ok('陡升曲线在窗口初期更轻', E.contribution('2026-11-16', pairs[2][1]) < E.contribution('2026-11-17', pairs[2][1]) + 0.001);
ok('窗口外为 0', E.contribution('2026-11-01', mk('lab')) === 0);
ok('截止当天最重', E.contribution('2026-11-20', mk('lab', { weight: 2 })) === 2 * 1.3);

/* ---------- 主次排序 ---------- */
console.log('\n[今天(11/13)该动什么]');
const P = E.priorities('2026-11-13', events, done);
P.slice(0, 4).forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.title}  ${p.daysLeft} 天后  晚了 ${p.lateBy} 天`);
});
ok('排序只含未来事项', P.every((p) => p.daysLeft >= 0));
ok('晚了更多的排在前面或同期', P[0].lateBy >= P[P.length - 1].lateBy || P[0].daysLeft <= P[P.length - 1].daysLeft);

/* ---------- 下一场风暴 ---------- */
const storm = E.nextStorm('2026-11-13', events, done);
console.log(`\n[下一场风暴] ${storm ? storm.key + ' ' + storm.level.label + ' · ' + storm.inDays + ' 天后' : '无'}`);
ok('能找出下一场风暴', !!storm);

/* ---------- 远期模糊 ---------- */
console.log('\n[远期模糊]');
ok('14 天内精确', E.confidenceFor('2026-11-27', '2026-11-13') === 'precise');
ok('15 天后模糊', E.confidenceFor('2026-11-28', '2026-11-13') === 'fuzzy');

console.log(fail === 0 ? '\n全部通过 ✅' : `\n${fail} 项失败 ❌`);
process.exit(fail === 0 ? 0 : 1);
