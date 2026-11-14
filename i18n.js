/* ============================================================
   Storm Semester — 多语言层
   默认英文；可选繁體中文 / 简体中文。
   用法：StormI18N.init() 启动；StormI18N.t(key, vars) 取词；
        StormI18N.setLocale('zh-Hant' | 'zh-Hans' | 'en') 切换。

   约定：
   - {name} 占位符插值
   - 需要单复数时给 key.one / key.other，并在 vars 里传 n
   - 缺词时回落到英文，绝不把 key 直接甩到界面上
   ============================================================ */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'storm-semester:lang';
  const DEFAULT_LOCALE = 'en';
  const SUPPORTED = ['en', 'zh-Hant', 'zh-Hans'];

  /* ---------------- 英文（默认） ---------------- */

  const EN = {
    'meta.title': 'Storm Semester — your semester has a weather forecast',
    'meta.desc': 'Turn academic deadlines into a weather forecast. See the workload build up, and know what to start next.',

    'city.enter': 'View semester details',
    'nav.back': '← Back to city',
    'next.label': 'Next storm',
    'focus.label': 'Do this next',
    'week.label': 'This week',
    'timeline.label': 'Next three weeks',
    'timeline.hint': 'Estimated from the events you entered. Dates past 14 days are dimmed as a distant-forecast cue, not a confidence interval.',

    'act.label': 'Upcoming activities',
    'act.add': '+ Add activity',
    'act.empty': 'No upcoming activities. Add one and a ship will sail into the harbour.',
    'act.archive': 'Ended — {n}',
    'act.form.title': 'Activity name',
    'act.form.date': 'Date',
    'act.form.time': 'Time (optional)',
    'act.form.place': 'Place (optional)',
    'act.form.titlePh': 'e.g. CCL lecture',
    'act.form.placePh': 'e.g. AAB Academic Building',
    'act.form.submit': 'Add activity',
    'act.form.cancel': 'Cancel',

    'manage.label': 'Events',
    'manage.add': '+ Add event',
    'manage.import': 'Import .ics calendar',
    'ev.empty': 'Nothing pending yet. Add an event and watch the weather change.',
    'ev.archive': 'Completed / past — {n}',
    'ev.weight': 'Wt',
    'ev.window': 'Win',
    'ev.leadUnitShort': 'd',
    'ev.weightTip': 'Weight: how much this event counts toward your workload',
    'ev.windowTip': 'Prep window: how many days ahead it starts feeding the workload curve',
    'ev.done': 'Done',
    'ev.undo': 'Undo',
    'ev.delete': 'Delete',
    'ev.past': 'past',
    'ev.form.title': 'Name',
    'ev.form.type': 'Type',
    'ev.form.due': 'Due / event time',
    'ev.form.weight': 'Weight',
    'ev.form.lead': 'Prep window',
    'ev.form.leadUnit': 'days',
    'ev.form.submit': 'Add to semester',
    'ev.form.cancel': 'Cancel',
    'ev.form.titlePh': 'e.g. Group project submission',

    'footer.tagline': 'Not a diagnosis, not an official weather warning. Prepare early, one thing at a time.',
    'footer.event': 'BUHACK 2.0 · HKBU Coding Club',

    'hero.score': 'Workload {n}',
    'hero.dueToday': '{n} events due today',
    'hero.dueToday.one': '{n} event due today',
    'hero.stormIn': 'Nothing due today — next storm in {n} days',
    'hero.calm': 'Nothing due today, and nothing in the next 30 days',

    'next.sub': '{n} events · in {d} days',
    'next.sub.one': '{n} event · in {d} days',

    'city.subDue': '{n} events due today',
    'city.subDue.one': '{n} event due today',
    'city.subNone': 'Nothing due today',
    'city.next': 'Next storm: {label} · {dow} {md} · in {n} days',
    'city.nextCalm': 'Calm for the next 30 days',
    'city.label': 'City',

    'count.items': '{n} events',
    'count.items.one': '{n} event',
    'ui.today': 'Today',

    'focus.empty': 'Nothing left this round. Go outside for a bit.',
    'focus.kind.submit': 'Submission',
    'focus.kind.happen': 'Preparation',
    'focus.when.today': 'today',
    'focus.when.in': 'in {n} days',
    'focus.when.ago': '{n} days ago',
    'focus.late': 'start date passed {n} days ago — starting now still helps',
    'focus.startBy': 'start preparing {date}',
    'focus.course': 'Course {code}',
    'focus.progressNote': 'Readiness {n}% · nothing to hand in, but it needs preparing',
    'focus.markDone': 'Mark complete',
    'act.untitled': 'Untitled activity',
    'ev.untitled': 'Untitled event',

    'tx.storm.label': 'Thunderstorm warning',
    'tx.storm.sub': 'Issued by the Observatory · in force',
    'tx.t3.label': 'Typhoon Signal No. 3',
    'tx.t3.sub': 'Strong monsoon signal · in force',
    'tx.t8.label': 'Typhoon Signal No. 8',
    'tx.t8.sub': 'Gale or storm signal · in force',
    'tx.black.ball': 'R',
    'tx.black.label': 'Black rainstorm warning',
    'tx.black.sub': 'Issued by the Observatory · in force',

    'bubble.obs': 'Observatory · {label}',
    'bubble.dueToday': '{n} events due today · workload {score}',
    'bubble.next': 'Next in {n} days · workload {score}',
    'bubble.calm': 'Calm for 30 days',
    'bubble.today': 'today',
    'bubble.in': 'in {n} days',

    'toast.done': '“{title}” done — the clouds are breaking',
    'toast.undo': 'Undo',
    'toast.deletedEvent': 'Deleted “{title}”',
    'toast.deletedActivity': 'Activity deleted',
    'toast.activityAdded': 'Activity added — a ship will sail in',
    'toast.fileError': 'Could not read that file',
    'toast.eventAdded': 'Added to your semester',
    'toast.noParse': 'No events found — is this a valid .ics file?',
    'toast.noneSelected': 'Nothing selected',
    'toast.imported': 'Imported {n} events',

    'imp.head': 'Found {n} events in the calendar — pick the ones to import',
    'imp.confirm': 'Import selected',

    'lang.label': 'Language',
    'lang.en': 'EN',
    'lang.zhHant': '繁',
    'lang.zhHans': '簡',

    'type.lab': 'Lab / assignment',
    'type.per': 'Presentation',
    'type.interview': 'In-class interview',
    'type.quiz': 'Quiz',
    'type.exam': 'Exam',
    'type.custom': 'Custom',

    'level.clear': 'Clear',
    'level.cloudy': 'Cloudy',
    'level.overcast': 'Overcast',
    'level.rain': 'Light rain',
    'level.storm': 'Thunderstorm',
    'level.t3': 'Typhoon T3',
    'level.t8': 'Typhoon T8',
    'level.black': 'Black rainstorm',

    'curve.steady': 'Steady',
    'curve.steep': 'Late rise',
    'curve.step': 'Stepped',
    'curve.long': 'Long ramp',

    'city.generic': 'Generic island',
    'city.hongkong': 'Hong Kong',
  };

  /* ---------------- 繁體中文 ---------------- */

  const ZH_HANT = {
    'meta.title': 'Storm Semester · 學期風暴',
    'meta.desc': '把學期的截止日期變成天氣。看見負擔如何累積，知道現在該開始哪一件事。',

    'city.enter': '查看學期詳情',
    'nav.back': '← 回到城市',
    'next.label': '下一場風暴',
    'focus.label': '現在做這一件事',
    'week.label': '本週',
    'timeline.label': '未來三週',
    'timeline.hint': '依你錄入的事項估算。14 天後的淡化只是遠期提示，不代表統計置信度。',

    'act.label': '最近的活動',
    'act.add': '+ 新增活動',
    'act.empty': '近期沒有活動。加一個，港口就會有船來。',
    'act.archive': '已經結束 {n} 個',
    'act.form.title': '活動名稱',
    'act.form.date': '日期',
    'act.form.time': '時間（可選）',
    'act.form.place': '地點（可選）',
    'act.form.titlePh': '例如 CCL 講座',
    'act.form.placePh': '例如 AAB 學術大樓',
    'act.form.submit': '加入活動',
    'act.form.cancel': '取消',

    'manage.label': '事項管理',
    'manage.add': '+ 新增事項',
    'manage.import': '匯入日曆 .ics',
    'ev.empty': '還沒有待辦事項。加一件，看看天氣怎麼變。',
    'ev.archive': '已完成 / 已過期 {n} 件',
    'ev.weight': '權重',
    'ev.window': '窗口',
    'ev.leadUnitShort': '天',
    'ev.weightTip': '任務權重：此事項對你學業負擔的比重',
    'ev.windowTip': '準備窗口：提前多少天開始納入負荷曲線',
    'ev.done': '完成',
    'ev.undo': '恢復',
    'ev.delete': '刪除',
    'ev.past': '已過期',
    'ev.form.title': '名稱',
    'ev.form.type': '類型',
    'ev.form.due': '截止 / 發生時間',
    'ev.form.weight': '負擔權重',
    'ev.form.lead': '準備窗口',
    'ev.form.leadUnit': '天',
    'ev.form.submit': '加入學期',
    'ev.form.cancel': '取消',
    'ev.form.titlePh': '例如 小組項目提交',

    'footer.tagline': '預報不是診斷，風球不是氣象預警。提前準備，從一件事開始。',
    'footer.event': 'BUHACK 2.0 · HKBU Coding Club',

    'hero.score': '學業負擔 {n}',
    'hero.dueToday': '今天有 {n} 個事項到期',
    'hero.stormIn': '今天沒有截止，但風暴在 {n} 天後',
    'hero.calm': '今天沒有截止，未來 30 天也沒有',

    'next.sub': '{n} 個事項 · 還有 {d} 天',
    'city.subDue': '今天有 {n} 個事項到期',
    'city.subNone': '今天沒有截止',
    'city.next': '下一場風暴：{label} · {dow} {md} · 還有 {n} 天',
    'city.nextCalm': '未來 30 天風平浪靜',
    'city.label': '城市',

    'count.items': '{n} 件',
    'ui.today': '今天',

    'focus.empty': '這一輪沒有剩下的事了。出去走走吧。',
    'focus.kind.submit': '提交型',
    'focus.kind.happen': '發生型',
    'focus.when.today': '今天',
    'focus.when.in': '{n} 天後',
    'focus.when.ago': '{n} 天前',
    'focus.late': '建議開始日已過 {n} 天，現在開始也有幫助',
    'focus.startBy': '建議 {date} 開始準備',
    'focus.course': '課程 {code}',
    'focus.progressNote': '準備度 {n}% · 它不需要你交東西，但需要你準備好',
    'focus.markDone': '標記完成',
    'act.untitled': '未命名活動',
    'ev.untitled': '未命名事項',

    'tx.storm.label': '雷暴警告',
    'tx.storm.sub': '天文台發出 · 生效中',
    'tx.t3.label': '三號風球',
    'tx.t3.sub': '強烈季候風信號 · 生效中',
    'tx.t8.label': '八號風球',
    'tx.t8.sub': '烈風或暴風信號 · 生效中',
    'tx.black.ball': '雨',
    'tx.black.label': '黑色暴雨警告',
    'tx.black.sub': '天文台發出 · 生效中',

    'bubble.obs': '天文台 · {label}',
    'bubble.dueToday': '今天 {n} 個事項到期 · 負擔 {score}',
    'bubble.next': '下一場在 {n} 天後 · 負擔 {score}',
    'bubble.calm': '未來 30 天平靜',
    'bubble.today': '今天',
    'bubble.in': '{n} 天後',

    'toast.done': '「{title}」完成 —— 雲散了',
    'toast.undo': '撤銷',
    'toast.deletedEvent': '已刪除「{title}」',
    'toast.deletedActivity': '已刪除活動',
    'toast.activityAdded': '已加入活動 —— 港口會有船來',
    'toast.fileError': '檔案讀取失敗',
    'toast.eventAdded': '已加入學期',
    'toast.noParse': '沒解析到事件 —— 確認是 .ics 日曆檔案',
    'toast.noneSelected': '沒有選中任何事件',
    'toast.imported': '已匯入 {n} 個事項',

    'imp.head': '從日曆裡解析到 {n} 個事件，選要匯入的',
    'imp.confirm': '匯入選中',

    'lang.label': '語言',
    'lang.en': 'EN',
    'lang.zhHant': '繁',
    'lang.zhHans': '簡',

    'type.lab': '實驗 / 作業',
    'type.per': '匯報 / 演示',
    'type.interview': '課上抽查',
    'type.quiz': '小測',
    'type.exam': '考試',
    'type.custom': '自訂',

    'level.clear': '晴',
    'level.cloudy': '多雲',
    'level.overcast': '陰',
    'level.rain': '小雨',
    'level.storm': '雷暴',
    'level.t3': '三號風球',
    'level.t8': '八號風球',
    'level.black': '黑色暴雨',

    'curve.steady': '平穩',
    'curve.steep': '陡升',
    'curve.step': '台階',
    'curve.long': '長坡',

    'city.generic': '通用島',
    'city.hongkong': '香港',
  };

  /* ---------------- 简体中文 ---------------- */

  const ZH_HANS = Object.assign({}, ZH_HANT, {
    'meta.title': 'Storm Semester · 学期风暴',
    'meta.desc': '把学期的截止日期变成天气。看见负担如何累积，知道现在该开始哪一件事。',

    'city.enter': '查看学期详情',
    'nav.back': '← 回到城市',
    'next.label': '下一场风暴',
    'focus.label': '现在做这一件事',
    'week.label': '本周',
    'timeline.label': '未来三周',
    'timeline.hint': '基于已录入事项估算；14 天后的淡化仅作远期提示，不代表统计置信度。',

    'act.label': '最近的活动',
    'act.add': '+ 新增活动',
    'act.empty': '近期没有活动。加一个，港口就会有船来。',
    'act.archive': '已经结束 {n} 个',
    'act.form.title': '活动名称',
    'act.form.date': '日期',
    'act.form.time': '时间（可选）',
    'act.form.place': '地点（可选）',
    'act.form.titlePh': '例如 CCL 讲座',
    'act.form.placePh': '例如 AAB 学术大楼',
    'act.form.submit': '加入活动',
    'act.form.cancel': '取消',

    'manage.label': '事项管理',
    'manage.add': '+ 新增事项',
    'manage.import': '导入日历 .ics',
    'ev.empty': '还没有待办事项。加一件，看看天气怎么变。',
    'ev.archive': '已完成 / 已过期 {n} 件',
    'ev.weight': '权重',
    'ev.window': '窗口',
    'ev.leadUnitShort': '天',
    'ev.weightTip': '任务权重：此事项对你学业负担的比重',
    'ev.windowTip': '准备窗口：提前多少天开始纳入负荷曲线',
    'ev.done': '完成',
    'ev.undo': '恢复',
    'ev.delete': '删除',
    'ev.past': '已过期',
    'ev.form.title': '名称',
    'ev.form.type': '类型',
    'ev.form.due': '截止 / 发生时间',
    'ev.form.weight': '负担权重',
    'ev.form.lead': '准备窗口',
    'ev.form.leadUnit': '天',
    'ev.form.submit': '加入学期',
    'ev.form.cancel': '取消',
    'ev.form.titlePh': '例如 小组项目提交',

    'footer.tagline': '预报不是诊断，风球不是气象预警。提前准备，从一件事开始。',

    'hero.score': '学业负担 {n}',
    'hero.dueToday': '今天有 {n} 个事项到期',
    'hero.stormIn': '今天没有截止，但风暴在 {n} 天后',
    'hero.calm': '今天没有截止，未来 30 天也没有',

    'next.sub': '{n} 个事项 · 还有 {d} 天',
    'city.subDue': '今天有 {n} 个事项到期',
    'city.subNone': '今天没有截止',
    'city.next': '下一场风暴：{label} · {dow} {md} · 还有 {n} 天',
    'city.nextCalm': '未来 30 天风平浪静',
    'city.label': '城市',

    'count.items': '{n} 件',
    'ui.today': '今天',

    'focus.empty': '这一轮没有剩下的事了。出去走走吧。',
    'focus.kind.submit': '提交型',
    'focus.kind.happen': '发生型',
    'focus.when.today': '今天',
    'focus.when.in': '{n} 天后',
    'focus.when.ago': '{n} 天前',
    'focus.late': '建议开始日已过 {n} 天，现在开始也有帮助',
    'focus.startBy': '建议 {date} 开始准备',
    'focus.course': '课程 {code}',
    'focus.progressNote': '准备度 {n}% · 它不需要你交东西，但需要你准备好',
    'focus.markDone': '标记完成',
    'act.untitled': '未命名活动',
    'ev.untitled': '未命名事项',

    'tx.storm.label': '雷暴警告',
    'tx.storm.sub': '天文台发出 · 生效中',
    'tx.t3.label': '三号风球',
    'tx.t3.sub': '强烈季候风信号 · 生效中',
    'tx.t8.label': '八号风球',
    'tx.t8.sub': '烈风或暴风信号 · 生效中',
    'tx.black.ball': '雨',
    'tx.black.label': '黑色暴雨警告',
    'tx.black.sub': '天文台发出 · 生效中',

    'bubble.obs': '天文台 · {label}',
    'bubble.dueToday': '今天 {n} 个事项到期 · 负担 {score}',
    'bubble.next': '下一场在 {n} 天后 · 负担 {score}',
    'bubble.calm': '未来 30 天平静',
    'bubble.today': '今天',
    'bubble.in': '{n} 天后',

    'toast.done': '「{title}」完成 —— 云散了',
    'toast.undo': '撤销',
    'toast.deletedEvent': '已删除「{title}」',
    'toast.deletedActivity': '已删除活动',
    'toast.activityAdded': '已加入活动 —— 港口会有船来',
    'toast.fileError': '文件读取失败',
    'toast.eventAdded': '已加入学期',
    'toast.noParse': '没解析到事件 —— 确认是 .ics 日历文件',
    'toast.noneSelected': '没有选中任何事件',
    'toast.imported': '已导入 {n} 个事项',

    'imp.head': '从日历里解析到 {n} 个事件，选要导入的',
    'imp.confirm': '导入选中',

    'lang.label': '语言',
    'lang.zhHant': '繁',
    'lang.zhHans': '简',

    'type.lab': '实验 / 作业',
    'type.per': '汇报 / 演示',
    'type.interview': '课上抽查',
    'type.quiz': '小测',
    'type.exam': '考试',
    'type.custom': '自定义',

    'level.clear': '晴',
    'level.cloudy': '多云',
    'level.overcast': '阴',
    'level.rain': '小雨',
    'level.storm': '雷暴',
    'level.t3': '三号风球',
    'level.t8': '八号风球',
    'level.black': '黑色暴雨',

    'curve.steady': '平稳',
    'curve.steep': '陡升',
    'curve.step': '台阶',
    'curve.long': '长坡',

    'city.generic': '通用岛',
    'city.hongkong': '香港',
  });

  const DICT = { en: EN, 'zh-Hant': ZH_HANT, 'zh-Hans': ZH_HANS };
  const CODE_KEY = { en: 'en', 'zh-Hant': 'zhHant', 'zh-Hans': 'zhHans' };

  /* ---------------- 状态与工具 ---------------- */

  let locale = DEFAULT_LOCALE;

  function normalize(code) {
    if (!code) return null;
    const c = String(code).trim().toLowerCase();
    if (c === 'en' || c === 'en-us' || c === 'en-gb') return 'en';
    if (c === 'zh' || c === 'zh-hans' || c === 'zh-cn' || c === 'zh-sg' || c === 'cn' || c === 'hans') return 'zh-Hans';
    if (c === 'zh-hant' || c === 'zh-tw' || c === 'zh-hk' || c === 'zh-mo' || c === 'tw' || c === 'hk' || c === 'hant') return 'zh-Hant';
    return null;
  }

  function readLocale() {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      const fromQuery = normalize(q);
      if (fromQuery) return fromQuery;
      const saved = normalize(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch (_) {}
    // 产品决定：默认英文，不跟随浏览器语言
    return DEFAULT_LOCALE;
  }

  function pick(map, key, n) {
    if (n === undefined || n === null) return map[key];
    const one = map[key + '.one'];
    const other = map[key + '.other'];
    if (one === undefined && other === undefined) return map[key];
    // 只写 .one 时，主 key 视为复数形式
    if (Number(n) === 1) return one !== undefined ? one : (other !== undefined ? other : map[key]);
    return other !== undefined ? other : map[key];
  }

  function interpolate(s, vars) {
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
  }

  function t(key, vars) {
    const dict = DICT[locale] || EN;
    const n = vars ? vars.n : undefined;
    let s = pick(dict, key, n);
    if (s === undefined) s = pick(EN, key, n);
    if (s === undefined) return key;
    return interpolate(s, vars);
  }

  /** 星期短名：中文去掉「週/周」前缀，英文原样 */
  function dowShort(dayKey) {
    const E = root.StormEngine;
    const full = E && E.dowOf ? E.dowOf(dayKey) : '';
    return String(full).replace(/^[週周]/, '');
  }

  /** 城市名字：优先词典，其次用城市自己声明的 label */
  function cityLabel(id, fallback) {
    const v = t('city.' + id);
    return v === 'city.' + id ? fallback : v;
  }

  /* ---------------- 应用到引擎与数据 ---------------- */

  function labelsPayload() {
    return {
      types: {
        lab: t('type.lab'), per: t('type.per'), interview: t('type.interview'),
        quiz: t('type.quiz'), exam: t('type.exam'), custom: t('type.custom'),
      },
      levels: {
        clear: t('level.clear'), cloudy: t('level.cloudy'), overcast: t('level.overcast'),
        rain: t('level.rain'), storm: t('level.storm'), t3: t('level.t3'),
        t8: t('level.t8'), black: t('level.black'),
      },
      curves: {
        steady: t('curve.steady'), steep: t('curve.steep'),
        step: t('curve.step'), long: t('curve.long'),
      },
      dow: locale === 'en'
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        : (locale === 'zh-Hant'
          ? ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
          : ['周日', '周一', '周二', '周三', '周四', '周五', '周六']),
    };
  }

  function applyEngine() {
    const E = root.StormEngine;
    if (E && E.setLabels) E.setLabels(labelsPayload());
    else if (E && E.setLabels === undefined) {
      // 兼容没升级的引擎：直接改标签
      labelsPayload();
    }
  }

  function applyStore() {
    const S = root.StormStore;
    if (S && typeof S.applyLocale === 'function') S.applyLocale(locale);
  }

  const hasDom = typeof document !== 'undefined';

  function applyStatic() {
    if (!hasDom) return;
    document.documentElement.lang = locale;
    document.documentElement.setAttribute('data-lang', locale);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });

    document.title = t('meta.title');
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.desc'));
  }

  /* ---------------- 语言切换器 ---------------- */

  function renderSwitch() {
    if (!hasDom) return;
    const html = SUPPORTED.map((code) => {
      const on = code === locale ? ' on' : '';
      return `<button class="lang-btn${on}" data-lang="${code}" type="button" aria-pressed="${code === locale}">${t('lang.' + CODE_KEY[code])}</button>`;
    }).join('');

    ['langSwitch', 'langSwitchHud'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
    ['langSwitch', 'langSwitchHud'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('aria-label', t('lang.label'));
    });
  }

  let clickBound = false;
  function bindSwitch() {
    if (clickBound || !hasDom) return;
    clickBound = true;
    document.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-lang]');
      if (!btn) return;
      const next = normalize(btn.getAttribute('data-lang'));
      if (next && next !== locale) setLocale(next);
    });
  }

  /* ---------------- 对外接口 ---------------- */

  function setLocale(code, opts) {
    const next = normalize(code) || DEFAULT_LOCALE;
    locale = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}

    applyEngine();
    applyStore();
    applyStatic();
    renderSwitch();

    const app = root.STORM_APP;
    if (app) {
      if (typeof app.refresh === 'function') app.refresh();
      if (typeof app.renderAll === 'function') app.renderAll();
    }
    if (!opts || !opts.silent) {
      try {
        const url = new URL(location.href);
        if (url.searchParams.has('lang')) {
          url.searchParams.set('lang', next);
          history.replaceState(null, '', url.toString());
        }
      } catch (_) {}
    }
    return next;
  }

  function init() {
    locale = readLocale();
    applyEngine();
    applyStore();
    applyStatic();
    bindSwitch();
    renderSwitch();
    return locale;
  }

  root.StormI18N = {
    init,
    t,
    setLocale,
    cityLabel,
    dowShort,
    renderSwitch,
    current: () => locale,
    supported: SUPPORTED.slice(),
    normalize,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
