/* ============================================================
   Storm Semester — 压力引擎（纯逻辑，无 DOM）
   浏览器里挂到 window.StormEngine；Node 里可 require 做测试。
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StormEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------------- 类型预设 ---------------- */

  // kind: submit = 你交东西出去；happen = 事情落到你头上
  // curve: 压力随「进入准备窗口之后」上升的形状
  const TYPES = {
    lab:       { label: '实验 / 作业', kind: 'submit', weight: 2, leadDays: 7,  curve: 'steady' },
    per:       { label: '汇报 / 演示', kind: 'submit', weight: 3, leadDays: 5,  curve: 'step'   },
    interview: { label: '课上抽查',   kind: 'happen', weight: 3, leadDays: 3,  curve: 'steep'  },
    quiz:      { label: '小测',       kind: 'happen', weight: 3, leadDays: 5,  curve: 'steep'  },
    exam:      { label: '考试',       kind: 'happen', weight: 4, leadDays: 10, curve: 'long'   },
    custom:    { label: '自定义',     kind: 'submit', weight: 2, leadDays: 7,  curve: 'steady' },
  };

  const CURVES = {
    steady: (x) => x,                                   // 平稳：进入窗口就开始爬
    steep:  (x) => x * x * x,                           // 陡升：最后几天才上来
    step:   (x) => Math.floor(x * 3) / 3,               // 台阶：一级一级跳
    long:   (x) => Math.pow(x, 0.6),                    // 长坡：提前很久就有感觉
  };

  const CURVE_LABELS = {
    steady: '平稳', steep: '陡升', step: '台阶', long: '长坡',
  };

  /* ---------------- 天气等级 ---------------- */

  const LEVELS = [
    { key: 'clear',    min: 0,    label: '晴',       icon: '☀️' },
    { key: 'cloudy',   min: 0.01, label: '多云',     icon: '⛅' },
    { key: 'overcast', min: 2,    label: '阴',       icon: '☁️' },
    { key: 'rain',     min: 4,    label: '小雨',     icon: '🌧️' },
    { key: 'storm',    min: 7,    label: '雷暴',     icon: '⛈️' },
    { key: 't3',       min: 10,   label: '三号风球', icon: '🌀', signal: 'T3' },
    { key: 't8',       min: 13,   label: '八号风球', icon: '🌪️', signal: 'T8' },
    { key: 'black',    min: 18,   label: '黑色暴雨', icon: '🌑', signal: 'BLACK' },
  ];

  const DOW = ['日', '一', '二', '三', '四', '五', '六'];

  /* ---------------- 日期 ---------------- */

  const pad = (n) => String(n).padStart(2, '0');

  function parseKey(k) {
    const [y, m, d] = String(k).split('-').map(Number);
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
  function dowOf(k) { return '周' + DOW[parseKey(k).getDay()]; }
  function mdOf(k) {
    const d = parseKey(k);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  function todayKey() { return toKey(new Date()); }

  /* ---------------- 预设查表 ---------------- */

  function presetOf(type) { return TYPES[type] || TYPES.custom; }
  function kindOf(e) { return e.kind || presetOf(e.type).kind; }
  function leadOf(e) { return typeof e.leadDays === 'number' ? e.leadDays : presetOf(e.type).leadDays; }
  function weightOf(e) { return typeof e.weight === 'number' ? e.weight : presetOf(e.type).weight; }
  function curveOf(e) { return CURVES[e.curve || presetOf(e.type).curve] || CURVES.steady; }

  /* ---------------- 核心：单日压力 ---------------- */

  /**
   * 一个事项在某一天贡献多少压力。
   * 截止当天最重（1.3 倍）；准备窗口内按曲线从 0 升到 0.85 倍；窗口外为 0。
   */
  function contribution(dayKey, e) {
    const d = daysBetween(dayKey, String(e.due).slice(0, 10));
    if (d < 0) return 0;                     // 已经过去
    if (d === 0) return weightOf(e) * 1.3;   // 当天最重
    const lead = leadOf(e);
    if (d > lead) return 0;                  // 还没进入准备窗口
    const x = 1 - d / lead;                  // 0 = 窗口起点，1 = 截止日
    return weightOf(e) * 0.85 * curveOf(e)(x);
  }

  function severity(dayKey, events, doneIds) {
    let score = 0;
    let count = 0;
    for (const e of events) {
      if (doneIds && doneIds.has(e.id)) continue;
      score += contribution(dayKey, e);
      if (String(e.due).slice(0, 10) === dayKey) count += 1;
    }
    return { score: Math.round(score * 10) / 10, count };
  }

  function levelFor(score) {
    let out = LEVELS[0];
    for (const l of LEVELS) if (score >= l.min) out = l;
    return out;
  }

  function weatherOn(dayKey, events, doneIds) {
    const s = severity(dayKey, events, doneIds);
    return { ...s, level: levelFor(s.score) };
  }

  /* ---------------- 下一场风暴 ---------------- */

  function nextStorm(today, events, doneIds, horizon) {
    const days = horizon || 30;
    for (let i = 1; i <= days; i++) {
      const k = shift(today, i);
      const w = weatherOn(k, events, doneIds);
      if (w.count > 0 && w.score >= 7) return { key: k, inDays: i, ...w };
    }
    for (let i = 1; i <= days; i++) {
      const k = shift(today, i);
      const w = weatherOn(k, events, doneIds);
      if (w.count > 0) return { key: k, inDays: i, ...w };
    }
    return null;
  }

  /* ---------------- 主次排序 ---------------- */

  /**
   * 每件事用「截止日 − 准备窗口」倒推一个「本该开始的日子」。
   * 已经过了那天的排在前面，同组内按离截止远近排。
   */
  function priorities(today, events, doneIds) {
    return events
      .filter((e) => !(doneIds && doneIds.has(e.id)))
      .filter((e) => String(e.due).slice(0, 10) >= today)
      .map((e) => {
        const due = String(e.due).slice(0, 10);
        const daysLeft = daysBetween(today, due);
        const startBy = shift(due, -leadOf(e));
        return {
          ...e,
          kind: kindOf(e),
          dueKey: due,
          daysLeft,
          startBy,
          lateBy: Math.max(0, daysBetween(startBy, today)),
        };
      })
      .sort((a, b) => {
        if ((a.lateBy > 0) !== (b.lateBy > 0)) return a.lateBy > 0 ? -1 : 1;
        if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
        return weightOf(b) - weightOf(a);
      });
  }

  /* ---------------- 远期模糊 ---------------- */

  const FUZZY_AFTER = 14;

  function confidenceFor(dayKey, today) {
    const d = daysBetween(today, dayKey);
    if (d < 0) return 'past';
    if (d <= FUZZY_AFTER) return 'precise';
    return 'fuzzy';
  }

  /* ---------------- 工具 ---------------- */

  function listDays(fromKey, count) {
    const out = [];
    for (let i = 0; i < count; i++) out.push(shift(fromKey, i));
    return out;
  }

  function weekOf(today) {
    const dow = (parseKey(today).getDay() + 6) % 7; // 周一 = 0
    const monday = shift(today, -dow);
    return listDays(monday, 7);
  }

  return {
    TYPES, CURVES, CURVE_LABELS, LEVELS, DOW, FUZZY_AFTER,
    presetOf, kindOf, leadOf, weightOf, curveOf,
    contribution, severity, levelFor, weatherOn,
    nextStorm, priorities, confidenceFor,
    parseKey, toKey, shift, daysBetween, dowOf, mdOf, todayKey,
    listDays, weekOf,
  };
});
