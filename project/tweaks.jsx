/* ============================================================
   Tweaks panel — neon accent + feel
   ============================================================ */
const { useEffect } = React;

const COSMOS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": ["#2fe6ff", "#ff3df0"],
  "glassBlur": 18,
  "warp": 0.4
}/*EDITMODE-END*/;

const ACCENT_PALETTES = [
  ["#2fe6ff", "#ff3df0"], // cyan + magenta (default)
  ["#22d3ee", "#a78bfa"], // cyan + violet
  ["#34d399", "#22d3ee"], // emerald + cyan
  ["#ffb020", "#ff3df0"], // amber + magenta
  ["#60a5fa", "#f472b6"], // azure + rose
  ["#a78bfa", "#f0abfc"], // violet + orchid
];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function CosmosTweaks() {
  const [t, setTweak] = useTweaks(COSMOS_DEFAULTS);

  useEffect(() => {
    const [a, b] = t.accent;
    const ra = hexToRgb(a), rb = hexToRgb(b);
    const root = document.documentElement.style;
    root.setProperty('--accent', a);
    root.setProperty('--accent-2', b);
    root.setProperty('--accent-rgb', ra.join(', '));
    root.setProperty('--accent-2-rgb', rb.join(', '));
    root.setProperty('--glass-blur', t.glassBlur + 'px');
    if (window.Cosmos) {
      window.Cosmos.setAccent(ra, rb);
      window.Cosmos.setBase(t.warp);
    }
  }, [t]);

  return (
    <TweaksPanel>
      <TweakSection label="Neon accent" />
      <TweakColor
        label="Palette"
        value={t.accent}
        options={ACCENT_PALETTES}
        onChange={(v) => setTweak('accent', v)}
      />
      <TweakSection label="Feel" />
      <TweakSlider
        label="Glass blur" value={t.glassBlur} min={4} max={32} step={1} unit="px"
        onChange={(v) => setTweak('glassBlur', v)}
      />
      <TweakSlider
        label="Warp speed" value={t.warp} min={0.1} max={1.6} step={0.05}
        onChange={(v) => setTweak('warp', v)}
      />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<CosmosTweaks />);
