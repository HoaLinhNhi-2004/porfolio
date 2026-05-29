/* ============================================================
   Tweaks — pencil orrery
   ============================================================ */
const { useEffect } = React;

const ORRERY_DEFAULTS = /*EDITMODE-BEGIN*/{
  "planetSpeed": 1,
  "density": 1
}/*EDITMODE-END*/;

function OrreryTweaks() {
  const [t, setTweak] = useTweaks(ORRERY_DEFAULTS);

  useEffect(() => {
    if (window.Orrery) {
      window.Orrery.setPlanetSpeed(t.planetSpeed);
    }
  }, [t.planetSpeed]);

  useEffect(() => {
    if (window.Orrery) window.Orrery.setDensity(t.density);
  }, [t.density]);

  return (
    <TweaksPanel>
      <TweakSection label="Motion" />
      <TweakSlider
        label="Planet speed" value={t.planetSpeed} min={0} max={3} step={0.1} unit="×"
        onChange={(v) => setTweak('planetSpeed', v)}
      />
      <TweakSection label="Sky" />
      <TweakSlider
        label="Stars & meteors" value={t.density} min={0.3} max={2.4} step={0.1} unit="×"
        onChange={(v) => setTweak('density', v)}
      />
      <TweakSection label="Intro" />
      <TweakButton
        label="Replay UFO intro"
        onClick={() => window.OrreryUI && window.OrreryUI.replayIntro()}
      />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<OrreryTweaks />);
