/*
  Логіка підбору курсів. Редагувати не потрібно — налаштування лежать у settings/.
  Працює в браузері (window.Engine) і в Node.js (require) для перевірки.
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const byRole = (qs, role) => qs.find((q) => q.роль === role) || null;
  const chosen = (q, answers) => (q ? q.варіанти.filter((o) => asList(answers[q.id]).includes(o.id)) : []);
  const fill = (tpl, vars) => String(tpl).replace(/\{([^}]+)\}/g, (m, k) => (k in vars ? vars[k] : m));

  // Найближчий потік, що ще не почався
  function nextStream(course, today) {
    return (course.потоки || []).filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.старт) && p.старт >= today)
      .sort((a, b) => a.старт.localeCompare(b.старт))[0] || null;
  }

  function withMark(url, mark) {
    if (!url || !mark) return url || '';
    return url + (url.includes('?') ? '&' : '?') + mark;
  }

  function pick(settings, answers, today) {
    const { questions, rules, courses } = settings;
    const B = rules.бали;
    const interestOpts = chosen(byRole(questions, 'інтереси'), answers);
    const dirs = interestOpts.filter((o) => o.напрям).map((o) => o.напрям);
    const popular = !dirs.length;
    // Рівень окремо для кожного напряму: 1 — з нуля, 2 — є навичка, 3 — є навичка й робота в напрямі
    const dirsOf = (role) => new Set(chosen(byRole(questions, role), answers).flatMap((o) => o.напрями || []));
    const skillDirs = dirsOf('навички');
    const workDirs = dirsOf('досвід');
    const levelFor = (d) => 1 + (skillDirs.has(d) ? 1 : 0) + (skillDirs.has(d) && workDirs.has(d) ? 1 : 0);
    const scored = courses
      .filter((c) => c.показувати === true && c.посилання)
      .map((c) => ({ c, p: nextStream(c, today) }))
      .filter((x) => x.p)
      .map(({ c, p }) => {
        let s = 0;
        let dir = null;
        if (popular) { if (!c.популярний) return null; }
        else {
          const main = dirs.indexOf(c.напрями[0]);
          const side = dirs.findIndex((d) => c.напрями.slice(1).includes(d));
          if (main >= 0) { s += B.основнийНапрям; dir = dirs[main]; }
          else if (side >= 0) { s += B.суміжнийНапрям; dir = dirs[side]; }
          else return null;
        }
        const diff = c.рівень - levelFor(dir || c.напрями[0]);
        if (diff > 1) return null; // курс для набагато досвідченіших — не радимо
        s += diff === 0 ? B.рівеньТочно : diff === -1 ? B.рівеньНижче : diff === 1 ? B.рівеньВище : 0;
        return { курс: c, потік: p, бали: s, напрям: dir, складніший: diff > 0, посилання: withMark(c.посилання, settings.texts.посилання.мітка) };
      })
      .filter(Boolean)
      .sort((a, b) => b.бали - a.бали || a.потік.старт.localeCompare(b.потік.старт) || a.курс.назва.localeCompare(b.курс.назва));

    // Набір: по черзі беремо найкращий курс з кожного обраного напряму, щоб набір був різноманітним
    const set = [];
    const take = (x) => { if (x && !set.includes(x) && set.length < rules.уНаборі) set.push(x); };
    if (!popular) {
      for (let round = 0; set.length < rules.уНаборі && round < rules.уНаборі; round++) {
        for (const d of dirs) take(scored.find((x) => !set.includes(x) && x.напрям === d));
      }
    }
    for (const x of scored) take(x);
    const more = scored.filter((x) => !set.includes(x)).slice(0, rules.щеВарто);
    return { популярне: popular, набір: set, щеВарто: more, напрями: dirs };
  }

  function validate(q, value) {
    const list = asList(value);
    if (!list.length) return q.тип === 'один' ? 'оберіть' : 'оберітьКілька';
    if (q.максимум && list.length > q.максимум) return 'максимум';
    return null;
  }

  function toggle(q, current, id) {
    const opt = q.варіанти.find((o) => o.id === id);
    if (!opt) return current;
    if (current.includes(id)) return current.filter((x) => x !== id);
    if (opt.незнаю) return [id];
    const next = current.filter((x) => !q.варіанти.some((o) => o.незнаю && o.id === x));
    if (q.максимум && next.length >= q.максимум) return next;
    return [...next, id];
  }

  return { pick, nextStream, validate, toggle, fill, withMark };
});
