/* ============================================================
   SKETCHBOOK ORRERY — UI orchestration (onboarding, menu, panels)
   ============================================================ */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SECTIONS = {
    about:    { title: 'About',    tpl: 'tpl-about' },
    quotes:   { title: 'Words',    tpl: 'tpl-quotes' },
    projects: { title: 'Workshop', tpl: 'tpl-projects' },
    contact:  { title: 'Signal',   tpl: 'tpl-contact' },
  };

  const MOODS = [
    { key: 'Curious',  exp: 'curious',  wash: 'rgba(46,86,120,0.10)',  quote: 'Curiosity is the compass — follow it past the edge of the map.' },
    { key: 'Happy',    exp: 'happy',    wash: 'rgba(196,148,42,0.10)', quote: 'Keep that light feeling; it makes the heavy work float.' },
    { key: 'Inspired', exp: 'inspired', wash: 'rgba(120,74,140,0.10)', quote: 'Catch the spark quickly — ideas are shy and quick to drift.' },
    { key: 'Calm',     exp: 'calm',     wash: 'rgba(70,118,90,0.10)',  quote: 'Move at the speed of a planet: slow, certain, never late.' },
    { key: 'Tired',    exp: 'tired',    wash: 'rgba(86,84,108,0.12)',  quote: 'Even comets rest in the dark before their next bright pass.' },
  ];

  const user = { name: '', mood: null };

  /* ---------------- init scene ---------------- */
  window.Orrery.init();
  window.Orrery.onPlanetClick((id) => openPanel(id));

  /* ---------------- onboarding ---------------- */
  const scrim = $('#scrim');
  const dlgName = $('#dlg-name');
  const dlgMood = $('#dlg-mood');
  const dlgQuote = $('#dlg-quote');
  const inName = $('#in-name');

  function show(node) { node.classList.add('show'); }
  function hide(node) { node.classList.remove('show'); }

  function startOnboarding() {
    window.Orrery.ufoOnboard();
    show(scrim);
    setTimeout(() => { show(dlgName); inName.focus(); }, 450);
  }

  function toMood() {
    user.name = (inName.value || '').trim();
    hide(dlgName);
    const greet = user.name ? `Lovely to meet you, ${user.name}.` : 'Lovely to meet you.';
    $('#mood-greet').textContent = greet;
    setTimeout(() => show(dlgMood), 320);
  }

  // build mood chips
  const moodList = $('#mood-list');
  MOODS.forEach((m) => {
    const b = document.createElement('button');
    b.className = 'mood-chip';
    b.textContent = m.key;
    b.addEventListener('click', () => selectMood(m, b));
    moodList.appendChild(b);
  });

  function selectMood(m, btn) {
    user.mood = m;
    [...moodList.children].forEach((c) => c.classList.remove('sel'));
    btn.classList.add('sel');
    window.Orrery.setUfoExpression(m.exp);
    applyWash(m.wash);
    setTimeout(() => {
      hide(dlgMood);
      $('#quote-hi').textContent = user.name ? `Here, ${user.name} — take this with you:` : 'Here, take this with you:';
      $('#quote-text').textContent = m.quote;
      setTimeout(() => show(dlgQuote), 280);
    }, 360);
  }

  function applyWash(color) {
    const w = $('#mood-wash');
    w.style.backgroundColor = color;
    w.style.opacity = color ? 1 : 0;
  }

  function finishOnboarding() {
    hide(dlgQuote); hide(dlgMood); hide(dlgName); hide(scrim);
    window.Orrery.ufoToOrbit();
    if (!user.mood) window.Orrery.setUfoExpression('happy');
    // HUD greeting
    const g = $('#greet');
    $('#greet-hi').textContent = user.name ? `Hi, ${user.name}` : 'Welcome, traveler';
    $('#greet-mood').textContent = user.mood ? `feeling ${user.mood.key.toLowerCase()}` : '';
    g.classList.add('show');
    $('#hint').style.opacity = 1;
    $('#legend').style.opacity = 1;
  }

  $('#next-name').addEventListener('click', toMood);
  inName.addEventListener('keydown', (e) => { if (e.key === 'Enter') toMood(); });
  $('#skip-name').addEventListener('click', () => { inName.value = ''; toMood(); });
  $('#skip-mood').addEventListener('click', finishOnboarding);
  $('#begin-journey').addEventListener('click', finishOnboarding);

  // hide hint/legend until done
  $('#hint').style.opacity = 0;
  $('#legend').style.opacity = 0;
  $('#hint').style.transition = $('#legend').style.transition = 'opacity .8s ease';

  startOnboarding();

  /* ---------------- radial menu (UFO) ---------------- */
  const radial = $('#radial');
  let radialOpen = false;

  function buildRadialOnce() {
    if (radial.dataset.built) return;
    const ids = Object.keys(SECTIONS);
    const ang = [-135, -45, 135, 45].map((d) => d * Math.PI / 180);
    ids.forEach((id, i) => {
      const o = document.createElement('button');
      o.className = 'opt';
      o.textContent = SECTIONS[id].title;
      o.dataset.id = id;
      o.dataset.ai = i;
      o.addEventListener('click', (e) => { e.stopPropagation(); closeRadial(); openPanel(id); });
      radial.appendChild(o);
    });
    radial.dataset.built = '1';
  }

  function placeRadial() {
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const R = Math.min(190, innerWidth * 0.22);
    const angs = [-135, -45, 135, 45].map((d) => d * Math.PI / 180);
    [...radial.children].forEach((o) => {
      const i = +o.dataset.ai;
      o.style.left = (cx + Math.cos(angs[i]) * R) + 'px';
      o.style.top = (cy + Math.sin(angs[i]) * R - 6) + 'px';
    });
  }

  function openRadial() {
    if (document.body.classList.contains('panel-open')) return;
    buildRadialOnce();
    placeRadial();
    window.Orrery.ufoToCenter(() => {});
    radial.classList.add('show');
    radialOpen = true;
  }
  function closeRadial() {
    radial.classList.remove('show');
    radialOpen = false;
    window.Orrery.ufoToOrbit();
  }

  // unified API (works for both the 2D SVG engine and the 3D Three.js engine)
  window.Orrery.onUfoClick(() => {
    if (document.body.classList.contains('panel-open')) return;
    if (radialOpen) closeRadial(); else openRadial();
  });
  window.Orrery.onBackgroundClick(() => { if (radialOpen) closeRadial(); });
  addEventListener('resize', () => { if (radialOpen) placeRadial(); });

  /* ---------------- section panel ---------------- */
  const panel = $('#panel');
  const sheet = $('#panel-sheet');

  function openPanel(id) {
    const sec = SECTIONS[id];
    if (!sec) return;
    if (radialOpen) closeRadial();
    const tpl = document.getElementById(sec.tpl);
    sheet.innerHTML = '';
    sheet.appendChild(tpl.content.cloneNode(true));
    sheet.scrollTop = 0;
    panel.classList.add('open');
    document.body.classList.add('panel-open');
    window.Orrery.highlight(id);
    window.Orrery.focusPlanet(id);
    if (id === 'contact') wireContactForm();
  }
  function closePanel() {
    panel.classList.remove('open');
    document.body.classList.remove('panel-open');
    window.Orrery.highlight(null);
    window.Orrery.resetZoom();
  }
  $('#panel-close').addEventListener('click', closePanel);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (radialOpen) closeRadial(); else closePanel(); } });

  // expose a couple hooks for the Tweaks panel
  window.OrreryUI = {
    replayIntro() { closePanel(); user.name = ''; user.mood = null; applyWash(''); $('#greet').classList.remove('show'); startOnboarding(); },
  };

  function wireContactForm() {
    const form = $('#contact-form');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      const note = $('#contact-note');
      if (!f.name || !f.name.trim() || !f.msg || f.msg.trim().length < 4) {
        note.textContent = 'Add your name and a short note first.';
        note.style.color = 'var(--accent)';
        return;
      }
      note.textContent = '✦ Sent into orbit — I\'ll answer soon.';
      form.querySelector('button').style.display = 'none';
      form.reset();
    });
  }
})();
