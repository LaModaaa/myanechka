const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- Работает всегда, даже без GSAP ---------- */

// Шапка прячется при прокрутке вниз и возвращается при прокрутке вверх
let lastY = 0;
addEventListener('scroll', () => {
  $('.header').classList.toggle('hide', scrollY > lastY && scrollY > 300);
  lastY = scrollY;
}, { passive: true });

// Вкладки меню
$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  const i = +tab.dataset.tab;
  $$('.tab').forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', k === i); });
  $$('.panel').forEach((p, k) => p.classList.toggle('on', k === i));
  $$('.mp').forEach((p, k) => p.classList.toggle('on', k === i));
  if (window.gsap && !reduce) gsap.from($$('.panel.on li'), { x: -30, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'power3.out' });
}));

// Плавный переход по ссылкам меню (CSS scroll-behavior: smooth ломает ScrollTrigger)
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const el = document.querySelector(a.getAttribute('href'));
  if (el) { e.preventDefault(); el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
}));

const fmt = (v, dec) => dec ? v.toFixed(dec).replace('.', ',') : Math.round(v).toLocaleString('ru-RU');

// Без GSAP (CDN не загрузился) или при «уменьшить движение» – показываем всё статично
if (!window.gsap || !window.ScrollTrigger || reduce) {
  document.documentElement.classList.add('no-gsap');
  $$('[data-count]').forEach(el => el.textContent = fmt(+el.dataset.count, +(el.dataset.dec || 0)));
} else {
  motion();
}

/* ---------- Моушн ---------- */
function motion() {
  gsap.registerPlugin(ScrollTrigger);

  // Разбивка текста на слова для покадровых анимаций
  const splitWords = el => {
    const esc = w => w.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w"><span>${esc(w)}</span></span>`).join(' ');
    return el.querySelectorAll('.w > span');
  };

  // 1. Вступление первого экрана – стартует, когда уезжает прелоадер
  gsap.timeline({ delay: 1.9 })
    .from('.blob', { scale: 0, duration: 1.3, ease: 'elastic.out(1, .6)' }, 0)
    .from('.hero-main', { scale: 0.3, rotate: -25, opacity: 0, duration: 1.1, ease: 'back.out(1.6)' }, 0.15)
    .from('.hero .line > span', { yPercent: 115, duration: 1, ease: 'expo.out', stagger: 0.12 }, 0.1)
    .from('.hero .script', { opacity: 0, y: 20, duration: 0.6 }, 0.1)
    .from('.hero-sub, .hero-btns', { opacity: 0, y: 30, stagger: 0.1, duration: 0.8, ease: 'power3.out' }, 0.6)
    .from('.float, .sticker', { scale: 0, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'back.out(2.2)' }, 0.5);

  // 2. Меняющееся слово: «Это не яблоко / гранат / мишка…»
  const words = $$('.swap b');
  gsap.set(words.slice(1), { opacity: 1, yPercent: 110 });
  let wi = 0;
  const nextWord = () => {
    const cur = words[wi];
    wi = (wi + 1) % words.length;
    gsap.to(cur, { yPercent: -110, duration: 0.55, ease: 'power3.in' });
    gsap.fromTo(words[wi], { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'back.out(1.8)', delay: 0.4 });
    gsap.delayedCall(2.2, nextWord);
  };
  gsap.delayedCall(4, nextWord);

  // 3. Парящие десерты: покачиваются сами и следуют за мышью
  gsap.to('.float', { rotation: 7, yoyo: true, repeat: -1, duration: 2.6, ease: 'sine.inOut', stagger: 0.5 });
  gsap.to('.sticker', { rotation: -10, yoyo: true, repeat: -1, duration: 1.8, ease: 'sine.inOut' });
  if (fine) {
    const items = $$('[data-depth]');
    addEventListener('mousemove', e => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      items.forEach(el => gsap.to(el, { x: x * el.dataset.depth, y: y * el.dataset.depth, duration: 1, ease: 'power3.out' }));
    });
  }

  // Уход первого экрана при прокрутке
  gsap.to('.hero-visual', { yPercent: 18, scale: 0.88, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-text', { yPercent: -12, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center top', end: 'bottom top', scrub: true } });

  // 4. Ленты: бегут бесконечно и ускоряются от скорости прокрутки
  const tapes = $$('.tape-in').map((el, k) => k
    ? gsap.fromTo(el, { xPercent: -50 }, { xPercent: 0, repeat: -1, duration: 30, ease: 'none' })
    : gsap.to(el, { xPercent: -50, repeat: -1, duration: 30, ease: 'none' }));
  let boost = 0;
  ScrollTrigger.create({ onUpdate: s => { boost = Math.min(Math.abs(s.getVelocity()) / 220, 9); } });
  gsap.ticker.add(() => { boost *= 0.93; tapes.forEach(t => t.timeScale(1 + boost)); });
  gsap.fromTo('.tape-pink', { rotate: -7 }, { rotate: -2, ease: 'none', scrollTrigger: { trigger: '.tapes', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.tape-ink', { rotate: 6 }, { rotate: 2, ease: 'none', scrollTrigger: { trigger: '.tapes', start: 'top bottom', end: 'bottom top', scrub: true } });

  // 5. Манифест: слова «загораются» по мере прокрутки
  gsap.fromTo(splitWords($('.manifest-text')), { opacity: 0.12 }, {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.manifest', start: 'top 75%', end: 'bottom 55%', scrub: true }
  });

  // Заголовки секций выезжают по словам
  $$('.split').forEach(h => gsap.from(splitWords(h), {
    yPercent: 115, duration: 0.9, ease: 'expo.out', stagger: 0.06,
    scrollTrigger: { trigger: h, start: 'top 88%' }
  }));
  $$('.head .script').forEach(s => gsap.from(s, { opacity: 0, x: -30, duration: 0.8, scrollTrigger: { trigger: s, start: 'top 90%' } }));

  // 6. «Угадай вкус» – секция закрепляется, карточки едут вбок
  const track = $('.guess-track');
  const dist = () => track.scrollWidth - innerWidth;
  const hs = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.guess', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true }
  });
  $$('.guess-card').forEach(card => {
    gsap.from(card, { rotate: 8, yPercent: 12, scale: 0.85, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: hs, start: 'left right', end: 'center 60%', scrub: true } });
    gsap.fromTo(card.querySelector('img'), { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: hs, start: 'left right', end: 'right left', scrub: true } });
  });

  // 7. Витрина: карточки падают пачкой, наклоняются за мышью
  gsap.set('.card', { y: 90, opacity: 0, rotate: () => gsap.utils.random(-7, 7) });
  ScrollTrigger.batch('.card', {
    start: 'top 92%', once: true,
    onEnter: b => gsap.to(b, { y: 0, opacity: 1, rotate: 0, stagger: 0.1, duration: 1, ease: 'back.out(1.5)' })
  });
  if (fine) $$('.tilt').forEach(c => {
    c.addEventListener('mousemove', e => {
      const r = c.getBoundingClientRect();
      gsap.to(c, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 16, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 16, scale: 1.04, duration: 0.4 });
    });
    c.addEventListener('mouseleave', () => gsap.to(c, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.8, ease: 'elastic.out(1, .5)' }));
  });
  gsap.from('.more', { opacity: 0, y: 30, duration: 0.8, scrollTrigger: { trigger: '.more', start: 'top 92%' } });

  // 8. Счётчики
  $$('[data-count]').forEach(el => {
    const o = { v: 0 }, dec = +(el.dataset.dec || 0);
    gsap.to(o, { v: +el.dataset.count, duration: 2.2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%' }, onUpdate: () => { el.textContent = fmt(o.v, dec); } });
  });
  gsap.from('.numbers .wrap > div', { y: 60, opacity: 0, stagger: 0.15, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.numbers', start: 'top 80%' } });

  // 9. Меню и тройка карточек
  gsap.from('.tab', { x: -40, opacity: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '.menu-grid', start: 'top 80%' } });
  gsap.from('.panel.on li', { y: 24, opacity: 0, stagger: 0.06, duration: 0.6, scrollTrigger: { trigger: '.menu-grid', start: 'top 80%' } });
  gsap.fromTo('.menu-photos', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { trigger: '.menu-grid', start: 'top 75%' } });
  $$('.trio-card').forEach(c => {
    gsap.from(c, { y: 100, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 92%' } });
    gsap.to(c, { y: (1 - c.dataset.speed) * 260, ease: 'none', scrollTrigger: { trigger: '.trio', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // 10. Отзывы едут вбок вместе с прокруткой
  const rt = $('.rev-track');
  gsap.fromTo(rt, { x: () => innerWidth * 0.25 }, {
    x: () => -(rt.scrollWidth - innerWidth * 0.9), ease: 'none',
    scrollTrigger: { trigger: '.reviews', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true }
  });

  // 11. Контакты: карта раскрывается, фон «заливается» розовым
  gsap.fromTo('.contacts', { clipPath: 'inset(8% 6% 0% 6% round 60px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.contacts', start: 'top bottom', end: 'top 30%', scrub: true } });
  gsap.fromTo('.map', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.contacts', start: 'top 60%' } });
  gsap.from('.contacts dl > div, .contacts .hero-btns', { y: 30, opacity: 0, stagger: 0.12, duration: 0.8, scrollTrigger: { trigger: '.contacts', start: 'top 60%' } });

  // Магнитные кнопки и курсор-капля (только мышь)
  if (fine) {
    $$('.magnetic').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.3 });
      });
      b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, .4)' }));
    });
    const cur = $('.cursor');
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.25 }), yTo = gsap.quickTo(cur, 'y', { duration: 0.25 });
    addEventListener('mousemove', e => { xTo(e.clientX); yTo(e.clientY); });
    $$('a, button, .card, .guess-card').forEach(el => {
      el.addEventListener('mouseenter', () => cur.classList.add('big'));
      el.addEventListener('mouseleave', () => cur.classList.remove('big'));
    });
  }

  // Пересчитать точки срабатывания, когда догрузятся картинки и шрифты
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
