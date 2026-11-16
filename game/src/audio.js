// HEADWATERS — procedural WebAudio: no sound files, everything synthesised.
// Water rush (looped filtered noise), gate clunks, delivery chimes, storm rumble.

let ctx = null;
let master = null;
let rushGain = null;
let rushSrc = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  // Looped brown-ish noise through a lowpass: the river's rush.
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  rushSrc = ctx.createBufferSource();
  rushSrc.buffer = buf;
  rushSrc.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 420;
  rushGain = ctx.createGain();
  rushGain.gain.value = 0.0;
  rushSrc.connect(filt).connect(rushGain).connect(master);
  rushSrc.start();
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}

export function isMuted() { return muted; }

// Rush volume follows total water flowing (0..1).
export function setRush(level) {
  if (!rushGain || !ctx) return;
  const target = muted ? 0 : Math.min(0.16, 0.02 + level * 0.14);
  rushGain.gain.setTargetAtTime(target, ctx.currentTime, 0.4);
}

function blip(freq, dur, type, vol, slideTo) {
  const c = ensure();
  if (!c || muted) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseBurst(dur, freq, vol) {
  const c = ensure();
  if (!c || muted) return;
  const t = c.currentTime;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export function sfx(name) {
  if (!ctx) return;
  switch (name) {
    case 'gateOpen': blip(180, 0.12, 'square', 0.10, 320); noiseBurst(0.08, 900, 0.12); break;
    case 'gateClose': blip(320, 0.12, 'square', 0.10, 140); noiseBurst(0.08, 700, 0.12); break;
    case 'coin': blip(880, 0.09, 'sine', 0.12); setTimeout(() => blip(1318, 0.12, 'sine', 0.10), 70); break;
    case 'deliver': blip(523, 0.14, 'sine', 0.12); setTimeout(() => blip(784, 0.18, 'sine', 0.12), 90); break;
    case 'jam': noiseBurst(0.25, 300, 0.25); blip(90, 0.25, 'sawtooth', 0.12, 60); break;
    case 'clear': blip(440, 0.08, 'triangle', 0.14, 660); setTimeout(() => blip(660, 0.1, 'triangle', 0.12), 60); break;
    case 'draft': blip(523, 0.12, 'triangle', 0.12); setTimeout(() => blip(659, 0.12, 'triangle', 0.12), 90); setTimeout(() => blip(784, 0.2, 'triangle', 0.12), 180); break;
    case 'pick': blip(784, 0.12, 'sine', 0.14); setTimeout(() => blip(1046, 0.22, 'sine', 0.12), 80); break;
    case 'warn': blip(220, 0.3, 'sawtooth', 0.12, 180); break;
    case 'flood': noiseBurst(0.7, 220, 0.3); blip(70, 0.7, 'sawtooth', 0.16, 40); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'triangle', 0.14), i * 130)); break;
    case 'lose': [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, 0.35, 'triangle', 0.12), i * 160)); break;
    case 'click': blip(600, 0.05, 'square', 0.06); break;
    default: break;
  }
}
