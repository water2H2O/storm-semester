/* ============================================================
   Storm Semester — 学期风暴
   把一学期的截止日期变成天气。
   ============================================================ */

/* ---------------- 数据 ---------------- */
// 想固定演示日期就改这里，例如 "2026-11-13"
const DEMO_TODAY = null;

const EVENTS = [
  { id:"e17", course:"B", title:"课上抽查 In-class interview", due:"2026-11-10T10:00:00+08:00", type:"interview", kind:"happen", weight:3, leadDays:3,
    checklist:["过一遍 Lab 代码","准备 2 个能讲清楚的点"] },
  { id:"e18", course:"C", title:"期中考试 Midterm Exam", due:"2026-11-11T09:30:00+08:00", type:"exam", kind:"happen", weight:4, leadDays:10,
    checklist:["复习 Ch1-4","做一份 past paper","整理错题"] },
  { id:"e19", course:"E", title:"University EN2 汇报", due:"2026-11-17T23:59:00+08:00", type:"per", kind:"submit", weight:3, leadDays:5 },

  { id:"e01", course:"A", title:"Lab 5",                    due:"2026-11-01T23:59:00+08:00", type:"lab", kind:"submit", weight:2, leadDays:7 },
  { id:"e02", course:"B", title:"Assignment 1",             due:"2026-11-06T23:59:00+08:00", type:"lab", kind:"submit", weight:3, leadDays:7 },
  { id:"e03", course:"C", title:"Programming Assignment",   due:"2026-11-08T23:59:00+08:00", type:"lab", kind:"submit", weight:3, leadDays:7 },
  { id:"e04", course:"A", title:"Lab 6",                    due:"2026-11-08T23:59:00+08:00", type:"lab", kind:"submit", weight:2, leadDays:7 },
  { id:"e05", course:"D", title:"小组项目提交 Group Project", due:"2026-11-13T17:00:00+08:00", type:"per", kind:"submit", weight:5, leadDays:7 },
  { id:"e06", course:"D", title:"相似度检查 Similarity Index", due:"2026-11-13T17:00:00+08:00", type:"lab", kind:"submit", weight:1, leadDays:3 },
  { id:"e07", course:"D", title:"报告提交 Report file",      due:"2026-11-13T17:00:00+08:00", type:"lab", kind:"submit", weight:4, leadDays:7 },
  { id:"e08", course:"B", title:"个人项目 Individual Project", due:"2026-11-13T23:59:00+08:00", type:"lab", kind:"submit", weight:4, leadDays:7 },
  { id:"e09", course:"B", title:"提交箱 Submission Box",     due:"2026-11-13T23:59:00+08:00", type:"lab", kind:"submit", weight:1, leadDays:3 },
  { id:"e10", course:"A", title:"Lab 7",                    due:"2026-11-15T23:59:00+08:00", type:"lab", kind:"submit", weight:2, leadDays:7 },
  { id:"e11", course:"D", title:"迟交报告 Late Report",      due:"2026-11-20T17:00:00+08:00", type:"lab", kind:"submit", weight:3, leadDays:7 },
  { id:"e12", course:"B", title:"提交箱 Submission Box",     due:"2026-11-20T23:59:00+08:00", type:"lab", kind:"submit", weight:1, leadDays:3 },
  { id:"e13", course:"B", title:"提交箱 Submission Box",     due:"2026-11-20T23:59:00+08:00", type:"lab", kind:"submit", weight:1, leadDays:3 },
  { id:"e14", course:"C", title:"提交箱 Submission Box",     due:"2026-11-20T23:59:00+08:00", type:"lab", kind:"submit", weight:1, leadDays:3 },
  { id:"e15", course:"C", title:"Tutorial 提交",             due:"2026-11-27T17:00:00+08:00", type:"lab", kind:"submit", weight:2, leadDays:7 },
  { id:"e16", course:"C", title:"Tutorial 提交箱",           due:"2026-11-27T23:59:00+08:00", type:"lab", kind:"submit", weight:1, leadDays:3 },
];

/* ---------------- 等级表 ---------------- */
const LEVELS = [
  { key:"clear",    min:0,    label:"晴",       icon:"☀️" },
  { key:"cloudy",   min:0.01, label:"多云",     icon:"⛅" },
  { key:"overcast", min:2,    label:"阴",       icon:"☁️" },
  { key:"rain",     min:4,    label:"小雨",     icon:"🌧️" },
  { key:"storm",    min:7,    label:"雷暴",     icon:"⛈️" },
  { key:"t3",       min:10,   label:"三号风球", icon:"🌀", signal:"T3" },
  { key:"t8",       min:13,   label:"八号风球", icon:"🌪️", signal:"T8" },
  { key:"black",    min:18,   label:"黑色暴雨", icon:"🌑", signal:"BLACK" },
];

const DOW_CN = ["日","一","二","三","四","五","六"];

/* ---------------- 日期工具 ---------------- */
const pad = (n) => String(n).padStart(2, "0");

function parseKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
function toKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function shift(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}
function daysBetween(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / 86400000);
}
function dowOf(k) { return "周" + DOW_CN[parseKey(k).getDay()]; }
function mdOf(k) {
  const d = parseKey(k);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function todayKey() {
  if (DEMO_TODAY) return DEMO_TODAY;
  return toKey(new Date());
}

/* ---------------- 引擎 ---------------- */
const doneIds = new Set();

function contribution(dayKey, e) {
  const dueKey = e.due.slice(0, 10);
  const d = daysBetween(dayKey, dueKey);
  if (d < 0) return 0;                       // 已经过去
  if (d === 0) return e.weight * 1.3;        // 当天最重
  if (d > e.leadDays) return 0;              // 还没进入准备窗口
  return e.weight * 0.85 * (1 - d / e.leadDays);
}

function severity(dayKey) {
  let score = 0;
  let count = 0;
  for (const e of EVENTS) {
    if (doneIds.has(e.id)) continue;
    score += contribution(dayKey, e);
    if (e.due.slice(0, 10) === dayKey) count += 1;
  }
  return { score: Math.round(score * 10) / 10, count };
}

function levelFor(score) {
  let out = LEVELS[0];
  for (const l of LEVELS) if (score >= l.min) out = l;
  return out;
}

function weatherOn(dayKey) {
  const s = severity(dayKey);
  return { ...s, level: levelFor(s.score) };
}

/** 下一场风暴：未来 30 天第一个雷暴及以上的日子 */
function nextStorm(today) {
  for (let i = 1; i <= 30; i++) {
    const k = shift(today, i);
    const w = weatherOn(k);
    if (w.count > 0 && w.score >= 7) return { key: k, inDays: i, ...w };
  }
  for (let i = 1; i <= 30; i++) {
    const k = shift(today, i);
    const w = weatherOn(k);
    if (w.count > 0) return { key: k, inDays: i, ...w };
  }
  return null;
}

/** 主次排序：按「本该哪天开始」 */
function priorities(today) {
  return EVENTS
    .filter((e) => !doneIds.has(e.id))
    .filter((e) => e.due.slice(0, 10) >= today)
    .map((e) => {
      const due = e.due.slice(0, 10);
      const daysLeft = daysBetween(today, due);
      const startBy = shift(due, -e.leadDays);
      return { ...e, dueKey: due, daysLeft, startBy, lateBy: Math.max(0, daysBetween(startBy, today)) };
    })
    .sort((a, b) => {
      if ((a.lateBy > 0) !== (b.lateBy > 0)) return a.lateBy > 0 ? -1 : 1;
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return b.weight - a.weight;
    });
}

/* ---------------- 持久化 ---------------- */
const STORE_KEY = "storm-semester:done";

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) arr.forEach((id) => doneIds.add(id));
  } catch (_) {}
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...doneIds]));
  } catch (_) {}
}

/* ---------------- 渲染 ---------------- */
const $ = (id) => document.getElementById(id);

function render() {
  const today = todayKey();
  const w = weatherOn(today);
  document.body.dataset.weather = w.level.key;

  /* --- 今日 --- */
  $("heroIcon").textContent = w.level.icon;
  $("heroTitle").textContent = w.level.label;
  $("heroDate").textContent = `${today} ${dowOf(today)}`;
  $("heroScore").textContent = `压力 ${w.score.toFixed(1)}`;

  const storm = nextStorm(today);
  if (w.count > 0) {
    $("heroSub").textContent = `今天有 ${w.count} 个事项到期`;
  } else if (storm) {
    $("heroSub").textContent = `今天没有截止，但风暴在 ${storm.inDays} 天后`;
  } else {
    $("heroSub").textContent = "今天没有截止，未来 30 天也没有";
  }

  /* --- 下一场风暴 --- */
  const nextSection = $("nextSection");
  if (storm) {
    nextSection.style.display = "";
    $("nextIcon").textContent = storm.level.icon;
    $("nextTitle").textContent = `${storm.level.label} · ${dowOf(storm.key)} ${mdOf(storm.key)}`;
    $("nextSub").textContent = `${storm.count} 个事项 · 还有 ${storm.inDays} 天`;
    $("nextBadge").textContent = storm.level.signal || "";
  } else {
    nextSection.style.display = "none";
  }

  /* --- 现在做这一件 --- */
  const list = priorities(today);
  const card = $("focusCard");
  if (!list.length) {
    card.innerHTML = `<div class="focus-empty">这一轮没有剩下的事了。出去走走吧。</div>`;
  } else {
    card.innerHTML = focusTemplate(list[0], today);
  }

  /* --- 本周 --- */
  const dow = (parseKey(today).getDay() + 6) % 7; // 周一 = 0
  const monday = shift(today, -dow);
  const weekCells = [];
  for (let i = 0; i < 7; i++) {
    const k = shift(monday, i);
    const ww = weatherOn(k);
    const isToday = k === today;
    weekCells.push(`
      <div class="week-cell${isToday ? " today" : ""}">
        <div class="wc-dow">${dowOf(k).replace("周", "")}</div>
        <div class="wc-icon">${ww.level.icon}</div>
        <div class="wc-name">${ww.count > 0 ? ww.count + " 件" : ww.level.label}</div>
      </div>`);
  }
  $("weekStrip").innerHTML = weekCells.join("");

  /* --- 两周时间轴 --- */
  const tl = [];
  for (let i = 0; i < 14; i++) {
    const k = shift(today, i);
    const ww = weatherOn(k);
    const fuzzy = i > 14;
    const isToday = i === 0;
    tl.push(`
      <div class="tl${isToday ? " today" : ""}${fuzzy ? " fuzzy" : ""}">
        ${ww.count > 0 ? `<span class="tl-count">${ww.count}</span>` : ""}
        <div class="tl-dow">${isToday ? "今天" : dowOf(k).replace("周", "")}</div>
        <div class="tl-date">${mdOf(k)}</div>
        <div class="tl-icon">${ww.level.icon}</div>
        <div class="tl-name">${ww.level.label}</div>
      </div>`);
  }
  $("timeline").innerHTML = tl.join("");

  /* --- 城市悬浮条（静止态展示） --- */
  $("cityIcon").textContent = w.level.icon;
  $("cityTitle").textContent = w.level.label;
  $("citySub").textContent =
    w.count > 0 ? `今天有 ${w.count} 个事项到期` : "今天没有截止";
  $("cityNext").textContent = storm
    ? `下一场风暴：${storm.level.label} · ${dowOf(storm.key)} ${mdOf(storm.key)} · 还有 ${storm.inDays} 天`
    : "未来 30 天风平浪静";

  /* --- 驱动 3D 场景 --- */
  if (window.STORM_SCENE && window.STORM_SCENE.setWeather) {
    window.STORM_SCENE.setWeather(w.level.key);
  }
}

function focusTemplate(p, today) {
  const isHappen = p.kind === "happen";
  const kindLabel = isHappen ? "发生型" : "提交型";
  const when = p.daysLeft === 0 ? "今天" : `${p.daysLeft} 天后`;
  const late =
    p.lateBy > 0
      ? `<span class="late">· 已经晚了 ${p.lateBy} 天</span>`
      : `· 可以 ${mdOf(p.startBy)} 再开始`;

  const checklist = (p.checklist || [])
    .map(
      (c, i) => `
      <li>
        <input type="checkbox" data-item="${i}" />
        <span>${c}</span>
      </li>`,
    )
    .join("");

  const action = isHappen
    ? `<div class="progress"><i style="width:0%"></i></div>
       <div class="focus-meta" style="margin:0">准备度 0% · 它不需要你交东西，但需要你准备好</div>`
    : `<button class="btn primary" data-done="${p.id}">标记完成</button>`;

  return `
    <div class="focus-head">
      <span class="tag ${p.kind}">${kindLabel}</span>
      <span class="focus-meta" style="margin:0">课程 ${p.course}</span>
    </div>
    <h2 class="focus-title">${p.title}</h2>
    <div class="focus-meta">${dowOf(p.dueKey)} ${mdOf(p.dueKey)} · ${when} ${late}</div>
    ${checklist ? `<ul class="checklist">${checklist}</ul>` : ""}
    ${action}`;
}

/* ---------------- 城市态 / 数据态 ---------------- */
function setMode(mode) {
  if (document.body.dataset.mode === mode) return;
  document.body.dataset.mode = mode;
  if (mode === "data") $("appMain").scrollTop = 0;
  if (window.STORM_SCENE && window.STORM_SCENE.setMode) window.STORM_SCENE.setMode(mode);
}

function bindModeGestures() {
  const main = $("appMain");
  $("cityEnter").addEventListener("click", () => setMode("data"));
  $("cityBack").addEventListener("click", () => setMode("city"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMode("city");
  });

  // 滚轮：城市态往下滚 → 升起面板；面板在顶部时往上滚 → 回到城市
  let wheelLock = 0;
  window.addEventListener("wheel", (e) => {
    const now = performance.now();
    if (now < wheelLock) return;
    const mode = document.body.dataset.mode;
    if (mode === "city" && e.deltaY > 20) {
      setMode("data");
      wheelLock = now + 700;
    } else if (mode === "data" && e.deltaY < -20 && main.scrollTop <= 0) {
      setMode("city");
      wheelLock = now + 700;
    }
  }, { passive: true });

  // 触屏：上滑升起，面板在顶部时下滑收回
  let startY = null;
  window.addEventListener("touchstart", (e) => { startY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (startY === null) return;
    const dy = e.changedTouches[0].clientY - startY;
    startY = null;
    const mode = document.body.dataset.mode;
    if (mode === "city" && dy < -50) setMode("data");
    else if (mode === "data" && dy > 70 && main.scrollTop <= 0) setMode("city");
  }, { passive: true });
}

/* ---------------- 交互 ---------------- */
function bindEvents() {
  document.addEventListener("click", (ev) => {
    const doneBtn = ev.target.closest("[data-done]");
    if (doneBtn) {
      const id = doneBtn.getAttribute("data-done");
      const el = EVENTS.find((e) => e.id === id);
      doneIds.add(id);
      saveState();
      toast(`「${el ? el.title : id}」完成 —— 云散了`);
      render();
      return;
    }
  });

  // 准备度进度（发生型）
  document.addEventListener("change", (ev) => {
    const box = ev.target.closest('.checklist input[type="checkbox"]');
    if (!box) return;
    const card = box.closest(".focus-card");
    if (!card) return;
    const all = card.querySelectorAll('.checklist input[type="checkbox"]');
    const checked = card.querySelectorAll('.checklist input[type="checkbox"]:checked');
    const pct = all.length ? Math.round((checked.length / all.length) * 100) : 0;
    const bar = card.querySelector(".progress > i");
    if (bar) bar.style.width = pct + "%";
    const note = card.querySelector(".progress + .focus-meta");
    if (note) note.textContent = `准备度 ${pct}% · 它不需要你交东西，但需要你准备好`;
  });
}

let toastTimer = null;
function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------------- 雨滴 ---------------- */
function initRain() {
  const rain = $("rain");
  if (!rain || rain.childElementCount) return;
  for (let i = 0; i < 44; i++) {
    const s = document.createElement("span");
    s.style.left = Math.random() * 106 - 3 + "%";
    s.style.animationDuration = 0.55 + Math.random() * 0.7 + "s";
    s.style.animationDelay = -Math.random() * 2 + "s";
    s.style.opacity = 0.2 + Math.random() * 0.5;
    rain.appendChild(s);
  }
}

/* ---------------- 启动 ---------------- */
function boot() {
  if (location.search.includes("reset")) {
    doneIds.clear();
    saveState();
  } else {
    loadState();
  }
  // 有 3D 场景时雨和闪电交给 3D，CSS 那层只作降级
  if (window.STORM_SCENE) document.body.classList.add("has-3d");
  else initRain();
  bindEvents();
  bindModeGestures();
  render();
  if (location.search.includes("data")) setMode("data"); // ?data 直接打开面板，方便演示和截图

  // 调试方便
  window.__storm = { EVENTS, doneIds, weatherOn, nextStorm, priorities, render, LEVELS };
}

boot();
