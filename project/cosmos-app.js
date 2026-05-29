/* ============================================================
   Developer Cosmos — interaction controller (vanilla)
   ============================================================ */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Reveal on view ---------- */
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.18 });
  $$('.reveal').forEach((el) => io.observe(el));

  // animate skill bars when about enters
  const aboutIO = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        $$('#about-bars .fill').forEach((f, i) => setTimeout(() => { f.style.width = f.dataset.w; }, i * 140));
        aboutIO.disconnect();
      }
    });
  }, { threshold: 0.4 });
  aboutIO.observe($('#about'));

  /* ---------- Project data ---------- */
  const PROJECTS = [
    {
      idx: 'PROJECT 01 / WEB',
      title: 'Classroom Dashboard',
      kind: 'Frontend · UI / UX',
      desc: 'A real-time control surface for educators — attendance, live metrics and lesson flow in one calm, responsive interface designed for speed and clarity.',
      shot: 'CLASSROOM DASHBOARD · UI',
      stack: ['React', 'Next.js', 'Tailwind', 'TypeScript'],
    },
    {
      idx: 'PROJECT 02 / XR',
      title: 'VR Chemistry Lab',
      kind: 'XR / VR Simulation',
      desc: 'An immersive lab where students mix reagents and watch real chemical reactions unfold in virtual reality — physics-accurate, safe, and endlessly repeatable.',
      shot: 'VR CHEMISTRY LAB · CAPTURE',
      stack: ['Unity', 'C#', 'OpenXR', 'Shader Graph'],
    },
    {
      idx: 'PROJECT 03 / BACKEND · IoT',
      title: 'Bloom — Flower Commerce',
      kind: 'Fullstack · Backend · IoT',
      desc: 'An e-commerce platform for a flower studio, built on Neon PostgreSQL and Prisma, containerised with Docker — with ESP32 / PLC sensors monitoring cold-storage in real time.',
      shot: 'BLOOM STOREFRONT · IoT PANEL',
      stack: ['Prisma', 'Neon Postgres', 'Docker', 'ESP32 / PLC'],
    },
  ];

  const projEl = $('#proj');
  const planets = $$('.planet');
  let activeIdx = -1;

  function renderProject(i) {
    const p = PROJECTS[i];
    projEl.innerHTML =
      `<div class="index">${p.idx}</div>` +
      `<h3>${p.title}</h3>` +
      `<div class="kind">${p.kind}</div>` +
      `<div class="shot">[ ${p.shot} ]</div>` +
      `<p>${p.desc}</p>` +
      `<div class="stack">${p.stack.map((s) => `<span>${s}</span>`).join('')}</div>`;
  }

  function setActive(i) {
    if (i === activeIdx) return;
    activeIdx = i;
    planets.forEach((pl) => pl.classList.toggle('active', +pl.dataset.i === i));
    projEl.classList.add('swap');
    setTimeout(() => { renderProject(i); projEl.classList.remove('swap'); }, reduce ? 0 : 240);
  }
  renderProject(0);
  setActive(0);

  // position planets on their orbit rings (static, with gentle float via CSS would be extra)
  function placePlanets() {
    const box = $('#orbits');
    if (!box) return;
    const r = box.clientWidth / 2;
    const cfg = [
      { a: -0.6, rad: 0.50 },  // web — outer left-top
      { a: 2.1,  rad: 0.34 },  // xr — inner
      { a: 0.7,  rad: 0.62 },  // iot — outer right-bottom
    ];
    planets.forEach((pl, i) => {
      const c = cfg[i];
      const x = Math.cos(c.a) * r * c.rad;
      const y = Math.sin(c.a) * r * c.rad;
      pl.style.left = `calc(50% + ${x}px - ${pl.offsetWidth / 2}px)`;
      pl.style.top = `calc(50% + ${y}px - ${pl.offsetHeight / 2}px)`;
    });
  }
  placePlanets();
  addEventListener('resize', placePlanets);

  // click a planet -> scroll so its third is centered
  const systems = $('#systems');
  planets.forEach((pl) => pl.addEventListener('click', () => {
    const i = +pl.dataset.i;
    const top = systems.offsetTop;
    const span = systems.offsetHeight - innerHeight;
    scrollTo({ top: top + span * ((i + 0.5) / 3), behavior: 'smooth' });
  }));

  /* ---------- Scroll-driven systems: pick active planet ---------- */
  function updateSystems() {
    const top = systems.offsetTop;
    const span = systems.offsetHeight - innerHeight;
    const p = (scrollY - top) / span;
    if (p >= -0.05 && p <= 1.05) {
      const i = Math.max(0, Math.min(2, Math.floor(p * 3 + 0.001)));
      setActive(i);
    }
  }

  /* ---------- Navrail + telemetry + warp + vortex ---------- */
  const sections = ['hero', 'about', 'systems', 'contact'].map((id) => $('#' + id));
  const navLinks = $$('#navrail a');
  const sectorNames = ['01 · LAUNCH BAY', '02 · STATION ARC', '03 · SKILL SYSTEM', '04 · EVENT HORIZON'];
  const progress = $('#progress');
  const tSector = $('#t-sector'), tVel = $('#t-vel'), tCoord = $('#t-coord');
  const vortex = $('#vortex');
  const contact = $('#contact');

  let lastY = scrollY, vel = 0;

  function onScroll() {
    const dy = scrollY - lastY;
    lastY = scrollY;
    vel = Math.abs(dy);
    if (window.Cosmos) window.Cosmos.setWarp(Math.min(5, vel * 0.05));

    // progress
    const docH = document.documentElement.scrollHeight - innerHeight;
    const gp = docH > 0 ? scrollY / docH : 0;
    progress.style.width = (gp * 100).toFixed(1) + '%';

    // active section (whichever center is closest to viewport center)
    const vc = scrollY + innerHeight / 2;
    let cur = 0, best = Infinity;
    sections.forEach((s, i) => {
      const c = s.offsetTop + s.offsetHeight / 2;
      const d = Math.abs(c - vc);
      if (d < best) { best = d; cur = i; }
    });
    navLinks.forEach((a, i) => a.classList.toggle('active', i === cur));
    tSector.textContent = sectorNames[cur];

    // telemetry numbers
    const velc = (0.4 + Math.min(5, vel * 0.05)).toFixed(2);
    tVel.textContent = velc + 'c';
    tCoord.textContent = 'X' + String(Math.floor(gp * 88)).padStart(2, '0') +
                         ' · Y' + String(Math.floor(scrollY / 40) % 100).padStart(2, '0');

    // black-hole pull near contact
    const cTop = contact.offsetTop;
    const enter = (scrollY + innerHeight - cTop) / innerHeight; // 0 when bottom hits top of contact -> 1+
    const pull = Math.max(0, Math.min(1, enter));
    vortex.style.opacity = (pull * 0.9).toFixed(2);
    if (window.Cosmos) window.Cosmos.setPull(pull);

    updateSystems();
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(() => { onScroll(); ticking = false; }); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Micro: magnetic CTA ---------- */
  if (!reduce) {
    const mag = $('#cta-begin');
    if (mag) {
      mag.addEventListener('mousemove', (e) => {
        const r = mag.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        mag.style.transform = `translate(${x * 0.22}px, ${y * 0.30}px)`;
      });
      mag.addEventListener('mouseleave', () => { mag.style.transform = ''; });
    }

    /* ---------- Micro: tilt on glass panels ---------- */
    $$('.console, .proj, .form').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * 4}deg) rotateX(${-py * 4}deg)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
      card.style.transition = 'transform .3s ease';
    });
  }

  /* ---------- Contact form validation ---------- */
  const form = $('#contact-form');
  const setErr = (name, msg) => {
    const field = $(`[name="${name}"]`, form).closest('.field');
    field.classList.toggle('err', !!msg);
    $(`.msg[data-for="${name}"]`, form).textContent = msg || '';
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    let ok = true;
    if (!data.name || data.name.trim().length < 2) { setErr('name', 'Identification required.'); ok = false; } else setErr('name', '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email || '')) { setErr('email', 'Invalid return frequency.'); ok = false; } else setErr('email', '');
    if (!data.message || data.message.trim().length < 6) { setErr('message', 'Transmission too short.'); ok = false; } else setErr('message', '');
    if (!ok) return;
    $('#send-btn').style.display = 'none';
    $('#sent-note').style.display = 'block';
    if (window.Cosmos) window.Cosmos.setWarp(5);
    form.reset();
  });
  ['name', 'email', 'message'].forEach((n) => {
    const el = $(`[name="${n}"]`, form);
    el.addEventListener('input', () => setErr(n, ''));
  });
})();
