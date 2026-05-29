/* ============================================================
   THE SKETCHBOOK ORRERY — scene + camera engine (vanilla)
   Exposes window.Orrery
   ============================================================ */
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (n, a) => { const e = document.createElementNS(SVGNS, n); if (a) for (const k in a) e.setAttribute(k, a[k]); return e; };
  const rand = (a, b) => a + Math.random() * (b - a);

  const sky = document.getElementById('sky');
  const gStars = document.getElementById('stars');
  const gMeteors = document.getElementById('meteors');
  const gOrbits = document.getElementById('orbits');
  const gPlanets = document.getElementById('planets');
  const gCamera = document.getElementById('camera');
  const gSunRays = document.getElementById('sun-rays');
  const ufo = document.getElementById('ufo');
  const ufoEyes = document.getElementById('ufo-eyes');

  /* ---------------- state ---------------- */
  const state = {
    zoom: 1, targetZoom: 1,
    rot: 0, rotVel: 0,
    speedMult: 1,
    density: 1,
    t: 0,
    ufoState: 'idle',          // idle | onboard | orbit | center
    ufo: { x: 0, y: -150, tx: 0, ty: -150, ang: -Math.PI / 2, bob: 0 },
  };
  let planetClickCb = null;

  /* ---------------- planet definitions ---------------- */
  const PLANETS = [
    { id: 'about',    label: 'About',    short: '01', r: 205, size: 34, speed: 0.14, fill: 'url(#hatch)',  ring: false, a: rand(0, 6.28) },
    { id: 'quotes',   label: 'Words',    short: '02', r: 312, size: 25, speed: 0.10, fill: 'url(#hatch2)', ring: false, a: rand(0, 6.28) },
    { id: 'projects', label: 'Workshop', short: '03', r: 428, size: 46, speed: 0.068, fill: 'url(#hatchX)', ring: true,  a: rand(0, 6.28) },
    { id: 'contact',  label: 'Signal',   short: '04', r: 540, size: 29, speed: 0.05, fill: 'url(#hatch)',  ring: false, a: rand(0, 6.28) },
  ];
  const planetNodes = {};

  /* ---------------- build: sun rays ---------------- */
  (function sunRays() {
    const N = 14;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r1 = 64, r2 = 64 + (i % 2 ? 20 : 13);
      gSunRays.appendChild(el('line', {
        x1: Math.cos(a) * r1, y1: Math.sin(a) * r1,
        x2: Math.cos(a) * r2, y2: Math.sin(a) * r2,
      }));
    }
  })();

  /* ---------------- build: orbits ---------------- */
  function buildOrbits() {
    gOrbits.innerHTML = '';
    PLANETS.forEach((p) => {
      const c = el('circle', {
        cx: 0, cy: 0, r: p.r, fill: 'none',
        stroke: '#8b857a', 'stroke-width': 1.3,
        'stroke-dasharray': '2 7', opacity: 0.7,
        filter: 'url(#rough2)',
      });
      gOrbits.appendChild(c);
    });
    // UFO orbit (fainter)
    gOrbits.appendChild(el('circle', { cx: 0, cy: 0, r: 150, fill: 'none', stroke: '#a8553f', 'stroke-width': 1, 'stroke-dasharray': '1 9', opacity: 0.45, filter: 'url(#rough2)' }));
  }

  /* ---------------- build: planets ---------------- */
  function buildPlanets() {
    gPlanets.innerHTML = '';
    PLANETS.forEach((p) => {
      const g = el('g', { class: 'planet', 'data-sec': p.id, style: 'cursor:pointer' });

      // hover/selection ring
      const sel = el('circle', { r: p.size + 12, fill: 'none', stroke: '#a8553f', 'stroke-width': 1.4, 'stroke-dasharray': '3 5', opacity: 0, filter: 'url(#rough2)' });
      sel.classList.add('sel-ring');

      if (p.ring) {
        const ring = el('ellipse', { cx: 0, cy: 0, rx: p.size + 22, ry: (p.size + 22) * 0.34, fill: 'none', stroke: '#2b2926', 'stroke-width': 2, filter: 'url(#rough)', transform: 'rotate(-18)' });
        g.appendChild(ring);
      }

      const body = el('g', { filter: 'url(#rough)' });
      body.appendChild(el('circle', { r: p.size, fill: p.fill, stroke: '#2b2926', 'stroke-width': 2.3 }));
      // a couple craters
      body.appendChild(el('circle', { cx: -p.size * 0.3, cy: -p.size * 0.25, r: p.size * 0.16, fill: 'none', stroke: '#2b2926', 'stroke-width': 1.1, opacity: 0.55 }));
      body.appendChild(el('circle', { cx: p.size * 0.35, cy: p.size * 0.3, r: p.size * 0.1, fill: 'none', stroke: '#2b2926', 'stroke-width': 1, opacity: 0.45 }));

      // label
      const lab = el('text', { x: 0, y: p.size + 30, 'text-anchor': 'middle', fill: '#2b2926', style: 'font-family:var(--font-note);font-size:20px;letter-spacing:.02em' });
      lab.textContent = p.label;
      const num = el('text', { x: 0, y: p.size + 48, 'text-anchor': 'middle', fill: '#8b857a', style: 'font-family:var(--font-note);font-size:13px;letter-spacing:.2em' });
      num.textContent = 'PLANET ' + p.short;

      g.appendChild(sel);
      g.appendChild(body);
      g.appendChild(lab);
      g.appendChild(num);

      // interactions
      g.addEventListener('pointerenter', () => { sel.style.opacity = 0.9; g.style.transform += ''; });
      g.addEventListener('pointerleave', () => { sel.style.opacity = 0; });
      g.addEventListener('click', (e) => {
        if (window.__orreryDragged) return;
        e.stopPropagation();
        if (planetClickCb) planetClickCb(p.id);
      });

      gPlanets.appendChild(g);
      planetNodes[p.id] = { g, body, sel, def: p };
    });
  }

  /* ---------------- build: stars + sparkles ---------------- */
  let starData = [];
  function buildStars() {
    gStars.innerHTML = '';
    starData = [];
    const N = Math.round(150 * state.density);
    for (let i = 0; i < N; i++) {
      const dist = rand(90, 1180);
      const ang = rand(0, Math.PI * 2);
      const kind = Math.random();
      let node;
      if (kind < 0.12) {
        // sparkle (plus)
        node = el('g', {});
        const s = rand(4, 8);
        node.appendChild(el('line', { x1: -s, y1: 0, x2: s, y2: 0, stroke: '#2b2926', 'stroke-width': 1.1 }));
        node.appendChild(el('line', { x1: 0, y1: -s, x2: 0, y2: s, stroke: '#2b2926', 'stroke-width': 1.1 }));
      } else if (kind < 0.18) {
        node = el('circle', { r: rand(2.4, 4), fill: 'none', stroke: '#2b2926', 'stroke-width': 1 });
      } else {
        node = el('circle', { r: rand(0.7, 2.1), fill: '#2b2926' });
      }
      node.setAttribute('opacity', rand(0.25, 0.8).toFixed(2));
      gStars.appendChild(node);
      starData.push({ node, dist, ang, par: rand(0.3, 0.9), tw: rand(0, 6.28), base: +node.getAttribute('opacity') });
    }
  }

  /* ---------------- meteors ---------------- */
  let meteorTimer = 0;
  function spawnMeteor() {
    const edge = Math.random() < 0.5;
    const sx = edge ? rand(-960, 960) : (Math.random() < 0.5 ? -1000 : 1000);
    const sy = edge ? (Math.random() < 0.5 ? -560 : 560) : rand(-540, 540);
    const ang = Math.atan2(-sy, -sx) + rand(-0.5, 0.5);
    const len = rand(900, 1500);
    const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
    const g = el('g', { filter: 'url(#rough2)', opacity: 0 });
    const tailLen = rand(40, 80);
    const tx = sx - Math.cos(ang) * tailLen, ty = sy - Math.sin(ang) * tailLen;
    g.appendChild(el('line', { x1: tx, y1: ty, x2: sx, y2: sy, stroke: '#2b2926', 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
    g.appendChild(el('circle', { cx: sx, cy: sy, r: 2.6, fill: '#2b2926' }));
    gMeteors.appendChild(g);
    const dur = rand(900, 1500);
    const t0 = performance.now();
    (function fly(now) {
      const k = Math.min(1, (now - t0) / dur);
      const cx = sx + (ex - sx) * k, cy = sy + (ey - sy) * k;
      g.setAttribute('transform', `translate(${cx - sx},${cy - sy})`);
      g.setAttribute('opacity', (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.85);
      if (k < 1) requestAnimationFrame(fly); else g.remove();
    })(t0);
  }

  /* ---------------- UFO expressions ---------------- */
  const EYES = {
    curious: '<circle cx="-9" cy="-9" r="3.4" fill="#2b2926"/><circle cx="9" cy="-9" r="3.4" fill="#2b2926"/><path d="M -14 -16 q 5 -4 10 0" fill="none" stroke="#2b2926" stroke-width="1.6"/>',
    happy:   '<path d="M -13 -8 q 4 -7 8 0" fill="none" stroke="#2b2926" stroke-width="2.2" stroke-linecap="round"/><path d="M 5 -8 q 4 -7 8 0" fill="none" stroke="#2b2926" stroke-width="2.2" stroke-linecap="round"/>',
    tired:   '<path d="M -13 -8 q 4 4 8 0" fill="none" stroke="#2b2926" stroke-width="2" stroke-linecap="round"/><path d="M 5 -8 q 4 4 8 0" fill="none" stroke="#2b2926" stroke-width="2" stroke-linecap="round"/>',
    calm:    '<circle cx="-9" cy="-9" r="2.4" fill="#2b2926"/><circle cx="9" cy="-9" r="2.4" fill="#2b2926"/>',
    inspired:'<path d="M -13 -9 l 8 0 M -9 -13 l 0 8" stroke="#2b2926" stroke-width="1.8" stroke-linecap="round"/><path d="M 5 -9 l 8 0 M 9 -13 l 0 8" stroke="#2b2926" stroke-width="1.8" stroke-linecap="round"/>',
  };
  function setUfoExpression(type) { ufoEyes.innerHTML = EYES[type] || EYES.curious; }
  setUfoExpression('curious');

  /* ---------------- camera input ---------------- */
  // wheel = zoom
  sky.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.targetZoom *= (1 - e.deltaY * 0.0011);
    state.targetZoom = Math.max(0.5, Math.min(2.7, state.targetZoom));
  }, { passive: false });

  // drag = rotate
  let dragging = false, lastX = 0, downX = 0, downY = 0, moved = 0;
  function down(e) {
    if (document.body.classList.contains('panel-open')) return;
    dragging = true; moved = 0;
    lastX = downX = (e.touches ? e.touches[0].clientX : e.clientX);
    downY = (e.touches ? e.touches[0].clientY : e.clientY);
    window.__orreryDragged = false;
    document.body.classList.add('dragging');
  }
  function move(e) {
    if (!dragging) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const dx = x - lastX; lastX = x;
    moved += Math.abs(dx);
    if (moved > 6) window.__orreryDragged = true;
    state.rotVel += dx * 0.00018;
    state.rot += dx * 0.0026;
  }
  function up() {
    dragging = false;
    document.body.classList.remove('dragging');
    setTimeout(() => { window.__orreryDragged = false; }, 30);
  }
  sky.addEventListener('pointerdown', down);
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  sky.addEventListener('touchstart', down, { passive: true });
  addEventListener('touchmove', move, { passive: true });
  addEventListener('touchend', up);

  /* ---------------- animation loop ---------------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    state.t += dt;

    // zoom easing
    state.zoom += (state.targetZoom - state.zoom) * 0.12;
    // rotation inertia
    if (!dragging) { state.rot += state.rotVel; state.rotVel *= 0.94; }
    gCamera.setAttribute('transform', `scale(${state.zoom.toFixed(4)})`);

    // planets
    PLANETS.forEach((p) => {
      if (!reduce) p.a += p.speed * state.speedMult * dt;
      const ang = p.a + state.rot;
      const x = Math.cos(ang) * p.r, y = Math.sin(ang) * p.r;
      planetNodes[p.id].g.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`);
    });

    // stars (rotate as a sky layer + twinkle)
    for (let i = 0; i < starData.length; i++) {
      const s = starData[i];
      const a = s.ang + state.rot * s.par;
      const x = Math.cos(a) * s.dist, y = Math.sin(a) * s.dist;
      s.node.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      if (!reduce) s.node.setAttribute('opacity', (s.base * (0.6 + 0.4 * Math.sin(state.t * 1.6 + s.tw))).toFixed(2));
    }

    // UFO
    const u = state.ufo;
    if (state.ufoState === 'orbit' && !reduce) {
      u.ang += 0.22 * state.speedMult * dt;
      u.tx = Math.cos(u.ang + state.rot) * 150;
      u.ty = Math.sin(u.ang + state.rot) * 150;
    }
    u.x += (u.tx - u.x) * 0.07;
    u.y += (u.ty - u.y) * 0.07;
    u.bob += dt;
    const by = Math.sin(u.bob * 2.2) * (state.ufoState === 'orbit' ? 4 : 7);
    const tilt = (u.tx - u.x) * 0.12;
    ufo.setAttribute('transform', `translate(${u.x.toFixed(2)},${(u.y + by).toFixed(2)}) rotate(${tilt.toFixed(2)})`);

    // meteors
    if (!reduce) {
      meteorTimer -= dt;
      if (meteorTimer <= 0) { spawnMeteor(); meteorTimer = rand(2.6, 6) / state.density; }
    }

    requestAnimationFrame(loop);
  }

  /* ---------------- public API ---------------- */
  window.Orrery = {
    init() { buildOrbits(); buildPlanets(); buildStars(); requestAnimationFrame(loop); },
    onPlanetClick(cb) { planetClickCb = cb; },
    onUfoClick(cb) {
      ufo.addEventListener('click', (e) => {
        if (window.__orreryDragged) return;
        e.stopPropagation();
        cb();
      });
    },
    onBackgroundClick(cb) {
      sky.addEventListener('click', (e) => {
        if (window.__orreryDragged) return;
        if (e.target.closest('.planet') || ufo.contains(e.target)) return;
        cb();
      });
    },
    setUfoExpression,
    ufoOnboard() { state.ufoState = 'onboard'; state.ufo.tx = 0; state.ufo.ty = -150; },
    ufoToOrbit() { state.ufoState = 'orbit'; },
    ufoToCenter(cb) {
      state.ufoState = 'center';
      state.ufo.tx = 0; state.ufo.ty = 0;
      setTimeout(() => cb && cb(), 520);
    },
    focusPlanet(id) {
      // gentle zoom-in cue
      state.targetZoom = Math.min(2.2, state.targetZoom * 1.18);
    },
    resetZoom() { state.targetZoom = 1; },
    highlight(id) {
      Object.values(planetNodes).forEach((n) => n.sel.style.opacity = 0);
      if (id && planetNodes[id]) planetNodes[id].sel.style.opacity = 0.95;
    },
    setPlanetSpeed(m) { state.speedMult = m; },
    setDensity(m) { state.density = m; buildStars(); },
    isDragging() { return dragging; },
  };
})();
