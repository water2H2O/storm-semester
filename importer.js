/* ============================================================
   Storm Semester — 日历导入
   解析 iCalendar (.ics) 文本：Moodle / Google 日历 / Outlook 都能导出。
   纯前端，不上传任何文件。
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StormImport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');

  /** iCalendar 的折行：换行后紧跟空格或制表符表示续行 */
  function unfold(text) {
    return String(text)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n[ \t]/g, '');
  }

  function unescapeText(v) {
    return String(v)
      .replace(/\\n/gi, ' ')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  /** DTSTART 的几种写法 → ISO 字符串（统一成 +08:00） */
  function toISO(value, params) {
    const m = String(value).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
    if (!m) return null;
    const [, y, mo, d, hh, mi, ss, z] = m;

    // 只有日期：当成当天 23:59
    if (!hh) return `${y}-${mo}-${d}T23:59:00+08:00`;

    // 带 Z：UTC，换算到 +08:00
    if (z) {
      const utc = Date.UTC(+y, +mo - 1, +d, +hh, +mi, +ss);
      const hk = new Date(utc + 8 * 3600 * 1000);
      return `${hk.getUTCFullYear()}-${pad(hk.getUTCMonth() + 1)}-${pad(hk.getUTCDate())}`
        + `T${pad(hk.getUTCHours())}:${pad(hk.getUTCMinutes())}:${pad(hk.getUTCSeconds())}+08:00`;
    }

    // 带 TZID 或裸时间：按本地（+08:00）处理
    return `${y}-${mo}-${d}T${hh}:${mi}:${ss}+08:00`;
  }

  /** 从标题猜类型 */
  function guessType(summary) {
    const s = String(summary).toLowerCase();
    // 注意：不要用裸的 final，否则 "Assignment 3 final" 会被误判成考试
    if (/(exam|midterm|期末考|期中考|考试|\bca\b.*\btest\b)/.test(s)) return 'exam';
    if (/(quiz|小测|测验|随堂测)/.test(s)) return 'quiz';
    if (/(interview|viva|抽查|口试)/.test(s)) return 'interview';
    if (/(presentation|pitch|\bdemo\b|汇报|演示|演讲|present)/.test(s)) return 'per';
    return 'lab';
  }

  /**
   * 解析 .ics 文本
   * @returns {Array<{summary, due, location, description, type}>}
   */
  function parseICS(text) {
    const out = [];
    const blocks = unfold(text).split('BEGIN:VEVENT').slice(1);

    for (const block of blocks) {
      const body = block.split('END:VEVENT')[0];
      const lines = body.split('\n').filter((l) => l.trim());

      let summary = '';
      let due = null;
      let location = '';
      let description = '';
      let hasStart = false;
      let cancelled = false;

      for (const line of lines) {
        const colon = line.indexOf(':');
        if (colon < 0) continue;
        const head = line.slice(0, colon);
        const value = line.slice(colon + 1);
        const [rawName, ...params] = head.split(';');
        const name = rawName.toUpperCase();

        if (name === 'SUMMARY') summary = unescapeText(value);
        else if (name === 'LOCATION') location = unescapeText(value);
        else if (name === 'DESCRIPTION') description = unescapeText(value).slice(0, 160);
        else if (name === 'STATUS' && /CANCEL/i.test(value)) cancelled = true;
        else if (name === 'DTSTART') {
          hasStart = true;
          due = toISO(value, params);
        } else if (name === 'DTEND' && !hasStart) {
          // 没有 DTSTART 时退化用 DTEND
          due = toISO(value, params);
        }
      }

      if (!summary || !due || cancelled) continue;
      out.push({
        summary,
        due,
        location,
        description,
        type: guessType(summary),
      });
    }

    // 去重（同一标题 + 同一时间）
    const seen = new Set();
    return out.filter((e) => {
      const k = `${e.summary}|${e.due}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  return { parseICS, guessType, toISO, unfold };
});
