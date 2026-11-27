// Synthesised sound effects, made with the Web Audio API: no sound
// files, no network. The context is created on the first user gesture
// (a key press or click), since browsers keep audio locked until then.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      context = null;
    }
    return context;
  }

  /** Unlock audio from a user gesture. Safe to call any time. */
  function unlock() {
    const ctx = ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = null) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function gobble() {
    // Two quick descending clucks, the turkey's own voice.
    tone(520, 0.09, 'square', 0.08, 0, 300);
    tone(460, 0.11, 'square', 0.08, 0.1, 260);
  }

  function jump() {
    tone(300, 0.16, 'sine', 0.1, 0, 620);
  }

  function slide() {
    tone(420, 0.14, 'sine', 0.06, 0, 180);
  }

  function corn() {
    tone(880, 0.09, 'sine', 0.1);
    tone(1318, 0.14, 'sine', 0.1, 0.07);
  }

  function golden() {
    tone(880, 0.1, 'sine', 0.1);
    tone(1108, 0.1, 'sine', 0.1, 0.08);
    tone(1479, 0.18, 'sine', 0.1, 0.16);
  }

  function hit() {
    tone(160, 0.22, 'sawtooth', 0.14, 0, 60);
    tone(90, 0.28, 'square', 0.1, 0.02, 45);
  }

  function hide() {
    tone(500, 0.12, 'sine', 0.07, 0, 900);
    tone(700, 0.1, 'sine', 0.06, 0.1, 1100);
  }

  function spotted() {
    // The farmer spots you: a short rising alarm.
    tone(392, 0.12, 'square', 0.07);
    tone(523, 0.12, 'square', 0.07, 0.11);
    tone(659, 0.18, 'square', 0.07, 0.22);
  }

  function escaped() {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.11, i * 0.12));
  }

  function caught() {
    const notes = [392, 330, 262, 196];
    notes.forEach((freq, i) => tone(freq, 0.28, 'triangle', 0.1, i * 0.16));
  }

  return {
    unlock,
    gobble,
    jump,
    slide,
    corn,
    golden,
    hit,
    hide,
    spotted,
    escaped,
    caught,
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}
