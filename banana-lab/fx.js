/* Banana Lab — przejścia między stronami, morph kafelków i animacje sekcji.
   Działa w każdej nowoczesnej przeglądarce (także Firefox), bez bibliotek. */
(() => {
  const H = document.documentElement;
  const FX = H.dataset.fx || 'neu';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Kolor tła strony docelowej — kafelek „rośnie” do tego koloru,
     a strona docelowa zaczyna od pełnego ekranu w tym samym kolorze. */
  const COLORS = {
    '': '#E4E6EA', energia: '#0B0420', potas: '#DCE4FF', b6: '#D9D9D6',
    blonnik: '#F1EEF0', indie: '#4A1B26', ekwador: '#FFE15A',
    'chiny-indonezja-brazylia': '#FF4FD8', jagoda: '#3B2BE8', ziele: '#F2EEE6',
    radioaktywny: '#3324F2', dojrzewanie: '#D9D9D5'
  };

  const slugOf = (href) => {
    try {
      const u = new URL(href, location.href);
      if (u.origin !== location.origin && u.protocol !== 'file:') return null;
      const m = u.pathname.match(/banana-lab\/(?:([^/]+)\/)?(?:index\.html)?$/);
      if (!m) return null;
      const s = m[1] || '';
      return s in COLORS ? s : null;
    } catch (e) { return null; }
  };

  /* ---------- PRZYJŚCIE NA STRONĘ ---------- */
  const OUT_MS = { neu: 600, synthwave: 700, glass: 800, swiss: 650, clay: 800, victorian: 1000,
    brutal: 550, maximal: 600, pixel: 700, wabi: 1200, cyberpunk: 750, cybercore: 800 };

  function buildOverlay() {
    const bg = getComputedStyle(H).getPropertyValue('--fx-bg').trim() || '#000';
    const ov = document.createElement('div');
    ov.className = 'fx-ov fx-out-' + FX;
    ov.setAttribute('aria-hidden', 'true');
    ov.style.setProperty('--bg', bg);

    if (FX === 'pixel' || FX === 'cybercore') {
      const cols = FX === 'pixel' ? 16 : 12, rows = FX === 'pixel' ? 10 : 8;
      ov.style.gridTemplateColumns = `repeat(${cols},1fr)`;
      ov.style.gridTemplateRows = `repeat(${rows},1fr)`;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const d = document.createElement('i');
        const delay = FX === 'pixel' ? Math.random() * 480 : (r + c) * 28;
        d.style.setProperty('--d', delay.toFixed(0) + 'ms');
        ov.appendChild(d);
      }
    } else if (FX === 'cyberpunk') {
      for (let i = 0; i < 8; i++) {
        const s = document.createElement('i');
        s.style.setProperty('--d', (i * 45) + 'ms');
        ov.appendChild(s);
      }
    } else if (FX === 'victorian') {
      ov.innerHTML = '<i class="l"></i><i class="r"></i>';
    }
    return ov;
  }

  function arrive() {
    const arriving = H.classList.contains('fx-arriving');
    try { sessionStorage.removeItem('fxNav'); } catch (e) {}
    if (!arriving) { startReveal(0); return; }
    if (reduce) { H.classList.remove('fx-arriving'); startReveal(0); return; }
    const ov = buildOverlay();
    document.body.appendChild(ov);
    H.classList.remove('fx-arriving');
    // dwie klatki, żeby przeglądarka narysowała stan początkowy
    requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('go')));
    startReveal(Math.round((OUT_MS[FX] || 600) * 0.35));
    setTimeout(() => ov.remove(), (OUT_MS[FX] || 600) + 700);
  }

  /* ---------- WYJŚCIE ZE STRONY (MORPH) ---------- */
  function leave(link, href, slug) {
    const target = (link.classList.contains('go') && link.firstElementChild) ? link.firstElementChild : link;
    const r = target.getBoundingClientRect();
    const cs = getComputedStyle(target);
    const m = document.createElement('div');
    m.className = 'fx-morph';
    m.setAttribute('aria-hidden', 'true');
    m.style.cssText = `top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;` +
      `border-radius:${cs.borderTopLeftRadius};background:${COLORS[slug]};`;
    document.body.appendChild(m);
    document.body.classList.add('fx-leaving');
    requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('grow')));
    try { sessionStorage.setItem('fxNav', '1'); } catch (e) {}
    setTimeout(() => { location.href = href; }, 560);
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
    const slug = slugOf(a.href);
    if (slug === null) return;
    if (reduce) return; // zwykła nawigacja
    e.preventDefault();
    leave(a, a.href, slug);
  });

  // powrót przyciskiem „wstecz” z pamięci podręcznej przeglądarki
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.querySelectorAll('.fx-morph,.fx-ov').forEach((n) => n.remove());
    document.body.classList.remove('fx-leaving');
    H.classList.remove('fx-arriving');
  });

  /* ---------- ANIMACJE SEKCJI PRZY PRZEWIJANIU ---------- */
  const LEAVES = 'article,.stat,.win,.cell,.step,.stage,.essay,.log,.row,.bar,.card,.ticket,.compare,.slider,.ring,.hello,.redbox,.formula,.quote,.term,.table tr,.foot,.nav';
  const BLOCKS = 'h1,section,header';

  function startReveal(delay) {
    if (reduce || !('IntersectionObserver' in window)) return;
    const set = new Set(document.querySelectorAll(LEAVES));
    document.querySelectorAll(BLOCKS).forEach((el) => {
      if (!el.querySelector(LEAVES) && !el.closest(LEAVES)) set.add(el);
    });
    // nie animuj elementów zagnieżdżonych w innych animowanych
    const items = [...set].filter((el) => {
      let p = el.parentElement;
      while (p) { if (set.has(p)) return false; p = p.parentElement; }
      return !el.closest('.fx-ov,.fx-morph');
    });
    items.forEach((el) => el.classList.add('fx-r'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('fx-r'));
        const i = Math.max(0, sibs.indexOf(el));
        el.style.setProperty('--fx-i', Math.min(i, 8));
        el.classList.add('fx-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    setTimeout(() => items.forEach((el) => io.observe(el)), delay);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrive);
  else arrive();
})();
