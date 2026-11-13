/**
 * 数据与引擎自检（不依赖浏览器）
 * node scripts/verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");
const src = fs.readFileSync(path.join(root, "app.js"), "utf8");

const m = src.match(/const EVENTS = (\[[\s\S]*?\n\];)/);
if (!m) {
  console.error("EVENTS not found in app.js");
  process.exit(1);
}
const EVENTS = eval(m[1].replace(/;\s*$/, ""));

/* ---- 数据校验 ---- */
const ids = new Set();
let problems = 0;
for (const e of EVENTS) {
  if (ids.has(e.id)) { console.error("  duplicate id:", e.id); problems++; }
  ids.add(e.id);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(e.due)) { console.error("  bad due:", e.id, e.due); problems++; }
  if (typeof e.weight !== "number") { console.error("  bad weight:", e.id); problems++; }
  if (typeof e.leadDays !== "number") { console.error("  bad leadDays:", e.id); problems++; }
  if (!["submit", "happen"].includes(e.kind)) { console.error("  bad kind:", e.id); problems++; }
}
console.log(`events=${EVENTS.length}  problems=${problems}`);

/* ---- 引擎（与 app.js 保持一致） ---- */
const pad = (n) => String(n).padStart(2, "0");
const parseKey = (k) => {
  const [y, mo, d] = k.split("-").map(Number);
  return new Date(y, mo - 1, d, 12);
};
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (k, n) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);

const LEVELS = [
  ["clear", 0, "晴"],
  ["cloudy", 0.01, "多云"],
  ["overcast", 2, "阴"],
  ["rain", 4, "小雨"],
  ["storm", 7, "雷暴"],
  ["t3", 10, "三号风球"],
  ["t8", 13, "八号风球"],
  ["black", 18, "黑色暴雨"],
];
const levelFor = (s) => {
  let out = LEVELS[0];
  for (const l of LEVELS) if (s >= l[1]) out = l;
  return out;
};

const done = new Set();

function contribution(dayKey, e) {
  const d = daysBetween(dayKey, e.due.slice(0, 10));
  if (d < 0) return 0;
  if (d === 0) return e.weight * 1.3;
  if (d > e.leadDays) return 0;
  return e.weight * 0.85 * (1 - d / e.leadDays);
}

function severity(k) {
  let score = 0;
  let count = 0;
  for (const e of EVENTS) {
    if (done.has(e.id)) continue;
    score += contribution(k, e);
    if (e.due.slice(0, 10) === k) count += 1;
  }
  return { score: Math.round(score * 10) / 10, count };
}

console.log("\n--- 天气（2026-11-13 为比赛日） ---");
for (const day of ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-20", "2026-11-27"]) {
  const s = severity(day);
  console.log(`  ${day}  score=${String(s.score).padStart(5)}  count=${s.count}  -> ${levelFor(s.score)[2]}`);
}

console.log("\n--- 勾掉 11/13 的 5 个之后 ---");
["e05", "e06", "e07", "e08", "e09"].forEach((id) => done.add(id));
for (const day of ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-20"]) {
  const s = severity(day);
  console.log(`  ${day}  score=${String(s.score).padStart(5)}  count=${s.count}  -> ${levelFor(s.score)[2]}`);
}

console.log("\n--- 下一场风暴（从 11/13 起） ---");
for (let i = 1; i <= 30; i++) {
  const k = shift("2026-11-13", i);
  const s = severity(k);
  if (s.count > 0 && s.score >= 7) {
    console.log(`  ${k}  ${levelFor(s.score)[2]}  ${s.count} 个事项  还有 ${i} 天`);
    break;
  }
}
