// WebAudio synthesis: SFX + light ambient music. No audio assets.
import { G } from './state.js';

let ac = null, sfxGain = null, musGain = null;
let musicTimer = null, currentMood = null;

export function initAudio() {
  const boot = () => {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(ac.destination);
    musGain = ac.createGain(); musGain.gain.value = 0.16; musGain.connect(ac.destination);
    if (currentMood) startMusic(currentMood, true);
  };
  window.addEventListener('pointerdown', boot, { once: true });
  window.addEventListener('keydown', boot, { once: true });
}

function env(gainNode, t0, a, peak, d) {
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(peak, t0 + a);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

function tone(freq, type, a, d, peak = 0.3, bend = 0, delay = 0) {
  if (!ac || !G.settings.sfx) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (bend) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + bend), t0 + a + d);
  env(g, t0, a, peak, d);
  o.connect(g); g.connect(sfxGain);
  o.start(t0); o.stop(t0 + a + d + 0.05);
}

function noiseBurst(dur, filterFreq, peak = 0.3, delay = 0, q = 1) {
  if (!ac || !G.settings.sfx) return;
  const t0 = ac.currentTime + delay;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filterFreq; f.Q.value = q;
  const g = ac.createGain(); env(g, t0, 0.005, peak, dur);
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t0);
}

export const sfx = {
  click() { tone(660, 'triangle', 0.004, 0.06, 0.18); },
  open() { tone(440, 'triangle', 0.004, 0.1, 0.15); tone(660, 'triangle', 0.004, 0.12, 0.12, 0, 0.05); },
  hit() { noiseBurst(0.09, 900, 0.4, 0, 0.8); tone(160, 'square', 0.004, 0.08, 0.14, -60); },
  hurt() { noiseBurst(0.12, 500, 0.35); tone(220, 'sawtooth', 0.004, 0.14, 0.12, -120); },
  swing() { noiseBurst(0.12, 1800, 0.14, 0, 0.5); },
  bow() { tone(880, 'sawtooth', 0.003, 0.05, 0.12, -400); noiseBurst(0.05, 2400, 0.1); },
  cast() { tone(520, 'sine', 0.02, 0.25, 0.2, 400); noiseBurst(0.25, 3000, 0.08, 0, 2); },
  fire() { noiseBurst(0.3, 700, 0.3, 0, 0.6); tone(120, 'sawtooth', 0.01, 0.25, 0.12, -40); },
  frost() { tone(1400, 'sine', 0.01, 0.3, 0.14, -900); noiseBurst(0.2, 4000, 0.08, 0, 3); },
  thunder() { noiseBurst(0.35, 1200, 0.45, 0, 0.4); tone(90, 'square', 0.005, 0.3, 0.2, -30); },
  heal() { for (let i = 0; i < 3; i++) tone(660 + i * 220, 'sine', 0.01, 0.3, 0.12, 0, i * 0.07); },
  buff() { tone(440, 'sine', 0.02, 0.3, 0.15, 220); },
  coin() { tone(1320, 'square', 0.002, 0.07, 0.1); tone(1760, 'square', 0.002, 0.12, 0.1, 0, 0.06); },
  loot() { tone(880, 'triangle', 0.004, 0.12, 0.15); tone(1100, 'triangle', 0.004, 0.14, 0.13, 0, 0.07); },
  levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 'triangle', 0.01, 0.3, 0.2, 0, i * 0.11)); },
  quest() { [659, 880, 1047].forEach((f, i) => tone(f, 'sine', 0.01, 0.35, 0.16, 0, i * 0.12)); },
  die() { [440, 330, 220, 165].forEach((f, i) => tone(f, 'sawtooth', 0.01, 0.4, 0.12, 0, i * 0.18)); },
  potion() { noiseBurst(0.15, 600, 0.15, 0, 2); tone(520, 'sine', 0.05, 0.2, 0.12, 140); },
  forge() { tone(180, 'square', 0.003, 0.2, 0.25, -40); noiseBurst(0.15, 2500, 0.25, 0.02); },
  forgeFail() { [330, 262, 196].forEach((f, i) => tone(f, 'sawtooth', 0.01, 0.25, 0.14, 0, i * 0.12)); },
  plat() { [1047, 1319, 1568].forEach((f, i) => tone(f, 'sine', 0.008, 0.3, 0.14, 0, i * 0.08)); },
  portal() { tone(220, 'sine', 0.05, 0.7, 0.2, 660); noiseBurst(0.5, 2000, 0.1, 0, 4); },
  stun() { tone(980, 'square', 0.004, 0.18, 0.14, -300); },
};

// --- ambient music: slow generative arpeggios per biome mood ---
const MOODS = {
  town:   { root: 220.0, scale: [0, 4, 7, 11, 12], pace: 1.9, wave: 'triangle' },
  meadow: { root: 196.0, scale: [0, 2, 4, 7, 9, 12], pace: 1.6, wave: 'sine' },
  forest: { root: 164.8, scale: [0, 3, 5, 7, 10, 12], pace: 2.1, wave: 'triangle' },
  desert: { root: 146.8, scale: [0, 1, 4, 5, 8, 12], pace: 2.4, wave: 'sine' },
  snow:   { root: 174.6, scale: [0, 2, 3, 7, 8, 12], pace: 2.6, wave: 'sine' },
  cave:   { root: 110.0, scale: [0, 1, 5, 6, 10, 12], pace: 3.0, wave: 'triangle' },
};

export function startMusic(mood) {
  currentMood = mood;
  if (!ac) return;
  stopMusic();
  const m = MOODS[mood] || MOODS.meadow;
  let step = 0;
  const playStep = () => {
    if (!G.settings.music) return;
    const t0 = ac.currentTime;
    const deg = m.scale[Math.floor(Math.random() * m.scale.length)];
    const oct = Math.random() < 0.3 ? 2 : 1;
    const freq = m.root * Math.pow(2, deg / 12) * oct;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = m.wave; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + m.pace * 1.4);
    o.connect(g); g.connect(musGain);
    o.start(t0); o.stop(t0 + m.pace * 1.5);
    if (step % 4 === 0) { // low drone
      const d = ac.createOscillator(), dg = ac.createGain();
      d.type = 'sine'; d.frequency.value = m.root / 2;
      dg.gain.setValueAtTime(0.0001, t0);
      dg.gain.exponentialRampToValueAtTime(0.35, t0 + 1.2);
      dg.gain.exponentialRampToValueAtTime(0.0001, t0 + m.pace * 4);
      d.connect(dg); dg.connect(musGain);
      d.start(t0); d.stop(t0 + m.pace * 4.2);
    }
    step++;
  };
  playStep();
  musicTimer = setInterval(playStep, (MOODS[mood]?.pace || 2) * 1000);
}
export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}
