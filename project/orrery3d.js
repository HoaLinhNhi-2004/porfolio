/* ============================================================
   THE SKETCHBOOK ORRERY — 3D engine (Three.js)
   Real WebGL space · cel-shaded graphite + outlines · paper grain on top
   Exposes the SAME window.Orrery API as the 2D engine.
   ============================================================ */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const INK = 0x2b2926;

  const host = document.getElementById('sky');
  const labelsBox = document.getElementById('labels');

  /* ---------- renderer / scene / camera ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.5, 6000);
  camera.position.set(0, 185, 360);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.9;
  controls.minDistance = 120;
  controls.maxDistance = 1300;
  controls.target.set(0, 0, 0);

  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(1, 1.3, 0.7);
  scene.add(dir);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  /* ---------- toon gradient (cel banding) ---------- */
  function toonGradient(stops) {
    const c = document.createElement('canvas'); c.width = stops.length; c.height = 1;
    const x = c.getContext('2d');
    stops.forEach((s, i) => { x.fillStyle = s; x.fillRect(i, 0, 1, 1); });
    const t = new THREE.CanvasTexture(c);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    return t;
  }
  const GRAD = toonGradient(['#3a3833', '#6f695d', '#9a9488', '#cfc8b8']);

  /* ---------- helpers: cel sphere with outline ---------- */
  function celSphere(radius, colorHex, seg) {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(radius, seg || 40, seg || 32);
    const mesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: colorHex, gradientMap: GRAD }));
    const out = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
    out.scale.setScalar(1.05);
    g.add(out); g.add(mesh);
    g.userData.mesh = mesh;
    return g;
  }

  /* ---------- sprite textures (dots, sun rays) ---------- */
  function dotTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const grd = x.createRadialGradient(32, 32, 0, 32, 32, 30);
    grd.addColorStop(0, 'rgba(43,41,38,1)');
    grd.addColorStop(0.55, 'rgba(43,41,38,0.85)');
    grd.addColorStop(1, 'rgba(43,41,38,0)');
    x.fillStyle = grd; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill();
    return new THREE.CanvasTexture(c);
  }
  function sunRayTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'); x.translate(128, 128);
    x.strokeStyle = '#2b2926'; x.lineWidth = 4; x.lineCap = 'round';
    const N = 14;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r1 = 96, r2 = 96 + (i % 2 ? 30 : 18);
      x.beginPath();
      x.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      x.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      x.stroke();
    }
    return new THREE.CanvasTexture(c);
  }
  const DOT = dotTexture();

  /* ---------- sun ---------- */
  const sun = celSphere(44, 0xcbc4b4, 48);
  scene.add(sun);
  const sunSpot = new THREE.Mesh(new THREE.CircleGeometry(7, 24), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.5 }));
  sun.add(sunSpot);
  const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunRayTexture(), transparent: true, opacity: 0.92, depthWrite: false }));
  rays.scale.setScalar(150);
  scene.add(rays);

  /* ---------- planets + orbits ---------- */
  const PLANETS = [
    { id: 'about',    label: 'About',    short: '01', orbit: 120, size: 24, speed: 0.30, incl: 0.10, axis: 0.4, color: 0x8d877b, ring: false },
    { id: 'quotes',   label: 'Words',    short: '02', orbit: 190, size: 19, speed: 0.22, incl: -0.16, axis: 1.9, color: 0x9c968a, ring: false },
    { id: 'projects', label: 'Workshop', short: '03', orbit: 272, size: 36, speed: 0.145, incl: 0.20, axis: 3.0, color: 0x7d776b, ring: true },
    { id: 'contact',  label: 'Signal',   short: '04', orbit: 350, size: 22, speed: 0.10, incl: -0.07, axis: 4.6, color: 0x8f897c, ring: false },
  ];
  const planetObjs = {};
  const clickable = [];

  function orbitRing(radius, incl, axis) {
    const pts = [];
    for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.LineLoop(geo, new THREE.LineDashedMaterial({ color: 0x9a9484, dashSize: 3, gapSize: 9, transparent: true, opacity: 0.7 }));
    line.computeLineDistances();
    line.rotation.set(incl, axis, 0);
    return line;
  }

  function buildPlanets() {
    PLANETS.forEach((p) => {
      scene.add(orbitRing(p.orbit, p.incl, p.axis));

      const pivot = new THREE.Group();      // tilted orbit plane
      pivot.rotation.set(p.incl, p.axis, 0);
      scene.add(pivot);

      const holder = new THREE.Group();      // revolves
      pivot.add(holder);

      const body = celSphere(p.size, p.color, 40);
      holder.add(body);
      body.userData.mesh.userData = { type: 'planet', id: p.id };
      clickable.push(body.userData.mesh);

      // craters
      const crater = new THREE.Mesh(new THREE.SphereGeometry(p.size * 0.18, 12, 10), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.4 }));
      crater.position.set(p.size * 0.5, p.size * 0.35, p.size * 0.6);
      body.add(crater);

      if (p.ring) {
        const tg = new THREE.TorusGeometry(p.size + 16, 1.6, 8, 80);
        const ring = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: INK }));
        ring.rotation.x = Math.PI / 2 - 0.4;
        holder.add(ring);
      }

      // selection ring (billboard)
      const sel = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), color: 0xa8553f, transparent: true, opacity: 0, depthWrite: false }));
      sel.scale.setScalar(p.size * 3.4);
      holder.add(sel);

      planetObjs[p.id] = { def: p, pivot, holder, body, sel, a: rand(0, 6.28) };

      // DOM label
      const lab = document.createElement('button');
      lab.className = 'p3d-label';
      lab.dataset.id = p.id;
      lab.innerHTML = `<span class="nm">${p.label}</span><span class="no">PLANET ${p.short}</span>`;
      lab.addEventListener('click', (e) => { e.stopPropagation(); if (planetClickCb) planetClickCb(p.id); });
      labelsBox.appendChild(lab);
      planetObjs[p.id].lab = lab;
    });
  }

  function ringTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); x.translate(64, 64);
    x.strokeStyle = '#a8553f'; x.lineWidth = 3; x.setLineDash([6, 8]);
    x.beginPath(); x.arc(0, 0, 56, 0, 7); x.stroke();
    return new THREE.CanvasTexture(c);
  }

  /* ---------- stars ---------- */
  let starPoints = null;
  function buildStars() {
    if (starPoints) { scene.remove(starPoints); starPoints.geometry.dispose(); }
    const N = Math.round(900 * state.density);
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = rand(650, 1900);
      const th = rand(0, Math.PI * 2), ph = Math.acos(rand(-1, 1));
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starPoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: INK, size: 5, map: DOT, transparent: true, opacity: 0.8, sizeAttenuation: true, depthWrite: false }));
    scene.add(starPoints);
  }

  /* ---------- meteors ---------- */
  const meteors = [];
  let meteorTimer = 3;
  function spawnMeteor() {
    const from = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(900, 1500));
    const to = from.clone().multiplyScalar(-1).add(new THREE.Vector3(rand(-300, 300), rand(-300, 300), rand(-300, 300)));
    const headG = new THREE.BufferGeometry().setFromPoints([from.clone(), from.clone()]);
    const line = new THREE.Line(headG, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 }));
    scene.add(line);
    meteors.push({ line, from, to, t: 0, dur: rand(1.1, 2.0) });
  }

  /* ---------- UFO ---------- */
  const ufo = new THREE.Group();
  const ufoBody = celSphere(18, 0x9b9488, 36); ufoBody.scale.set(1, 0.34, 1); ufo.add(ufoBody);
  const dome = celSphere(10, 0xc4bdad, 28); dome.scale.set(1, 0.8, 1); dome.position.y = 5.5; ufo.add(dome);
  // half-cut look: a dark base ring
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(18, 1.4, 6, 48), new THREE.MeshBasicMaterial({ color: INK }));
  baseRing.rotation.x = Math.PI / 2; ufo.add(baseRing);
  ['#a8553f', '#a8553f', '#a8553f'].forEach((c, i) => {
    const a = (i / 3) * Math.PI * 2;
    const lt = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), new THREE.MeshBasicMaterial({ color: 0xa8553f }));
    lt.position.set(Math.cos(a) * 14, -3, Math.sin(a) * 14);
    ufo.add(lt);
  });
  // face plane (billboard) with expression
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = 128;
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false, depthTest: false }));
  face.position.set(0, 5, 0); face.renderOrder = 5; ufo.add(face);
  ufoBody.userData.mesh.userData = { type: 'ufo' };
  dome.userData.mesh.userData = { type: 'ufo' };
  clickable.push(ufoBody.userData.mesh, dome.userData.mesh);
  scene.add(ufo);

  const EYES = {
    curious: (x) => { dots(x, 3.6); brow(x); },
    happy:   (x) => { arc(x, true); },
    tired:   (x) => { arc(x, false); },
    calm:    (x) => { dots(x, 2.4); },
    inspired:(x) => { star(x); },
  };
  function clearFace(x) { x.clearRect(0, 0, 128, 128); x.strokeStyle = '#2b2926'; x.fillStyle = '#2b2926'; x.lineWidth = 4; x.lineCap = 'round'; }
  function dots(x, r) { [44, 84].forEach((cx) => { x.beginPath(); x.arc(cx, 60, r, 0, 7); x.fill(); }); }
  function brow(x) { x.beginPath(); x.moveTo(34, 42); x.quadraticCurveTo(44, 36, 54, 42); x.stroke(); }
  function arc(x, up) { [44, 84].forEach((cx) => { x.beginPath(); if (up) { x.moveTo(cx - 9, 64); x.quadraticCurveTo(cx, 50, cx + 9, 64); } else { x.moveTo(cx - 9, 58); x.quadraticCurveTo(cx, 70, cx + 9, 58); } x.stroke(); }); }
  function star(x) { [44, 84].forEach((cx) => { x.beginPath(); x.moveTo(cx - 8, 60); x.lineTo(cx + 8, 60); x.moveTo(cx, 52); x.lineTo(cx, 68); x.stroke(); }); }
  function setUfoExpression(type) { const x = faceCanvas.getContext('2d'); clearFace(x); (EYES[type] || EYES.curious)(x); faceTex.needsUpdate = true; }
  setUfoExpression('curious');

  /* ---------- state ---------- */
  const state = {
    speedMult: 1, density: 1,
    ufoState: 'idle', ufoAng: 0,
    ufoPos: new THREE.Vector3(0, 40, 120), ufoTarget: new THREE.Vector3(0, 40, 120),
    tween: null,
  };
  let planetClickCb = null, ufoClickCb = null, bgClickCb = null;

  /* ---------- camera focus tween ---------- */
  function tweenTo(toTarget, toDist, dur) {
    const fromTarget = controls.target.clone();
    const fromDist = camera.position.distanceTo(controls.target);
    state.tween = { fromTarget, toTarget, fromDist, toDist, t: 0, dur: dur || 0.9 };
  }

  /* ---------- input: distinguish click from orbit-drag ---------- */
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const dt = performance.now() - down.t;
    down = null;
    if (moved > 7 || dt > 450) return;       // it was a drag
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(clickable, false);
    if (hits.length) {
      const ud = hits[0].object.userData;
      if (ud.type === 'planet' && planetClickCb) return planetClickCb(ud.id);
      if (ud.type === 'ufo' && ufoClickCb) return ufoClickCb();
    }
    if (bgClickCb) bgClickCb();
  });

  /* ---------- resize ---------- */
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ---------- label projection ---------- */
  const tmp = new THREE.Vector3();
  function updateLabel(id) {
    const o = planetObjs[id];
    o.holder.getWorldPosition(tmp);
    tmp.y -= o.def.size + 6;
    const v = tmp.clone().project(camera);
    const behind = v.z > 1;
    if (behind) { o.lab.style.opacity = 0; o.lab.style.pointerEvents = 'none'; return; }
    const x = (v.x * 0.5 + 0.5) * innerWidth;
    const y = (-v.y * 0.5 + 0.5) * innerHeight;
    o.lab.style.transform = `translate(-50%,0) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    o.lab.style.opacity = 1; o.lab.style.pointerEvents = 'auto';
  }

  /* ---------- animation loop ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;

    // planets revolve
    PLANETS.forEach((p) => {
      const o = planetObjs[p.id];
      if (!reduce) o.a += p.speed * state.speedMult * dt;
      o.holder.position.set(Math.cos(o.a) * p.orbit, 0, Math.sin(o.a) * p.orbit);
      o.body.rotation.y += dt * 0.3;
    });

    // sun rays gently pulse
    rays.material.rotation += dt * 0.05;

    // UFO
    if (state.ufoState === 'orbit' && !reduce) {
      state.ufoAng += 0.5 * state.speedMult * dt;
      state.ufoTarget.set(Math.cos(state.ufoAng) * 95, 38 + Math.sin(state.ufoAng * 2) * 8, Math.sin(state.ufoAng) * 95);
    }
    state.ufoPos.lerp(state.ufoTarget, 0.06);
    const bob = Math.sin(now * 0.0022) * (state.ufoState === 'orbit' ? 3 : 6);
    ufo.position.set(state.ufoPos.x, state.ufoPos.y + bob, state.ufoPos.z);
    ufo.rotation.z = (state.ufoTarget.x - state.ufoPos.x) * 0.004;
    face.lookAt(camera.position);

    // meteors
    if (!reduce) {
      meteorTimer -= dt;
      if (meteorTimer <= 0) { spawnMeteor(); meteorTimer = rand(2.5, 6) / state.density; }
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]; m.t += dt / m.dur;
      const head = m.from.clone().lerp(m.to, m.t);
      const tail = m.from.clone().lerp(m.to, Math.max(0, m.t - 0.05));
      m.line.geometry.setFromPoints([tail, head]);
      m.line.material.opacity = (m.t < 0.2 ? m.t / 0.2 : 1 - (m.t - 0.2) / 0.8) * 0.85;
      if (m.t >= 1) { scene.remove(m.line); m.line.geometry.dispose(); meteors.splice(i, 1); }
    }

    // camera focus tween
    if (state.tween) {
      const tw = state.tween; tw.t += dt / tw.dur;
      const k = tw.t >= 1 ? 1 : (tw.t < 0.5 ? 2 * tw.t * tw.t : 1 - Math.pow(-2 * tw.t + 2, 2) / 2);
      controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      const d = tw.fromDist + (tw.toDist - tw.fromDist) * k;
      const off = camera.position.clone().sub(controls.target).normalize().multiplyScalar(d);
      camera.position.copy(controls.target).add(off);
      if (tw.t >= 1) state.tween = null;
    }

    controls.update();
    renderer.render(scene, camera);
    Object.keys(planetObjs).forEach(updateLabel);
    requestAnimationFrame(loop);
  }

  /* ---------- public API (matches 2D engine) ---------- */
  window.Orrery = {
    init() { buildPlanets(); buildStars(); requestAnimationFrame(loop); },
    onPlanetClick(cb) { planetClickCb = cb; },
    onUfoClick(cb) { ufoClickCb = cb; },
    onBackgroundClick(cb) { bgClickCb = cb; },
    setUfoExpression,
    ufoOnboard() { state.ufoState = 'onboard'; state.ufoTarget.set(0, 36, 150); },
    ufoToOrbit() { state.ufoState = 'orbit'; },
    ufoToCenter(cb) {
      state.ufoState = 'center';
      // a point in front of the camera, near the look target → projects to screen centre
      const p = controls.target.clone().add(camera.position.clone().sub(controls.target).multiplyScalar(0.42));
      state.ufoTarget.copy(p);
      setTimeout(() => cb && cb(), 480);
    },
    focusPlanet(id) {
      const o = planetObjs[id]; if (!o) return;
      o.holder.getWorldPosition(tmp);
      tweenTo(tmp.clone(), Math.max(controls.minDistance + 10, o.def.size * 8 + 70), 0.9);
    },
    resetZoom() { tweenTo(new THREE.Vector3(0, 0, 0), 470, 0.9); },
    highlight(id) {
      Object.values(planetObjs).forEach((o) => { o.sel.material.opacity = 0; o.lab.classList.remove('sel'); });
      if (id && planetObjs[id]) { planetObjs[id].sel.material.opacity = 0.95; planetObjs[id].lab.classList.add('sel'); }
    },
    setPlanetSpeed(m) { state.speedMult = m; },
    setDensity(m) { state.density = m; buildStars(); },
    _debug() {
      PLANETS.forEach((p, i) => { const o = planetObjs[p.id]; o.a = i * 1.5 + 0.6; o.holder.position.set(Math.cos(o.a) * p.orbit, 0, Math.sin(o.a) * p.orbit); });
      state.ufoState = 'orbit'; state.ufoAng = 0.9;
      state.ufoTarget.set(Math.cos(0.9) * 95, 42, Math.sin(0.9) * 95); state.ufoPos.copy(state.ufoTarget);
      ufo.position.copy(state.ufoPos); face.lookAt(camera.position);
      controls.update(); renderer.render(scene, camera);
      Object.keys(planetObjs).forEach(updateLabel);
      return { children: scene.children.length, camPos: camera.position.toArray().map(Math.round) };
    },
  };
})();
