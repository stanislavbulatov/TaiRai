/* ============ Настройки: заполнить перед запуском ============ */
var CONFIG = {
  // Ссылка на Telegram Адели, например 'https://t.me/username'. Пока пусто, кнопки ведут к форме.
  telegram: '',
  // Адрес приёма заявок (POST JSON). Пока пусто, форма показывает экран «напишите в Telegram».
  formEndpoint: '',
  // Номер счётчика Яндекс Метрики для целей (если подключена)
  ymId: 0,
  consentVersion: '2026-11-09'
};

(function () {
  'use strict';

  /* ---------- Аналитика ---------- */
  window.dataLayer = window.dataLayer || [];
  function track(name, params) {
    try {
      window.dataLayer.push(Object.assign({ event: name }, params || {}));
      // Метрика получает цели только после согласия на аналитические cookie
      if (consent === 'all' && CONFIG.ymId && typeof window.ym === 'function') window.ym(CONFIG.ymId, 'reachGoal', name, params || {});
    } catch (e) { /* аналитика не ломает страницу */ }
  }

  /* ---------- Cookie ---------- */
  var CK_KEY = 'ck_consent_v1';
  var consent = null;
  try { consent = localStorage.getItem(CK_KEY); } catch (e) { /* хранилище недоступно */ }
  window.cookieConsent = function () { return consent; };

  var ckb = document.getElementById('ckb');
  if (ckb && !consent) {
    ckb.hidden = false;
    var showCk = function () {
      if (window.scrollY < 200) return;
      window.removeEventListener('scroll', showCk);
      ckb.classList.add('is-on');
    };
    window.addEventListener('scroll', showCk, { passive: true });
    showCk();
    ckb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ck]');
      if (!b) return;
      consent = b.getAttribute('data-ck');
      try { localStorage.setItem(CK_KEY, consent); } catch (err) { /* без сохранения покажем снова */ }
      ckb.classList.remove('is-on');
      setTimeout(function () { ckb.hidden = true; }, 300);
      if (consent === 'all') document.dispatchEvent(new CustomEvent('cookie-consent-all'));
    });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ev]');
    if (el) track(el.getAttribute('data-ev'), { place: el.getAttribute('data-place') || '' });
  });

  /* ---------- Telegram ---------- */
  var tgLinks = document.querySelectorAll('.js-tg');
  if (CONFIG.telegram) {
    tgLinks.forEach(function (a) {
      a.href = CONFIG.telegram;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ---------- Мобильное меню ---------- */
  var burger = document.querySelector('.hdr__burger');
  var mnav = document.getElementById('mnav');
  function setMenu(open) {
    mnav.classList.toggle('is-open', open);
    mnav.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('is-locked', open);
  }
  burger.addEventListener('click', function () { setMenu(!mnav.classList.contains('is-open')); });
  mnav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });

  /* ---------- Поп-ап ---------- */
  var modal = document.getElementById('modal');
  var lastFocus = null;
  function openModal() {
    setMenu(false);
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    var first = modal.querySelector('.modal__close');
    if (first) first.focus({ focusVisible: false });
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus({ focusVisible: false });
  }
  document.querySelectorAll('.js-open-modal').forEach(function (b) { b.addEventListener('click', openModal); });
  modal.querySelectorAll('.js-close-modal').forEach(function (b) { b.addEventListener('click', closeModal); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (modal.classList.contains('is-open')) closeModal(); setMenu(false); }
  });
  // Пока нет ссылки на Telegram, кнопки в поп-апе прокручивают к форме на странице, поэтому закрываем окно
  modal.addEventListener('click', function (e) {
    var a = e.target.closest('.js-tg');
    if (a && !CONFIG.telegram) closeModal();
  });
  if (/[?&]popup=1/.test(location.search)) openModal();

  /* ---------- Формы ---------- */
  function utm() {
    var p = new URLSearchParams(location.search), out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'].forEach(function (k) {
      if (p.get(k)) out[k] = p.get(k);
    });
    return out;
  }
  var landing = location.href;

  document.querySelectorAll('.js-form').forEach(function (form) {
    var started = false;
    var err = form.querySelector('.form__err');

    form.addEventListener('input', function () {
      if (!started) { started = true; track('form_start', { place: form.dataset.place }); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name, contact = form.elements.contact, consent = form.elements.consent;
      var ok = true;
      [name, contact].forEach(function (f) {
        var bad = f.value.trim().length < 2;
        f.classList.toggle('is-invalid', bad);
        if (bad) ok = false;
      });
      var consentBox = consent.closest('.form__consent');
      consentBox.classList.toggle('is-invalid', !consent.checked);
      if (!consent.checked) ok = false;
      if (!ok) {
        err.textContent = !consent.checked && name.value.trim() && contact.value.trim()
          ? 'Отметьте согласие на обработку данных'
          : 'Заполните имя и контакт';
        err.classList.add('is-on');
        return;
      }
      err.classList.remove('is-on');

      var method = form.querySelector('input[name="method"]:checked');
      var payload = {
        name: name.value.trim(),
        contact: contact.value.trim(),
        method: method ? method.value : '',
        question: form.elements.question ? form.elements.question.value.trim() : '',
        place: form.dataset.place,
        suspicious: form.elements.hp_nickname_x.value ? 1 : 0, // ловушка: помечаем, не выбрасываем
        consent: { given: true, version: CONFIG.consentVersion, at: new Date().toISOString() },
        page: landing,
        referrer: document.referrer,
        device: window.matchMedia('(max-width:760px)').matches ? 'mobile' : 'desktop',
        utm: utm()
      };

      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true;

      if (!CONFIG.formEndpoint) { finish(false); return; }
      fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { finish(r.ok); }).catch(function () { finish(false); });

      function finish(success) {
        btn.disabled = false;
        form.classList.add(success ? 'is-done' : 'is-fail');
        if (success) track('form_submit', { place: form.dataset.place, method: payload.method });
        else track('form_error', { place: form.dataset.place });
      }
    });
  });

  /* ---------- Мобильная панель прячется у формы ---------- */
  var mbar = document.querySelector('.mbar');
  var contact = document.getElementById('contact');
  var hero = document.querySelector('.hero');
  if ('IntersectionObserver' in window && mbar) {
    var hideAt = { contact: false, hero: true };
    var upd = function () {
      var hidden = hideAt.contact || hideAt.hero;
      mbar.classList.toggle('is-hidden', hidden);
      if (ckb) ckb.classList.toggle('is-low', hidden); // баннер опускается, когда панели нет
    };
    new IntersectionObserver(function (en) { hideAt.contact = en[0].isIntersecting; upd(); }, { threshold: 0.05 }).observe(contact);
    new IntersectionObserver(function (en) { hideAt.hero = en[0].isIntersecting; upd(); }, { threshold: 0.35 }).observe(hero);
  }

  /* ---------- Просмотры блоков ---------- */
  if ('IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        track(el.getAttribute('data-ev-view'));
        if (el.classList.contains('income')) el.classList.add('is-seen');
        seen.unobserve(el);
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('[data-ev-view]').forEach(function (el) { seen.observe(el); });
  } else {
    document.querySelectorAll('.income').forEach(function (el) { el.classList.add('is-seen'); });
  }

  /* ---------- FAQ ---------- */
  document.querySelectorAll('.faq__item').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) track('faq_open', { q: d.querySelector('summary').textContent.trim() });
    });
  });

  /* ---------- Глубина прокрутки ---------- */
  var s75 = false;
  window.addEventListener('scroll', function () {
    if (s75) return;
    var h = document.documentElement;
    if ((h.scrollTop + innerHeight) / h.scrollHeight >= 0.75) { s75 = true; track('scroll_75'); }
  }, { passive: true });

  /* ---------- Появление блоков (только ниже первого экрана) ---------- */
  var rv = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rv.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) {
      if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in');
      else io.observe(el);
    });
  }
})();
