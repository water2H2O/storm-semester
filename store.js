/* ============================================================
   Storm Semester — 本地存储
   事项、完成状态、准备清单、城市选择全部存在 localStorage。
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StormStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KEY = 'storm-semester:v2';

  /* ---------------- 种子数据（真实的 11 月日程，已脱敏） ---------------- */

  const SEED_EVENTS = [
    { id: 'e17', course: 'B', title: '课上抽查 In-class interview', due: '2026-11-10T10:00:00+08:00', type: 'interview',
      checklist: ['过一遍 Lab 代码', '准备 2 个能讲清楚的点'] },
    { id: 'e18', course: 'C', title: '期中考试 Midterm Exam', due: '2026-11-11T09:30:00+08:00', type: 'exam',
      checklist: ['复习 Ch1-4', '做一份 past paper', '整理错题'] },
    { id: 'e19', course: 'E', title: 'University EN2 汇报', due: '2026-11-17T23:59:00+08:00', type: 'per' },

    { id: 'e01', course: 'A', title: 'Lab 5',                      due: '2026-11-01T23:59:00+08:00', type: 'lab',    weight: 2, leadDays: 7 },
    { id: 'e02', course: 'B', title: 'Assignment 1',                due: '2026-11-06T23:59:00+08:00', type: 'lab',    weight: 3, leadDays: 7 },
    { id: 'e03', course: 'C', title: 'Programming Assignment',       due: '2026-11-08T23:59:00+08:00', type: 'lab',    weight: 3, leadDays: 7 },
    { id: 'e04', course: 'A', title: 'Lab 6',                      due: '2026-11-08T23:59:00+08:00', type: 'lab',    weight: 2, leadDays: 7 },
    { id: 'e05', course: 'D', title: '小组项目提交 Group Project',    due: '2026-11-13T17:00:00+08:00', type: 'per',    weight: 5, leadDays: 7 },
    { id: 'e06', course: 'D', title: '相似度检查 Similarity Index',  due: '2026-11-13T17:00:00+08:00', type: 'custom', weight: 1, leadDays: 3 },
    { id: 'e07', course: 'D', title: '报告提交 Report file',        due: '2026-11-13T17:00:00+08:00', type: 'lab',    weight: 4, leadDays: 7 },
    { id: 'e08', course: 'B', title: '个人项目 Individual Project',   due: '2026-11-13T23:59:00+08:00', type: 'lab',    weight: 4, leadDays: 7 },
    { id: 'e09', course: 'B', title: '提交箱 Submission Box',        due: '2026-11-13T23:59:00+08:00', type: 'custom', weight: 1, leadDays: 3 },
    { id: 'e10', course: 'A', title: 'Lab 7',                      due: '2026-11-15T23:59:00+08:00', type: 'lab',    weight: 2, leadDays: 7 },
    { id: 'e11', course: 'D', title: '迟交报告 Late Report',         due: '2026-11-20T17:00:00+08:00', type: 'lab',    weight: 3, leadDays: 7 },
    { id: 'e12', course: 'B', title: '提交箱 Submission Box',        due: '2026-11-20T23:59:00+08:00', type: 'custom', weight: 1, leadDays: 3 },
    { id: 'e13', course: 'B', title: '提交箱 Submission Box',        due: '2026-11-20T23:59:00+08:00', type: 'custom', weight: 1, leadDays: 3 },
    { id: 'e14', course: 'C', title: '提交箱 Submission Box',        due: '2026-11-20T23:59:00+08:00', type: 'custom', weight: 1, leadDays: 3 },
    { id: 'e15', course: 'C', title: 'Tutorial 提交',                due: '2026-11-27T17:00:00+08:00', type: 'lab',    weight: 2, leadDays: 7 },
    { id: 'e16', course: 'C', title: 'Tutorial 提交箱',              due: '2026-11-27T23:59:00+08:00', type: 'custom', weight: 1, leadDays: 3 },
  ];

  /* ---------------- 种子活动（demo，可删可改） ---------------- */

  const SEED_ACTIVITIES = [
    { id: 'a01', title: 'BUHACK 2.0 · 48 小时线上黑客松', date: '2026-11-13', time: '10:00',
      place: '线上 · HKBU Coding Club', note: '我们自己也在里面', demo: true },
    { id: 'a02', title: 'CCL 联课 · 业界分享会', date: '2026-11-18', time: '16:30',
      place: 'AAB 学术大楼', note: '要签到，记 CCL 时数', demo: true },
    { id: 'a03', title: '校园招聘日 Career Fair', date: '2026-11-24', time: '11:00',
      place: '大学会堂', note: '记得带简历', demo: true },
  ];

  /* ---------------- 英文文案（种子数据是演示数据，跟随界面语言） ---------------- */

  const EN_TITLES = {
    e17: 'In-class interview', e18: 'Midterm Exam', e19: 'University EN2 Presentation',
    e01: 'Lab 5', e02: 'Assignment 1', e03: 'Programming Assignment', e04: 'Lab 6',
    e05: 'Group Project submission', e06: 'Similarity Index check', e07: 'Report file',
    e08: 'Individual Project', e09: 'Submission Box', e10: 'Lab 7', e11: 'Late Report',
    e12: 'Submission Box', e13: 'Submission Box', e14: 'Submission Box',
    e15: 'Tutorial submission', e16: 'Tutorial submission box',
  };

  const EN_CHECKS = {
    e17: ['Skim the lab code', 'Prepare two points you can explain clearly'],
    e18: ['Review Ch1–4', 'Do one past paper', 'Go over the mistakes'],
  };

  const EN_ACTIVITIES = {
    a01: { title: 'BUHACK 2.0 · 48-hour online hackathon', place: 'Online · HKBU Coding Club', note: "We're taking part too" },
    a02: { title: 'CCL lecture · industry sharing', place: 'AAB Academic Building', note: 'Attendance is taken — counts toward CCL hours' },
    a03: { title: 'Career Fair', place: 'University Hall', note: 'Bring your CV' },
  };

  /* 繁體中文种子文案 */
  const HANT_TITLES = {
    e17: '課上抽查 In-class interview', e18: '期中考試 Midterm Exam', e19: 'University EN2 匯報',
    e01: 'Lab 5', e02: 'Assignment 1', e03: 'Programming Assignment', e04: 'Lab 6',
    e05: '小組項目提交 Group Project', e06: '相似度檢查 Similarity Index', e07: '報告提交 Report file',
    e08: '個人項目 Individual Project', e09: '提交箱 Submission Box', e10: 'Lab 7', e11: '遲交報告 Late Report',
    e12: '提交箱 Submission Box', e13: '提交箱 Submission Box', e14: '提交箱 Submission Box',
    e15: 'Tutorial 提交', e16: 'Tutorial 提交箱',
  };

  const HANT_CHECKS = {
    e17: ['過一遍 Lab 程式碼', '準備 2 個能講清楚的點'],
    e18: ['複習 Ch1–4', '做一份 past paper', '整理錯題'],
  };

  const HANT_ACTIVITIES = {
    a01: { title: 'BUHACK 2.0 · 48 小時線上黑客松', place: '線上 · HKBU Coding Club', note: '我們自己也在裡面' },
    a02: { title: 'CCL 聯課 · 業界分享會', place: 'AAB 學術大樓', note: '要簽到，記 CCL 時數' },
    a03: { title: '校園招聘日 Career Fair', place: '大學會堂', note: '記得帶簡歷' },
  };

  const BASE_EVENTS = clone(SEED_EVENTS);
  const BASE_ACTIVITIES = clone(SEED_ACTIVITIES);

  /**
   * 切换种子数据的展示语言。只改 title / checklist / 活动文案，
   * 不动权重、准备窗口这些用户可能已经调过的字段。
   */
  function applyLocale(locale) {
    const l = String(locale || 'en').toLowerCase();
    const en = l.startsWith('en');
    const hant = l === 'zh-hant' || l === 'zh-tw' || l === 'zh-hk' || l === 'zh-mo';

    SEED_EVENTS.forEach((e, i) => {
      const base = BASE_EVENTS[i];
      const titles = en ? EN_TITLES : hant ? HANT_TITLES : null;
      const checks = en ? EN_CHECKS : hant ? HANT_CHECKS : null;
      e.title = (titles && titles[e.id]) || base.title;
      if (base.checklist) {
        e.checklist = (checks && checks[e.id]) ? checks[e.id].slice() : base.checklist.slice();
      } else {
        delete e.checklist;
      }
    });

    SEED_ACTIVITIES.forEach((a, i) => {
      const base = BASE_ACTIVITIES[i];
      const map = en ? EN_ACTIVITIES : hant ? HANT_ACTIVITIES : null;
      const pick = (map && map[a.id]) || base;
      a.title = pick.title;
      a.place = pick.place;
      a.note = pick.note;
    });
  }

  /** 供 store 内部取词，避免种子数据语言跟界面语言脱节 */
  function tr(key, fallback) {
    const i18n = typeof globalThis !== 'undefined' ? globalThis.StormI18N : null;
    if (i18n && typeof i18n.t === 'function') {
      const v = i18n.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  const DEFAULTS = {
    events: null,      // null = 用种子数据
    done: [],          // 已完成的事项 id
    checks: {},        // { eventId: [bool, ...] } 准备清单勾选
    city: 'hongkong',  // 当前城市
    activities: null,  // null = 用种子数据（线下活动，不影响天气）
  };

  let state = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    let saved = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (_) {}
    state = Object.assign({}, DEFAULTS, saved || {});
    if (!Array.isArray(state.done)) state.done = [];
    if (!state.checks || typeof state.checks !== 'object') state.checks = {};
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }

  function reset() {
    state = clone(DEFAULTS);
    save();
    return state;
  }

  function events() {
    return state.events && state.events.length ? state.events : clone(SEED_EVENTS);
  }

  /* ---------------- 线下活动（不影响天气，只决定港口有没有船） ---------------- */

  function activities() {
    return state.activities && state.activities.length ? state.activities : clone(SEED_ACTIVITIES);
  }

  function saveActivities(list) {
    state.activities = list;
    save();
  }

  function addActivity(payload) {
    const list = activities().slice();
    list.push({
      id: 'act' + Date.now().toString(36),
      title: payload.title || tr('act.untitled', '未命名活动'),
      date: payload.date,
      time: payload.time || '',
      place: payload.place || '',
      note: payload.note || '',
      demo: false,
    });
    saveActivities(list);
  }

  function removeActivity(id) {
    saveActivities(activities().filter((a) => a.id !== id));
  }

  /**
   * 船只状态：活动前 3 天进港，当天停在码头，结束后离港。
   * returning { phase: 'away' | 'incoming' | 'docked' | 'leaving', activity, inDays }
   */
  function portState(today) {
    const list = activities().slice().sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = list.filter((a) => a.date >= today);
    if (!upcoming.length) return { phase: 'away', activity: null, inDays: null };

    const next = upcoming[0];
    const inDays = Math.round(
      (new Date(next.date + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400000,
    );

    if (inDays === 0) return { phase: 'docked', activity: next, inDays: 0 };
    if (inDays <= 3) return { phase: 'incoming', activity: next, inDays };
    return { phase: 'away', activity: next, inDays };
  }

  function doneIds() { return new Set(state.done); }

  function markDone(id) {
    if (!state.done.includes(id)) state.done.push(id);
    save();
  }

  function undoDone(id) {
    state.done = state.done.filter((x) => x !== id);
    save();
  }

  function isDone(id) { return state.done.includes(id); }

  function checksOf(id) {
    return state.checks[id] || [];
  }

  function setChecks(id, arr) {
    state.checks[id] = arr;
    save();
  }

  function progressOf(event) {
    const list = event.checklist || [];
    if (!list.length) return 0;
    const got = checksOf(event.id);
    return Math.round((list.filter((_, i) => got[i]).length / list.length) * 100);
  }

  /** 用户改动后，把完整事项列表落盘 */
  function saveEvents(list) {
    state.events = list;
    save();
  }

  /** 新增：套用类型预设 */
  function addEvent(payload, engine) {
    const list = events().slice();
    const preset = engine.presetOf(payload.type);
    const nextId = 'u' + Date.now().toString(36) + Math.floor(Math.random() * 100);
    list.push({
      id: nextId,
      course: payload.course || '?',
      title: payload.title || tr('ev.untitled', '未命名事项'),
      due: payload.due,
      type: payload.type,
      kind: preset.kind,
      weight: typeof payload.weight === 'number' ? payload.weight : preset.weight,
      leadDays: typeof payload.leadDays === 'number' ? payload.leadDays : preset.leadDays,
      checklist: payload.checklist || [],
    });
    saveEvents(list);
    return nextId;
  }

  function updateEvent(id, patch) {
    const list = events().map((e) => (e.id === id ? Object.assign({}, e, patch) : e));
    saveEvents(list);
  }

  function removeEvent(id) {
    saveEvents(events().filter((e) => e.id !== id));
    state.done = state.done.filter((x) => x !== id);
    delete state.checks[id];
    save();
  }

  function city() { return state.city; }
  function setCity(id) { state.city = id; save(); }

  // 模块加载时先读一次，保证任何入口调用都有 state（浏览器/Node 通用）
  load();

  return {
    KEY, SEED_EVENTS, SEED_ACTIVITIES, DEFAULTS,
    applyLocale,
    load, save, reset,
    events, saveEvents, addEvent, updateEvent, removeEvent,
    activities, saveActivities, addActivity, removeActivity, portState,
    doneIds, markDone, undoDone, isDone,
    checksOf, setChecks, progressOf,
    city, setCity,
  };
});
