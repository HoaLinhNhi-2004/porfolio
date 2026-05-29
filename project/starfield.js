/* ============================================================
   Cosmos starfield + warp engine (vanilla, imperative)
   window.Cosmos.setAccent([r,g,b],[r,g,b]) | .setWarp(boost) | .setPull(0..1)
   ============================================================ */
(function () {
  const canvas = document.getElementById('cosmos-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  let W, H, cx, cy, dpr;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STAR_COUNT = reduce ? 320 : 720;
  const stars = [];
  let accent = [47, 230, 255];
  let accent2 = [255, 61, 240];
  let warpBoost = 0;     // from scroll velocity, decays
  let baseSpeed = 0.4;
  let pull = 0;          // black-hole pull 0..1
  let t = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = Math.floor(innerWidth * dpr);
    H = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    cx = W / 2; cy = H / 2;
  }

  function spawn(reset) {
    return {
      x: (Math.random() - 0.5) * W,
      y: (Math.random() - 0.5) * H,
      z: reset ? Math.random() * W : W,
      pz: 0,
      hue: Math.random(),
      tw: Math.random() * Math.PI * 2,
    };
  }
  function init() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) stars.push(spawn(true));
  }

  function lerp(a, b, k) { return a + (b - a) * k; }

  function frame() {
    t += 0.016;
    // fade trail
    ctx.fillStyle = 'rgba(3,4,9,' + (reduce ? 1 : 0.34) + ')';
    ctx.fillRect(0, 0, W, H);

    const speed = (baseSpeed + warpBoost) * dpr;
    warpBoost *= 0.92; // decay toward base

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.pz = s.z;
      s.z -= speed * (8 + s.z * 0.012);

      // black-hole pull: drag star centers inward + swirl
      if (pull > 0.001) {
        const ang = pull * 0.04;
        const nx = s.x * Math.cos(ang) - s.y * Math.sin(ang);
        const ny = s.x * Math.sin(ang) + s.y * Math.cos(ang);
        s.x = lerp(s.x, nx * (1 - pull * 0.012), 1);
        s.y = lerp(s.y, ny * (1 - pull * 0.012), 1);
      }

      if (s.z < 1) { Object.assign(s, spawn(false)); continue; }

      const k = 220 * dpr;
      const sx = cx + (s.x / s.z) * k;
      const sy = cy + (s.y / s.z) * k;
      const px = cx + (s.x / s.pz) * k;
      const py = cy + (s.y / s.pz) * k;

      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;

      const depth = 1 - s.z / W;            // 0 far -> 1 near
      const r = Math.max(0.4, depth * 2.4 * dpr);
      const twinkle = 0.6 + 0.4 * Math.sin(t * 2 + s.tw);

      // color: mostly cool white, sprinkle accent tints
      let col;
      if (s.hue < 0.16) col = accent;
      else if (s.hue < 0.28) col = accent2;
      else col = [220, 232, 255];
      const a = Math.min(1, depth * 1.4) * twinkle;

      if (!reduce && speed > 0.9) {
        // streak
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
        ctx.lineWidth = r;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, 6.283);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }

  window.Cosmos = {
    setAccent(a, b) { if (a) accent = a; if (b) accent2 = b; },
    setWarp(boost) { warpBoost = Math.min(6, warpBoost + boost); },
    setPull(p) { pull = Math.max(0, Math.min(1, p)); },
    setBase(v) { baseSpeed = Math.max(0.05, v); },
  };

  resize();
  init();
  window.addEventListener('resize', () => { resize(); init(); });
  requestAnimationFrame(frame);
})();
