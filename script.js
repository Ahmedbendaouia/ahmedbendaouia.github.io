(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ── Theme toggle ─────────────────────────────────────── */
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const resolveTheme = () => {
    const t = root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
    root.dataset.themeResolved = t;
  };
  resolveTheme();
  darkQuery.addEventListener?.('change', resolveTheme);
  $('#themeToggle').addEventListener('click', () => {
    const next = root.dataset.themeResolved === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    resolveTheme();
  });

  /* ── Mobile menu ──────────────────────────────────────── */
  const menuBtn = $('#menuBtn'), navLinks = $('#navLinks');
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  $$('a', navLinks).forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));

  /* ── Scroll: progress bar, nav state, timeline fill ───── */
  const nav = $('#nav'), bar = $('#progressBar'), timeline = $('#timeline');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? scrollY / max : 0);
    nav.classList.toggle('scrolled', scrollY > innerHeight * 0.6);
    const r = timeline.getBoundingClientRect();
    const fill = Math.min(1, Math.max(0, (innerHeight * 0.65 - r.top) / r.height));
    timeline.style.setProperty('--fill', fill.toFixed(3));
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ── Active section highlighting ──────────────────────── */
  const linkFor = id => $(`.nav-links a[href="#${id}"]`);
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      $$('.nav-links a').forEach(a => a.classList.remove('active'));
      linkFor(e.target.id)?.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => sectionObs.observe(s));

  /* ── Count-up numbers ─────────────────────────────────── */
  const fmt = n => n.toLocaleString('en-US');
  const countUp = el => {
    const target = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = pre + fmt(target) + suf; return; }
    const dur = 1600, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + fmt(Math.round(target * eased)) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ── Reveal on scroll (staggered per parent) ──────────── */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      $$('[data-count]', el).concat(el.matches('[data-count]') ? [el] : []).forEach(countUp);
      revealObs.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => {
    const sibs = $$(':scope > .reveal', el.parentElement);
    el.style.setProperty('--delay', `${Math.min(sibs.indexOf(el), 6) * 0.08}s`);
    revealObs.observe(el);
  });

  /* ── Rotating tagline (typewriter) ────────────────────── */
  const rot = $('#rotator');
  const phrases = ['Physical AI', 'Autonomous Robots', 'Digital Twins', 'AI Laboratories', 'Assured Autonomy', 'Edge Intelligence'];
  if (!reduceMotion) {
    let i = 0, j = phrases[0].length, deleting = true;
    const tick = () => {
      const word = phrases[i];
      j += deleting ? -1 : 1;
      rot.textContent = word.slice(0, j);
      let delay = deleting ? 45 : 85;
      if (!deleting && j === word.length) { deleting = true; delay = 1900; }
      else if (deleting && j === 0) { deleting = false; i = (i + 1) % phrases.length; delay = 300; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 2200);
  }

  /* ── Card tilt + spotlight ────────────────────────────── */
  if (!reduceMotion && matchMedia('(hover: hover)').matches) {
    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
        card.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ── Publications filter + search ─────────────────────── */
  const pubs = $$('#pubs .pub'), chips = $$('.chip'), search = $('#pubSearch');
  const count = $('#pubCount'), empty = $('#pubEmpty');
  let filter = 'all';
  const applyPubs = () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    pubs.forEach(p => {
      const types = p.dataset.type.split(' ');
      const ok = (filter === 'all' || types.includes(filter)) && (!q || p.textContent.toLowerCase().includes(q));
      const wasHidden = p.classList.contains('hide');
      p.classList.toggle('hide', !ok);
      if (ok) {
        shown++;
        if (wasHidden && !reduceMotion) { p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); }
      }
    });
    count.textContent = `Showing ${shown} of ${pubs.length} publications`;
    empty.hidden = shown > 0;
  };
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => { x.classList.toggle('active', x === c); x.setAttribute('aria-pressed', x === c); });
    filter = c.dataset.filter;
    applyPubs();
  }));
  search.addEventListener('input', applyPubs);
  applyPubs();

  /* ── Marquee: duplicate items for a seamless loop ─────── */
  $$('.track').forEach(t => {
    $$('li', t).forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); t.appendChild(c); });
  });

  /* ── SVG loop: pause SMIL when reduced motion ─────────── */
  if (reduceMotion) $('.loop svg')?.pauseAnimations?.();

  $('#year').textContent = new Date().getFullYear();

  /* ── Hero: sensor-network canvas ──────────────────────── */
  const canvas = $('#net'), ctx = canvas.getContext('2d');
  const hero = $('.hero');
  let W, H, dpr, nodes = [], pulses = [], running = false, heroVisible = true, raf;
  const mouse = { x: -9999, y: -9999 };
  const LINK = 140;

  const build = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(120, Math.max(36, (W * H) / 13000)));
    nodes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 1, hue: Math.random() < 0.7 ? 199 : 258
    }));
    pulses = [];
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of nodes) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
      if (d < 180) { p.x += dx * 0.004; p.y += dy * 0.004; }
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(125, 211, 252, ${(1 - d / LINK) * 0.28})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          if (running && pulses.length < 14 && Math.random() < 0.0006) pulses.push({ a, b, t: 0 });
        }
      }
      const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (md < 180) {
        ctx.strokeStyle = `rgba(167, 139, 250, ${(1 - md / 180) * 0.55})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    for (const p of nodes) {
      ctx.fillStyle = `hsla(${p.hue}, 92%, 70%, .9)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    pulses = pulses.filter(s => (s.t += 0.018) < 1);
    for (const s of pulses) {
      const x = s.a.x + (s.b.x - s.a.x) * s.t, y = s.a.y + (s.b.y - s.a.y) * s.t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, 'rgba(224, 242, 254, 1)'); g.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    }
    if (running) raf = requestAnimationFrame(draw);
  };

  const start = () => { if (!running && heroVisible && !document.hidden && !reduceMotion) { running = true; raf = requestAnimationFrame(draw); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  build(); draw();
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (!running) draw(); }, 150); });
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; heroVisible ? start() : stop(); }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
})();
