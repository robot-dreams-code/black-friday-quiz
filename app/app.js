/*
  Інтерфейс квізу «Чорна п'ятниця». Редагувати не потрібно — тексти, питання й курси лежать у settings/.
*/
(function () {
  'use strict';

  const main = document.getElementById('main');
  const T = window.ТЕКСТИ;
  const QS = window.ПИТАННЯ;
  const E = window.Engine;
  const settings = { questions: QS, rules: window.ПРАВИЛА, texts: T, courses: window.КУРСИ };
  const STORAGE = 'rd-bf-quiz-v1';
  // Затримка появи курсів у результаті: перший — через first мс, кожен наступний — ще через step мс
  const STAGGER = { first: 350, step: 450 };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fill = (tpl, vars) => esc(E.fill(tpl, vars));
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const ICON = {
    check: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5 6.5 12 13 4.5"/></svg>',
    arrow: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9"/></svg>',
  };
  const newTab = '<span class="sr-only"> (відкриється в новій вкладці)</span>';
  const link = (href, inner, cls, data = '') => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="${cls}" ${data}>${inner}${newTab}</a>`;
  const promoUrl = () => E.withMark(T.акція.посилання, T.посилання.мітка);
  const promoBtn = (cls, where) => link(promoUrl(), `${esc(T.акція.кнопка)} ${ICON.arrow}`, `btn ${cls}`, `data-promo="${where}"`);
  const logo = (onDark) => `<button type="button" class="logo" data-action="home" aria-label="robot_dreams — на початок квізу"><img src="app/img/${onDark ? 'logo-light' : 'logo-dark'}.png" alt="" width="240" height="145"></button>`;

  /* ---------- стан ---------- */
  const fresh = () => ({ screen: 'intro', i: 0, answers: {}, session: newId(), startedAt: Date.now() });
  function newId() { return (window.crypto && crypto.randomUUID && crypto.randomUUID()) || `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
  let state;
  try { state = JSON.parse(sessionStorage.getItem(STORAGE)) || fresh(); } catch (e) { state = fresh(); }
  const save = () => { try { sessionStorage.setItem(STORAGE, JSON.stringify(state)); } catch (e) { /* приватний режим */ } };
  let error = null;

  /* ---------- статистика (якщо задано адресу) ---------- */
  function track(event, data) {
    const s = T.статистика || {};
    if (!s.адреса) return;
    const body = JSON.stringify(Object.assign({ event, source: s.джерело, session_id: state.session, at: new Date().toISOString() }, data || {}));
    try {
      const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
      if (!(navigator.sendBeacon && navigator.sendBeacon(s.адреса, blob))) fetch(s.адреса, { method: 'POST', body, keepalive: true }).catch(() => {});
    } catch (e) { /* статистика ніколи не ламає квіз */ }
  }

  /* ---------- верхня панель ---------- */
  function bar(dark) {
    const A = T.акція;
    return `<header class="bar ${dark ? 'dark' : 'bar--light'}"><div class="wrap bar__in">
      ${logo(dark)}
      ${link(promoUrl(), `${esc(T.вступ.шапка)} <span>${esc(A.знижка)}</span>`, 'bf-chip', 'data-promo="header"')}
    </div></header>`;
  }

  /* ---------- перший екран ---------- */
  // Дві перехресні стрічки «BLACK FRIDAY · −40 %», що повільно їдуть назустріч одна одній
  function tapes() {
    const v = T.вступ;
    const unit = `<span>${esc(v.напис.join(' '))}</span><b>${esc(T.акція.знижка)}</b><i>✱</i>`;
    const run = (cls) => `<div class="tape ${cls}"><div class="tape__track">${unit.repeat(8)}</div><div class="tape__track" aria-hidden="true">${unit.repeat(8)}</div></div>`;
    return `<div class="tapes" aria-hidden="true">${run('tape--back')}${run('tape--front')}</div>`;
  }

  // Превʼю добірки: три рядки, назви курсів у яких по черзі змінюються
  const PREVIEW_POOL = (window.КУРСИ || []).filter((c) => c.показувати && c.посилання).map((c) => ({ назва: c.назва, напрям: T.напрями[c.напрями[0]] }));
  function preview() {
    const v = T.вступ;
    const rows = [0, 1, 2].map((k) => {
      const c = PREVIEW_POOL[(k * 7) % PREVIEW_POOL.length] || { назва: '', напрям: '' };
      return `<li class="pv__row" style="--k:${k}"><span class="pv__num">0${k + 1}</span><span class="pv__txt"><b data-pv-name>${esc(c.назва)}</b><small data-pv-dir>${esc(c.напрям)}</small></span><span class="pv__tag">${esc(T.акція.знижка)}</span></li>`;
    }).join('');
    return `<div class="pv-wrap" aria-hidden="true"><div class="pv">
      <div class="pv__head"><span class="pv__dot"></span><span>${esc(v.превʼю)}</span><span class="pv__count" data-pv-count>${PREVIEW_POOL.length}+</span></div>
      <ol class="pv__list">${rows}</ol>
      <div class="pv__foot"><span>${esc(v.превʼюПідпис)}</span><span class="pv__bar"><i></i></span></div>
    </div></div>`;
  }
  let pvTimer = null;
  function startPreview() {
    clearInterval(pvTimer);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !PREVIEW_POOL.length) return;
    let step = 0;
    pvTimer = setInterval(() => {
      const rows = main.querySelectorAll('.pv__row');
      if (!rows.length) return clearInterval(pvTimer);
      step += 1;
      const k = step % rows.length;
      const row = rows[k];
      const c = PREVIEW_POOL[(step * 5 + k * 11) % PREVIEW_POOL.length];
      row.classList.add('is-swap');
      setTimeout(() => {
        row.querySelector('[data-pv-name]').textContent = c.назва;
        row.querySelector('[data-pv-dir]').textContent = c.напрям;
        row.classList.remove('is-swap');
      }, 260);
    }, 1400);
  }

  function intro() {
    const v = T.вступ;
    const interests = QS.find((q) => q.роль === 'інтереси');
    const dirOpts = interests ? interests.варіанти.filter((o) => o.напрям) : [];
    const title = esc(v.заголовок).replace('{знижка}', `<mark>${esc(T.акція.знижка)}</mark>`);
    return `${bar(true)}
    <section class="dark hero" aria-labelledby="hero-title">
      <div class="wrap hero__in">
        <div class="lead">
          <div class="lead__text">
            <p class="lead__kicker"><span class="pulse" aria-hidden="true"></span>${esc(v.кікер)}</p>
            <h1 id="hero-title" tabindex="-1">${title}</h1>
            <p class="lead__sub">${esc(v.підзаголовок)}</p>
            <div class="lead__cta">
              <button type="button" class="btn btn--accent btn--big" data-action="start">${esc(v.кнопка)} <span aria-hidden="true">→</span></button>
              ${link(promoUrl(), `${esc(v.абоОдразу)} ${ICON.arrow}`, 'btn btn--link', 'data-promo="intro"')}
            </div>
          </div>
          ${preview()}
        </div>
        <ol class="steps">${v.кроки.map((s, k) => `<li><span class="steps__num" aria-hidden="true">0${k + 1}</span><span class="steps__arrow" aria-hidden="true">↘</span><p>${esc(s)}</p></li>`).join('')}</ol>
        <section class="pick-dir" aria-labelledby="dirs-title">
          <div class="pick-dir__head">
            <h2 id="dirs-title">${esc(v.блокЗаголовок)}</h2>
            <p>${esc(v.блокТекст)}</p>
          </div>
          <ul class="dirtags">${dirOpts.map((o) => `<li><button type="button" data-start-dir="${esc(o.id)}">${esc(T.напрями[o.напрям])} <span aria-hidden="true">→</span></button></li>`).join('')}</ul>
        </section>
      </div>
    </section>`;
  }

  /* ---------- питання ---------- */
  function question() {
    const q = QS[state.i];
    const many = q.тип === 'кілька';
    const picked = [].concat(state.answers[q.id] || []);
    const atLimit = many && q.максимум && picked.length >= q.максимум;
    const last = state.i === QS.length - 1;
    const options = q.варіанти.map((o) => {
      const on = picked.includes(o.id);
      const off = atLimit && !on && !o.незнаю;
      const solo = !many || o.незнаю;
      return `<label class="option option--${solo ? 'one' : 'many'}${o.незнаю ? ' option--special' : ''}">
        <input type="${many ? 'checkbox' : 'radio'}" name="${esc(q.id)}" value="${esc(o.id)}" ${on ? 'checked' : ''} ${off ? 'disabled' : ''}>
        <span class="mark" aria-hidden="true">${ICON.check}</span><span>${esc(o.текст)}</span></label>`;
    }).join('');
    const pct = Math.round((state.i / QS.length) * 100);
    return `${bar(false)}
    <div class="progress" role="progressbar" aria-label="Прогрес" aria-valuemin="0" aria-valuemax="${QS.length}" aria-valuenow="${state.i}"><i style="width:${pct}%"></i></div>
    <div class="qpage">
      <form class="wrap qwrap" data-form novalidate>
        <div class="qhead">
          <p class="qnum">${fill(T.кнопки.прогрес, { n: state.i + 1, всього: QS.length })}</p>
          <h1 id="q-title" tabindex="-1">${esc(q.текст)}</h1>
          ${q.підказка ? `<p class="hint" id="q-hint">${esc(q.підказка)}${many && q.максимум ? ` <b class="count">${picked.filter((x) => !q.варіанти.find((o) => o.id === x && o.незнаю)).length}/${q.максимум}</b>` : ''}</p>` : ''}
        </div>
        <fieldset class="options${q.варіанти.length > 5 ? ' options--grid' : ''}" aria-labelledby="q-title" ${q.підказка ? 'aria-describedby="q-hint"' : ''}>${options}</fieldset>
        ${error ? `<p class="notice" role="alert">${fill(T.помилки[error], { n: q.максимум || '' })}</p>` : ''}
        <div class="qnav">
          <button type="button" class="btn btn--white" data-action="back">${esc(T.кнопки.назад)}</button>
          ${many || last || picked.length ? `<button type="submit" class="btn btn--dark">${esc(last ? T.кнопки.показати : T.кнопки.далі)} <span aria-hidden="true">→</span></button>` : ''}
        </div>
      </form>
    </div>`;
  }

  /* ---------- результат ---------- */
  function result() {
    const R = T.результат;
    const res = E.pick(settings, state.answers, today());
    if (!state.reported) {
      state.reported = true;
      // Відповіді текстом, по ролі питання: інтереси, досвід, навички
      const said = (role) => {
        const q = QS.find((x) => x.роль === role);
        if (!q) return '';
        const ids = [].concat(state.answers[q.id] || []);
        return q.варіанти.filter((o) => ids.includes(o.id)).map((o) => o.текст).join('; ');
      };
      track('quiz_completed', {
        interests: said('інтереси'), occupation: said('досвід'), skills: said('навички'),
        duration_sec: Math.round((Date.now() - state.startedAt) / 1000),
        courses: res.набір.map((x) => x.курс.назва), more: res.щеВарто.map((x) => x.курс.назва),
      });
    }
    const n = res.набір.length;
    const title = res.популярне ? R.заголовокПопулярне : n === 1 ? R.заголовокОдин : fill(R.заголовок, { n });
    const rows = res.набір.map((x, k) => {
      const c = x.курс;
      const tags = [x.напрям ? T.напрями[x.напрям] : T.напрями[c.напрями[0]], fill(R.старт, { дата: x.потік.текст })];
      return `<li class="pick reveal" style="--d:${STAGGER.first + k * STAGGER.step}ms">
        <span class="pick__num" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span>
        <div class="pick__body">
          <p class="pick__name">${esc(c.назва)}</p>
          <p class="pick__meta">${tags.map(esc).join(' · ')}${x.складніший ? ` <span class="pill pill--soft">${esc(R.потрібнаБаза)}</span>` : ''}</p>
        </div>
        ${link(x.посилання, `${esc(R.проКурс)} ${ICON.arrow}`, 'pick__link', `data-course="${esc(c.назва)}"`)}
      </li>`;
    }).join('');
    const moreStart = STAGGER.first + n * STAGGER.step + 150;
    const more = res.щеВарто.map((x, k) => `<li class="reveal" style="--d:${moreStart + k * 120}ms">${link(x.посилання, `${esc(x.курс.назва)} ${ICON.arrow}`, 'chip', `data-course="${esc(x.курс.назва)}"`)}</li>`).join('');

    return `${bar(true)}
    <section class="dark rhead" aria-labelledby="result-title">
      <div class="wrap rhead__in">
        <p class="kicker"><span class="tag">${esc(R.мітка)}</span></p>
        <h1 id="result-title" tabindex="-1">${esc(title)}</h1>
        <p class="rhead__lead">${esc(R.текст)}</p>
        ${promoBtn('btn--accent btn--big', 'top')}
      </div>
    </section>
    <div class="wrap results">
      ${n ? `<ol class="picks">${rows}</ol>` : `<p class="empty">${esc(R.порожньо)}</p>`}
      ${more ? `<section class="more" aria-labelledby="more-title"><h2 id="more-title">${esc(R.щеВарто)}</h2><ul class="chips">${more}</ul></section>` : ''}
      <section class="offer reveal" style="--d:${moreStart + res.щеВарто.length * 120 + 150}ms" aria-labelledby="offer-title">
        <div><p class="tag tag--dark">${esc(T.акція.мітка)} ${esc(T.акція.знижка)}</p><h2 id="offer-title">${esc(R.низЗаголовок)}</h2><p>${esc(R.низТекст)}</p></div>
        ${promoBtn('btn--dark btn--big', 'bottom')}
      </section>
      <p class="again"><button type="button" class="btn btn--link" data-action="restart">${esc(R.пройтиЩе)}</button></p>
    </div>`;
  }

  /* ---------- рендер і події ---------- */
  function render(focus) {
    main.innerHTML = state.screen === 'intro' ? intro() : state.screen === 'q' ? question() : result();
    document.body.dataset.screen = state.screen;
    if (state.screen === 'intro') startPreview(); else clearInterval(pvTimer);
    save();
    if (focus === 'title') {
      const t = document.getElementById({ intro: 'hero-title', q: 'q-title', result: 'result-title' }[state.screen]);
      if (t) t.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    } else if (focus) {
      const el = main.querySelector(focus);
      if (el) el.focus();
    }
  }
  function go(screen, i) {
    error = null;
    state.screen = screen;
    if (typeof i === 'number') state.i = i;
    render('title');
  }
  function next() {
    if (state.i + 1 < QS.length) { track('step_viewed', { step: state.i + 2 }); go('q', state.i + 1); }
    else { state.reported = false; go('result'); }
  }

  let autoNext = null;
  main.addEventListener('click', (e) => {
    const dirBtn = e.target.closest('[data-start-dir]');
    if (dirBtn) {
      state = fresh();
      const q0 = QS.find((q) => q.роль === 'інтереси');
      if (q0) state.answers[q0.id] = [dirBtn.dataset.startDir];
      track('quiz_started', { from_direction: dirBtn.dataset.startDir });
      return go('q', 0);
    }
    const t = e.target.closest('[data-action],[data-course],[data-promo]');
    if (!t) return;
    if (t.dataset.course) return track('course_clicked', { course: t.dataset.course });
    if (t.dataset.promo) return track('promo_clicked', { where: t.dataset.promo });
    switch (t.dataset.action) {
      case 'start':
      case 'restart':
        if (t.dataset.action === 'restart') track('quiz_restarted');
        state = fresh();
        track('quiz_started');
        go('q', 0);
        break;
      case 'back':
        clearTimeout(autoNext);
        state.i === 0 ? go('intro') : go('q', state.i - 1);
        break;
      case 'home':
        go('intro');
        break;
    }
  });

  main.addEventListener('change', (e) => {
    const input = e.target;
    if (!input.name || state.screen !== 'q') return;
    const q = QS[state.i];
    const current = [].concat(state.answers[q.id] || []);
    state.answers[q.id] = q.тип === 'кілька' ? E.toggle(q, current, input.value) : input.value;
    error = null;
    render(`input[name="${q.id}"][value="${input.value}"]`);
    if (q.тип === 'один') { clearTimeout(autoNext); autoNext = setTimeout(next, 280); }
  });

  main.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = QS[state.i];
    error = E.validate(q, state.answers[q.id]);
    if (error) return render();
    next();
  });

  render();
})();
