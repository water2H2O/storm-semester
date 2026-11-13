/* ============================================================
   Storm Semester — 界面
   引擎在 engine.js，存储 store.js，3D 场景 scene3d.js
   ============================================================ */
(function () {
  'use strict';

  const E = window.StormEngine;
  const S = window.StormStore;
  const $ = (id) => document.getElementById(id);

  const params = new URLSearchParams(location.search);
  const DEMO_TODAY = params.get('today') || null;

  /* ---------------- 状态 ---------------- */
  let events = [];
  let doneIds = new Set();
  let activities = [];
  let returnTimer = null;
  let pendingReturn = false;
  let importQueue = [];

  const todayKey = () => DEMO_TODAY || E.todayKey();

  function refresh() {
    events = S.events();
    doneIds = S.doneIds();
    activities = S.activities();
  }

  /* ============================================================
     渲染：天气相关的部分
     ============================================================ */
  function renderWeather() {
    const today = todayKey();
    const w = E.weatherOn(today, events, doneIds);
    document.body.dataset.weather = w.level.key;

    /* --- 今日 --- */
    $('heroIcon').textContent = w.level.icon;
    $('heroTitle').textContent = w.level.label;
    $('heroDate').textContent = `${today} ${E.dowOf(today)}`;
    $('heroScore').textContent = `压力 ${w.score.toFixed(1)}`;

    const storm = E.nextStorm(today, events, doneIds);
    if (w.count > 0) {
      $('heroSub').textContent = `今天有 ${w.count} 个事项到期`;
    } else if (storm) {
      $('heroSub').textContent = `今天没有截止，但风暴在 ${storm.inDays} 天后`;
    } else {
      $('heroSub').textContent = '今天没有截止，未来 30 天也没有';
    }

    /* --- 下一场风暴 --- */
    if (storm) {
      $('nextSection').style.display = '';
      $('nextIcon').textContent = storm.level.icon;
      $('nextTitle').textContent = `${storm.level.label} · ${E.dowOf(storm.key)} ${E.mdOf(storm.key)}`;
      $('nextSub').textContent = `${storm.count} 个事项 · 还有 ${storm.inDays} 天`;
      $('nextBadge').textContent = storm.level.signal || '';
    } else {
      $('nextSection').style.display = 'none';
    }

    /* --- 现在做这一件 --- */
    const list = E.priorities(today, events, doneIds);
    $('focusCard').innerHTML = list.length
      ? focusTemplate(list[0], today)
      : `<div class="focus-empty">这一轮没有剩下的事了。出去走走吧。</div>`;

    /* --- 本周 --- */
    $('weekStrip').innerHTML = E.weekOf(today)
      .map((k) => {
        const ww = E.weatherOn(k, events, doneIds);
        return `<div class="week-cell${k === today ? ' today' : ''}">
          <div class="wc-dow">${E.dowOf(k).replace('周', '')}</div>
          <div class="wc-icon">${ww.level.icon}</div>
          <div class="wc-name">${ww.count > 0 ? ww.count + ' 件' : ww.level.label}</div>
        </div>`;
      })
      .join('');

    /* --- 三周时间轴（14 天后变模糊） --- */
    $('timeline').innerHTML = E.listDays(today, 21)
      .map((k, i) => {
        const ww = E.weatherOn(k, events, doneIds);
        const fuzzy = E.confidenceFor(k, today) === 'fuzzy';
        return `<div class="tl${i === 0 ? ' today' : ''}${fuzzy ? ' fuzzy' : ''}">
          ${ww.count > 0 ? `<span class="tl-count">${ww.count}</span>` : ''}
          <div class="tl-dow">${i === 0 ? '今天' : E.dowOf(k).replace('周', '')}</div>
          <div class="tl-date">${E.mdOf(k)}</div>
          <div class="tl-icon">${ww.level.icon}</div>
          <div class="tl-name">${ww.level.label}</div>
        </div>`;
      })
      .join('');

    /* --- 城市悬浮条 --- */
    $('cityIcon').textContent = w.level.icon;
    $('cityTitle').textContent = w.level.label;
    $('citySub').textContent = w.count > 0 ? `今天有 ${w.count} 个事项到期` : '今天没有截止';
    $('cityNext').textContent = storm
      ? `下一场风暴：${storm.level.label} · ${E.dowOf(storm.key)} ${E.mdOf(storm.key)} · 还有 ${storm.inDays} 天`
      : '未来 30 天风平浪静';

    /* --- 电视台角标 --- */
    renderTxBadge(w.level);

    /* --- 驱动 3D 城市 --- */
    const scene = window.STORM_SCENE;
    if (scene) {
      scene.setWeather(w.level.key);
      scene.setPressure(w.score);
    }
    syncBubbles();
  }

  /* ---------------- 电视台角标 ---------------- */
  // 香港天文台的警告信号：恶劣天气时挂在左上角，像电视台那样
  const TX_SIGNALS = {
    storm: { ball: '⚡', tone: 'storm', label: '雷暴警告', sub: '天文台发出 · 生效中' },
    t3:    { ball: '3', tone: 't3',    label: '三号风球', sub: '强烈季候风信号 · 生效中' },
    t8:    { ball: '8', tone: 't8',    label: '八号风球', sub: '烈风或暴风信号 · 生效中' },
    black: { ball: '雨', tone: 'black', label: '黑色暴雨警告', sub: '天文台发出 · 生效中' },
  };

  function renderTxBadge(level) {
    const el = $('txBadge');
    if (!el) return;
    const sig = TX_SIGNALS[level.key];
    if (!sig) {
      el.classList.remove('on');
      return;
    }
    el.dataset.tone = sig.tone;
    el.innerHTML = `
      <span class="tx-ball">${sig.ball}</span>
      <span class="tx-text">
        <b>${sig.label}</b>
        <i>${sig.sub}</i>
      </span>`;
    el.classList.add('on');
  }

  /* ---------------- 焦点卡 ---------------- */
  function focusTemplate(p, today) {
    const isHappen = p.kind === 'happen';
    const kindLabel = isHappen ? '发生型' : '提交型';
    const when = p.daysLeft === 0 ? '今天' : `${p.daysLeft} 天后`;
    const late = p.lateBy > 0
      ? `<span class="late">· 已经晚了 ${p.lateBy} 天</span>`
      : `· 可以 ${E.mdOf(p.startBy)} 再开始`;

    const typeLabel = E.presetOf(p.type).label;
    const checks = S.checksOf(p.id);
    const progress = S.progressOf(p);

    const checklist = (p.checklist || [])
      .map((c, i) => `<li>
        <input type="checkbox" data-check="${p.id}" data-index="${i}"${checks[i] ? ' checked' : ''}>
        <span>${c}</span>
      </li>`)
      .join('');

    const action = isHappen
      ? `<div class="progress"><i style="width:${progress}%"></i></div>
         <div class="focus-meta" style="margin:0">准备度 ${progress}% · 它不需要你交东西，但需要你准备好</div>`
      : `<button class="btn primary" data-done="${p.id}">标记完成</button>`;

    return `
      <div class="focus-head">
        <span class="tag ${p.kind}">${kindLabel}</span>
        <span class="focus-meta" style="margin:0">${typeLabel} · 课程 ${p.course}</span>
      </div>
      <h2 class="focus-title">${escapeHtml(p.title)}</h2>
      <div class="focus-meta">${E.dowOf(p.dueKey)} ${E.mdOf(p.dueKey)} · ${when} ${late}</div>
      ${checklist ? `<ul class="checklist">${checklist}</ul>` : ''}
      ${action}`;
  }

  /* ============================================================
     渲染：事项管理
     ============================================================ */
  function renderEventList() {
    const today = todayKey();
    const list = events.slice().sort((a, b) => String(a.due).localeCompare(String(b.due)));

    const rowOf = (e) => {
      const isDone = doneIds.has(e.id);
      const dueKey = String(e.due).slice(0, 10);
      const preset = E.presetOf(e.type);
      const weight = E.weightOf(e);
      const lead = E.leadOf(e);
      const past = dueKey < today;
      return `<div class="ev${isDone ? ' done' : ''}${past && !isDone ? ' past' : ''}" data-ev="${e.id}">
        <div class="ev-top">
          <span class="tag ${preset.kind}">${preset.label}</span>
          <span class="ev-title">${escapeHtml(e.title)}</span>
          <span class="ev-due">${E.mdOf(dueKey)} ${E.dowOf(dueKey)}</span>
        </div>
        <div class="ev-ctrl">
          <label class="ev-slider" title="压力权重：这件对你有多重">
            <span>权重</span>
            <input type="range" data-weight="${e.id}" min="1" max="6" step="0.5" value="${weight}">
            <output>${weight}</output>
          </label>
          <label class="ev-slider" title="准备窗口：提前多久开始有压力">
            <span>窗口</span>
            <input type="range" data-lead="${e.id}" min="1" max="21" step="1" value="${lead}">
            <output>${lead}天</output>
          </label>
          ${isDone
            ? `<button class="ev-btn" data-undo="${e.id}" title="恢复">↺ 恢复</button>`
            : `<button class="ev-btn" data-done="${e.id}" title="标记完成">✓ 完成</button>`}
          <button class="ev-del" data-del="${e.id}" title="删除">×</button>
        </div>
      </div>`;
    };

    // 未完成的未来事项放前面；已完成和已过期的收进折叠区
    const active = list.filter((e) => !doneIds.has(e.id) && String(e.due).slice(0, 10) >= today);
    const archived = list.filter((e) => doneIds.has(e.id) || String(e.due).slice(0, 10) < today);

    let html = active.map(rowOf).join('');
    if (!active.length) {
      html += `<div class="ev-empty">还没有待办事项。加一件，看看天气怎么变。</div>`;
    }
    if (archived.length) {
      html += `<details class="ev-archive">
        <summary>已完成 / 已过期 ${archived.length} 件</summary>
        <div class="ev-archive-body">${archived.map(rowOf).join('')}</div>
      </details>`;
    }
    $('eventList').innerHTML = html;
  }

  /* ---------------- 线下活动（船） ---------------- */
  function renderActivities() {
    const today = todayKey();
    const list = activities.slice().sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = list.filter((a) => a.date >= today);
    const past = list.filter((a) => a.date < today);

    const rowOf = (a) => {
      const days = E.daysBetween(today, a.date);
      const when = days === 0 ? '今天' : days > 0 ? `${days} 天后` : `${-days} 天前`;
      return `<div class="act${a.date < today ? ' past' : ''}" data-act="${a.id}">
        <div class="act-date">
          <b>${E.mdOf(a.date).split('/')[1]}</b>
          <span>${E.mdOf(a.date).split('/')[0]}月</span>
        </div>
        <div class="act-body">
          <div class="act-title">${escapeHtml(a.title)}</div>
          <div class="act-meta">${when}${a.time ? ' · ' + a.time : ''}${a.place ? ' · ' + escapeHtml(a.place) : ''}</div>
          ${a.note ? `<div class="act-note">${escapeHtml(a.note)}</div>` : ''}
        </div>
        <button class="ev-del" data-del-act="${a.id}" title="删除">×</button>
      </div>`;
    };

    let html = upcoming.map(rowOf).join('');
    if (!upcoming.length) {
      html = `<div class="ev-empty">近期没有活动。加一个，港口就会有船来。</div>`;
    }
    if (past.length) {
      html += `<details class="ev-archive">
        <summary>已经结束 ${past.length} 个</summary>
        <div class="ev-archive-body">${past.map(rowOf).join('')}</div>
      </details>`;
    }
    $('activityList').innerHTML = html;
  }

  /* ---------------- 城市切换 ---------------- */
  function renderCitySwitch() {
    const scene = window.STORM_SCENE;
    if (!scene) return;
    const cities = scene.cities();
    const active = S.city();
    const html = cities
      .map((c) => `<button class="cs-btn${c.id === active ? ' on' : ''}" data-city="${c.id}" type="button">${c.label}</button>`)
      .join('');
    ['citySwitch', 'citySwitchHud'].forEach((id) => {
      const el = $(id);
      if (el) el.innerHTML = html;
    });
  }

  function applyCity(id) {
    S.setCity(id);
    const scene = window.STORM_SCENE;
    if (scene && scene.setCity) scene.setCity(id);
    renderCitySwitch();
  }

  function renderAll() {
    renderWeather();
    renderEventList();
    renderActivities();
    renderCitySwitch();
    syncPort();
    syncBubbles();
  }

  /** 把港口状态交给 3D 场景（船） */
  function syncPort() {
    const scene = window.STORM_SCENE;
    if (!scene || !scene.setPort) return;
    scene.setPort(S.portState(todayKey()));
  }

  /** 城市里的两个气泡：天文台（坏消息）和船（好消息） */
  function syncBubbles() {
    const scene = window.STORM_SCENE;
    if (!scene || !scene.setBubbles) return;

    const today = todayKey();
    const w = E.weatherOn(today, events, doneIds);
    const storm = E.nextStorm(today, events, doneIds);
    const port = S.portState(today);

    const list = [];

    // 天文台：报忧
    let warnSub;
    if (w.count > 0) warnSub = `今天 ${w.count} 个事项到期 · 压力 ${w.score.toFixed(1)}`;
    else if (storm) warnSub = `下一场在 ${storm.inDays} 天后 · 压力 ${storm.score.toFixed(1)}`;
    else warnSub = '未来 30 天平静';

    list.push({
      id: 'obs',
      anchorKey: 'observatory',
      icon: w.level.icon,
      title: `天文台 · ${w.level.label}`,
      sub: warnSub,
      target: w.count > 0 ? '#sectionToday' : '#nextSection',
    });

    // 港口：报喜
    if (port.phase !== 'away' && port.activity) {
      const inDays = port.inDays;
      const when = inDays === 0 ? '今天' : `${inDays} 天后`;
      list.push({
        id: 'ship',
        anchorKey: 'ship',
        icon: '🚢',
        title: escapeHtml(port.activity.title),
        sub: `${when}${port.activity.place ? ' · ' + escapeHtml(port.activity.place) : ''}`,
        target: '#sectionActivities',
      });
    }

    scene.setBubbles(list);
  }

  /** 从 3D 气泡跳进面板并定位到对应区块 */
  function jumpTo(selector) {
    pendingReturn = false;
    setMode('data');
    const el = document.querySelector(selector);
    if (!el) return;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('jump-flash');
      setTimeout(() => el.classList.remove('jump-flash'), 1800);
    }, 520);
  }

  /* ============================================================
     城市态 / 数据态
     ============================================================ */
  function setMode(mode) {
    if (document.body.dataset.mode === mode) return;
    document.body.dataset.mode = mode;
    if (mode === 'data') $('appMain').scrollTop = 0;
    if (pendingReturn && mode === 'data') pendingReturn = false;
    const scene = window.STORM_SCENE;
    if (scene && scene.setMode) scene.setMode(mode);
  }

  function bindModeGestures() {
    $('cityEnter').addEventListener('click', () => {
      pendingReturn = false;
      setMode('data');
    });
    $('cityBack').addEventListener('click', () => {
      pendingReturn = false;
      setMode('city');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { pendingReturn = false; setMode('city'); }
    });

    const main = $('appMain');
    let wheelLock = 0;
    window.addEventListener('wheel', (e) => {
      const now = performance.now();
      if (now < wheelLock) return;
      const mode = document.body.dataset.mode;
      if (mode === 'city' && e.deltaY > 20) {
        pendingReturn = false;
        setMode('data');
        wheelLock = now + 700;
      } else if (mode === 'data' && e.deltaY < -20 && main.scrollTop <= 0) {
        pendingReturn = false;
        setMode('city');
        wheelLock = now + 700;
      }
    }, { passive: true });

    let startY = null;
    window.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchend', (e) => {
      if (startY === null) return;
      const dy = e.changedTouches[0].clientY - startY;
      startY = null;
      const mode = document.body.dataset.mode;
      if (mode === 'city' && dy < -50) { pendingReturn = false; setMode('data'); }
      else if (mode === 'data' && dy > 70 && main.scrollTop <= 0) { pendingReturn = false; setMode('city'); }
    }, { passive: true });
  }

  /* ============================================================
     完成 / 撤销
     ============================================================ */
  function completeEvent(id) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    S.markDone(id);
    refresh();

    const wasInData = document.body.dataset.mode === 'data';
    renderAll();

    toast(`「${ev.title}」完成 —— 云散了`, {
      label: '撤销',
      onClick: () => { S.undoDone(id); refresh(); renderAll(); },
    });

    // 退回城市，让用户看见天放晴，2.4 秒后自动回到面板
    if (wasInData) {
      pendingReturn = true;
      setMode('city');
      clearTimeout(returnTimer);
      returnTimer = setTimeout(() => {
        if (pendingReturn) {
          pendingReturn = false;
          setMode('data');
        }
      }, 2400);
    }
  }

  /* ============================================================
     交互绑定
     ============================================================ */
  function bindEvents() {
    document.addEventListener('click', (ev) => {
      const done = ev.target.closest('[data-done]');
      if (done) { completeEvent(done.getAttribute('data-done')); return; }

      const undo = ev.target.closest('[data-undo]');
      if (undo) { S.undoDone(undo.getAttribute('data-undo')); refresh(); renderAll(); return; }

      const del = ev.target.closest('[data-del]');
      if (del) {
        const id = del.getAttribute('data-del');
        const target = events.find((e) => e.id === id);
        S.removeEvent(id);
        refresh();
        renderAll();
        toast(`已删除「${target ? target.title : id}」`);
        return;
      }

      const delAct = ev.target.closest('[data-del-act]');
      if (delAct) {
        S.removeActivity(delAct.getAttribute('data-del-act'));
        refresh();
        renderAll();
        toast('已删除活动');
        return;
      }

      const city = ev.target.closest('[data-city]');
      if (city) { applyCity(city.getAttribute('data-city')); return; }
    });

    // 权重与窗口滑块：拖动时只重算天气，不重建列表（保持手感）
    document.addEventListener('input', (ev) => {
      const w = ev.target.closest('[data-weight]');
      if (w) {
        const id = w.getAttribute('data-weight');
        const val = Number(w.value);
        S.updateEvent(id, { weight: val });
        const out = w.parentElement.querySelector('output');
        if (out) out.textContent = val;
        refresh();
        renderWeather();
        return;
      }
      const l = ev.target.closest('[data-lead]');
      if (l) {
        const id = l.getAttribute('data-lead');
        const val = Number(l.value);
        S.updateEvent(id, { leadDays: val });
        const out = l.parentElement.querySelector('output');
        if (out) out.textContent = val + '天';
        refresh();
        renderWeather();
      }
    });

    // 准备清单
    document.addEventListener('change', (ev) => {
      const box = ev.target.closest('[data-check]');
      if (box) {
        const id = box.getAttribute('data-check');
        const ev2 = events.find((e) => e.id === id);
        if (!ev2) return;
        const list = (ev2.checklist || []).map((_, i) => {
          const el = document.querySelector(`[data-check="${id}"][data-index="${i}"]`);
          return !!(el && el.checked);
        });
        S.setChecks(id, list);
        const pct = S.progressOf(ev2);
        const card = $('focusCard');
        const bar = card.querySelector('.progress > i');
        if (bar) bar.style.width = pct + '%';
        const note = card.querySelector('.progress + .focus-meta');
        if (note) note.textContent = `准备度 ${pct}% · 它不需要你交东西，但需要你准备好`;
      }
    });

    /* --- 新增事项 --- */
    const form = $('eventForm');
    $('addEventBtn').addEventListener('click', () => {
      if (form.hidden) openForm();
      else form.hidden = true;
    });
    $('cancelAdd').addEventListener('click', () => { form.hidden = true; });

    /* --- 线下活动 --- */
    const actForm = $('activityForm');
    $('addActivityBtn').addEventListener('click', () => {
      if (actForm.hidden) {
        actForm.querySelector('[name="date"]').value = todayKey();
        actForm.hidden = false;
        actForm.querySelector('[name="title"]').focus();
      } else {
        actForm.hidden = true;
      }
    });
    $('cancelActivity').addEventListener('click', () => { actForm.hidden = true; });
    actForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(actForm);
      if (!fd.get('date')) return;
      S.addActivity({
        title: String(fd.get('title') || '').trim(),
        date: String(fd.get('date')),
        time: String(fd.get('time') || ''),
        place: String(fd.get('place') || ''),
      });
      actForm.reset();
      actForm.hidden = true;
      refresh();
      renderAll();
      toast('已加入活动 —— 港口会有船来');
    });

    /* --- 导入日历 --- */
    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => handleImported(String(reader.result || ''));
      reader.onerror = () => toast('文件读取失败');
      reader.readAsText(f, 'utf-8');
    });

    $('eventType').addEventListener('change', () => {
      const preset = E.presetOf($('eventType').value);
      const wIn = form.querySelector('[name="weight"]');
      const lIn = form.querySelector('[name="leadDays"]');
      wIn.value = preset.weight;
      lIn.value = preset.leadDays;
      $('weightOut').textContent = preset.weight;
      $('leadOut').textContent = preset.leadDays;
    });

    form.querySelector('[name="weight"]').addEventListener('input', (e) => {
      $('weightOut').textContent = e.target.value;
    });
    form.querySelector('[name="leadDays"]').addEventListener('input', (e) => {
      $('leadOut').textContent = e.target.value;
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const dueRaw = String(fd.get('due') || '');
      if (!dueRaw) return;
      const due = dueRaw.length === 16 ? `${dueRaw}:00+08:00` : dueRaw;
      S.addEvent({
        title: String(fd.get('title') || '').trim(),
        type: String(fd.get('type')),
        due,
        weight: Number(fd.get('weight')),
        leadDays: Number(fd.get('leadDays')),
      }, E);
      form.reset();
      form.hidden = true;
      refresh();
      renderAll();
      toast('已加入学期');
    });
  }

  /* ---------------- 导入日历 ---------------- */
  function handleImported(text) {
    const parsed = window.StormImport ? window.StormImport.parseICS(text) : [];
    if (!parsed.length) {
      toast('没解析到事件 —— 确认是 .ics 日历文件');
      return;
    }
    importQueue = parsed;
    renderImportPreview();
  }

  function renderImportPreview() {
    const box = $('importPreview');
    const types = Object.keys(E.TYPES);
    box.innerHTML = `
      <div class="ip-head">从日历里解析到 ${importQueue.length} 个事件，选要导入的</div>
      <div class="ip-list">
        ${importQueue.map((it, i) => `
          <label class="ip-row">
            <input type="checkbox" data-ip-check="${i}" checked>
            <span class="ip-title">${escapeHtml(it.summary)}</span>
            <span class="ip-due">${it.due.slice(5, 10).replace('-', '/')} ${it.due.slice(11, 16)}</span>
            <select data-ip-type="${i}">
              ${types.map((t) => `<option value="${t}"${t === it.type ? ' selected' : ''}>${E.TYPES[t].label}</option>`).join('')}
            </select>
          </label>`).join('')}
      </div>
      <div class="form-actions">
        <button class="btn primary" type="button" id="importConfirm">导入选中</button>
        <button class="btn" type="button" id="importCancel">取消</button>
      </div>`;
    box.hidden = false;

    $('importCancel').addEventListener('click', () => {
      box.hidden = true;
      importQueue = [];
    });

    $('importConfirm').addEventListener('click', () => {
      const picked = [];
      box.querySelectorAll('[data-ip-check]').forEach((cb) => {
        if (!cb.checked) return;
        const i = Number(cb.getAttribute('data-ip-check'));
        const sel = box.querySelector(`[data-ip-type="${i}"]`);
        picked.push({ item: importQueue[i], type: sel ? sel.value : 'lab' });
      });
      if (!picked.length) { toast('没有选中任何事件'); return; }
      picked.forEach((p) => {
        S.addEvent({ title: p.item.summary, type: p.type, due: p.item.due }, E);
      });
      box.hidden = true;
      importQueue = [];
      refresh();
      renderAll();
      toast(`已导入 ${picked.length} 个事项`);
    });
  }

  function openForm() {
    const form = $('eventForm');
    const sel = $('eventType');
    sel.innerHTML = Object.keys(E.TYPES)
      .map((k) => `<option value="${k}">${E.TYPES[k].label}</option>`)
      .join('');
    const preset = E.presetOf(sel.value);
    form.querySelector('[name="weight"]').value = preset.weight;
    form.querySelector('[name="leadDays"]').value = preset.leadDays;
    $('weightOut').textContent = preset.weight;
    $('leadOut').textContent = preset.leadDays;

    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    form.querySelector('[name="due"]').value = local.toISOString().slice(0, 16);
    form.hidden = false;
    form.querySelector('[name="title"]').focus();
  }

  /* ============================================================
     小工具
     ============================================================ */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  let toastTimer = null;
  function toast(msg, action) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.innerHTML = `<span>${escapeHtml(msg)}</span>`;
    if (action) {
      const btn = document.createElement('button');
      btn.className = 'toast-action';
      btn.type = 'button';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        action.onClick();
        el.classList.remove('show');
      });
      el.appendChild(btn);
    }
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
  }

  /* ---------------- 没有 3D 时的兜底雨 ---------------- */
  function initRain() {
    const rain = $('rain');
    if (!rain || rain.childElementCount) return;
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('span');
      s.style.left = Math.random() * 106 - 3 + '%';
      s.style.animationDuration = 0.55 + Math.random() * 0.7 + 's';
      s.style.animationDelay = -Math.random() * 2 + 's';
      s.style.opacity = 0.2 + Math.random() * 0.5;
      rain.appendChild(s);
    }
  }

  /* ============================================================
     启动
     ============================================================ */
  function boot() {
    if (params.has('reset')) S.reset();
    S.load();
    refresh();

    if (window.STORM_SCENE) {
      document.body.classList.add('has-3d');
      applyCity(S.city());
    } else {
      initRain();
    }

    bindEvents();
    bindModeGestures();
    renderAll();

    if (params.has('data')) setMode('data');

    // 给 3D 场景用的入口：气泡点击 → 跳转到面板对应区块
    window.STORM_APP = {
      jumpTo,
      setMode,
      refresh,
      renderAll,
      port: () => S.portState(todayKey()),
      today: todayKey,
    };

    window.__storm = { E, S, refresh, renderAll, setMode, events: () => events };
  }

  boot();
})();
