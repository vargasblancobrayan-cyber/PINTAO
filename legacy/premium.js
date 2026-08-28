/* PINTAO — progressive enhancement visual premium
   No framework. Vanilla. Respeta prefers-reduced-motion y fallback sin JS.
   Responsabilidades:
   1. Inyectar capa de fondo atmosférica (storefront).
   2. Scroll-reveal + stagger con IntersectionObserver.
   3. Skeleton loaders mientras cargan catálogos.
   4. Count-up animado para KPIs numéricos.
   5. Parallax ambiental muy ligero (pointer) en hero.
   6. Skeleton admin mientras carga el panel.
   Todo en transform/opacity; nada bloquea la interfaz. */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ───── 1. Fondo atmosférico (storefront) ───── */
  function injectAtmosphere() {
    if ($('.pintao-atmosphere') || document.body.classList.contains('admin-page') ||
        document.body.classList.contains('admin-login-page')) return;
    const layer = document.createElement('div');
    layer.className = 'pintao-atmosphere';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<span class="pintao-grain"></span>';
    document.body.prepend(layer);
  }

  /* ───── 2. Scroll-reveal + stagger ───── */
  function initReveal() {
    const candidates = $$(
      '.section, .section-heading, .hero-content, .category-card, .service-card, ' +
      '.editorial-copy, .wholesale-grid, .faq-list, .product-grid, .quote-card, ' +
      '.checkout-card, .order-card, .account-card, .info-card, .catalog-toolbar'
    );
    candidates.forEach(el => el.classList.add('reveal'));
    $$('.product-grid').forEach(grid => {
      grid.classList.add('stagger');
      grid.classList.remove('reveal');
    });

    if (reduced || !('IntersectionObserver' in window)) {
      $$('.reveal, .stagger').forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal, .stagger').forEach(el => io.observe(el));
  }

  /* ───── 3. Skeletons mientras cargan catálogos ───── */
  function showSkeletons() {
    const grids = ['#featuredGrid', '#catalogGrid'].map(s => $(s)).filter(Boolean);
    grids.forEach(grid => {
      if (grid.children.length) return; // ya tiene contenido
      grid.classList.add('is-loading');
      const count = grid.id === 'featuredGrid' ? 4 : 6;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.setAttribute('aria-hidden', 'true');
        card.innerHTML =
          '<div class="product-media skeleton block"></div>' +
          '<div class="product-info-card" style="padding:14px">' +
          '<div class="skeleton text" style="width:50%"></div>' +
          '<div class="skeleton text lg" style="width:80%;margin-top:8px"></div>' +
          '<div class="skeleton text" style="width:40%;margin-top:10px"></div>' +
          '</div>';
        frag.appendChild(card);
      }
      grid.appendChild(frag);
    });
  }

  /* ───── 4. Count-up para KPIs numéricos ───── */
  function animateCount(el) {
    const raw = el.dataset.count || el.textContent.replace(/[^\d.-]/g, '');
    const target = parseFloat(raw);
    if (!isFinite(target) || reduced) return;
    const prefix = (el.dataset.prefix || '');
    const suffix = (el.dataset.suffix || '');
    const isMoney = el.dataset.money === '1';
    const dur = 700;
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(target * eased);
      el.textContent = prefix + (isMoney ? '$' + val.toLocaleString('es-CO') : val.toLocaleString('es-CO')) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + (isMoney ? '$' + Math.round(target).toLocaleString('es-CO') : Math.round(target).toLocaleString('es-CO')) + suffix;
    }
    requestAnimationFrame(frame);
  }
  function initCountUp() {
    const targets = $$('[data-count]');
    if (!targets.length) return;
    if (reduced || !('IntersectionObserver' in window)) { targets.forEach(animateCount); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { animateCount(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    targets.forEach(el => io.observe(el));
  }

  /* ───── 5. Parallax ambiental ligero en hero (pointer) ───── */
  function initHeroParallax() {
    if (reduced) return;
    const hero = $('.hero');
    const media = hero && $('.hero-media', hero);
    const orb = hero; // el ::after no se puede mover vía JS; movemos el contenido
    if (!hero || !media) return;
    if (window.matchMedia('(hover: none)').matches) return; // omitir en táctil
    let raf = 0;
    hero.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        media.style.transform = `scale(1.04) translate(${x * -12}px, ${y * -12}px)`;
        raf = 0;
      });
    });
    hero.addEventListener('pointerleave', () => {
      media.style.transform = '';
    });
  }

  /* ───── 6. Skeleton admin mientras carga el panel ───── */
  function initAdminSkeleton() {
    if (!$('.admin-page')) return;
    const main = $('main');
    if (!main) return;
    const views = $$('.view', main);
    const active = views.find(v => v.classList.contains('active')) || views[0];
    if (!active) return;
    // No interferir si ya hay datos; el admin.js renderiza rápido.
    // Solo envolvemos: marca de carga que se quita al primer render.
    document.body.dataset.adminLoading = '1';
    const done = () => { delete document.body.dataset.adminLoading; };
    // admin.js llama a load() al final; observamos mutaciones en nodos clave.
    const target = $('#revenue, #orderCount, #productCount', main);
    if (!target) { done(); return; }
    const mo = new MutationObserver(() => {
      if (target.textContent.trim() && target.textContent !== '0') { done(); mo.disconnect(); }
    });
    mo.observe(target, { childList: true, characterData: true, subtree: true });
    setTimeout(done, 2500); // salvaguarda
  }

  /* ───── Init ───── */
  function init() {
    injectAtmosphere();
    showSkeletons();
    initReveal();
    initCountUp();
    initHeroParallax();
    initAdminSkeleton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
