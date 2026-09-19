let ctx: AudioContext | null = null;
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let engineFilter: BiquadFilterNode | null = null;
let muted = false;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
  if (engineGain) engineGain.gain.value = m ? 0 : 0.05;
}

export function startEngine() {
  const a = ac();
  if (engineOsc) return;
  engineOsc = a.createOscillator();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = 60;
  engineFilter = a.createBiquadFilter();
  engineFilter.type = "lowpass";
  engineFilter.frequency.value = 600;
  engineGain = a.createGain();
  engineGain.gain.value = muted ? 0 : 0.05;
  engineOsc.connect(engineFilter).connect(engineGain).connect(a.destination);
  engineOsc.start();
}

export function engineRev(speed: number) {
  if (!engineOsc || !engineFilter) return;
  engineOsc.frequency.value = 45 + speed * 0.32;
  engineFilter.frequency.value = 350 + speed * 3;
}

export function stopEngine() {
  engineOsc?.stop();
  engineOsc = null;
  engineGain = null;
  engineFilter = null;
}

export function blip(freq: number, dur = 0.12, type: OscillatorType = "square", vol = 0.12) {
  if (muted) return;
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

export function noise(dur = 0.25, vol = 0.2) {
  if (muted) return;
  const a = ac();
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(g).connect(a.destination);
  src.start();
}
