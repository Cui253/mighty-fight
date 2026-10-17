/* ============================================================
   STREET BLITZ — chiptune engine (WebAudio, no assets)
   ============================================================ */
(function () {
  'use strict';

  let ac = null, master = null, mGain = null, sGain = null, noiseBuf = null;
  let muted = false, ready = false;
  let loopTimer = null, curTrack = null, step = 0, nextT = 0;

  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

  function nf(tok) {
    const m = /^([A-G]#?)(-?\d)$/.exec(tok);
    if (!m) return 0;
    const midi = (parseInt(m[2], 10) + 1) * 12 + NOTE[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(ac.destination);
    mGain = ac.createGain(); mGain.gain.value = 0.22; mGain.connect(master);
    sGain = ac.createGain(); sGain.gain.value = 0.55; sGain.connect(master);

    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.8), ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    ready = true;
    loopTimer = setInterval(sched, 70);
  }

  function now() { return ac ? ac.currentTime : 0; }

  /* -------- voices -------- */
  function tone(freq, t0, dur, type, vol, dest) {
    if (!ready || freq <= 0) return;
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.linearRampToValueAtTime(vol, t0 + 0.006);
    gn.gain.setValueAtTime(vol, t0 + Math.max(0.01, dur * 0.6));
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn); gn.connect(dest || sGain);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  function kick(t0, vol) {
    if (!ready) return;
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t0);
    o.frequency.exponentialRampToValueAtTime(42, t0 + 0.12);
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
    o.connect(gn); gn.connect(sGain);
    o.start(t0); o.stop(t0 + 0.2);
  }

  function nz(t0, dur, vol, freq, q, type) {
    if (!ready) return;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type || 'bandpass';
    f.frequency.value = freq; f.Q.value = q || 1;
    const gn = ac.createGain();
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(gn); gn.connect(sGain);
    s.start(t0, 0, dur + 0.05);
  }

  /* -------- music data -------- */
  const T = {
    title: {
      bpm: 118,
      lead: `A4 . . E5 . . D5 . C5 . . A4 . . . .
             F4 . . C5 . . B4 . A4 . . E4 . . . .`,
      bass: `A2 . . . . . A2 . F2 . . . . . E2 .`,
      drum: `k . . . h . . . k . . . h . h .`
    },
    select: {
      bpm: 126,
      lead: `E5 . G5 . A5 . G5 . E5 . D5 . E5 . . .
             C5 . D5 . E5 . D5 . B4 . A4 . . . . .`,
      bass: `A2 . A2 . A2 . A2 . G2 . G2 . E2 . E2 .`,
      drum: `k . h . s . h . k . h . s . h h`
    },
    stage1: {
      bpm: 146,
      lead: `A4 . C5 . E5 . D5 . C5 . A4 . G4 . . .
             A4 . C5 . E5 . G5 . E5 . D5 . C5 . . .
             F4 . A4 . C5 . A4 . G4 . B4 . D5 . B4 .
             A4 . C5 . E5 . D5 . C5 . B4 . A4 . . .`,
      bass: `A2 . . A2 . . E2 . A2 . . A2 . . C3 .
             A2 . . A2 . . E2 . A2 . . A2 . . G2 .
             F2 . . F2 . . C3 . G2 . . G2 . . D3 .
             A2 . . A2 . . E2 . A2 . . G2 . . E2 .`,
      drum: `k . h s . h k h k . h s . h k h
             k . h s . h k h k . h s . h s h
             k . h s . h k h k . h s . h k h
             k . h s . h k h s . s . s s s s`
    },
    stage2: {
      bpm: 134,
      lead: `D4 . F4 . A4 . G4 . F4 . D4 . . . . .
             D4 . F4 . A4 . C5 . A4 . G4 . F4 . . .
             Bb4 . A4 . G4 . F4 . E4 . D4 . . . . .
             F4 . G4 . A4 . C5 . D5 . C5 . A4 . . .`,
      bass: `D2 . . D2 . . A2 . D2 . . D2 . . F2 .
             D2 . . D2 . . A2 . D2 . . D2 . . C3 .
             Bb2 . . Bb2 . . F2 . C3 . . C3 . . G2 .
             D2 . . D2 . . A2 . D2 . . A2 . . C3 .`,
      drum: `k . h . s . h h k . h . s . h .
             k . h . s . h h k . h . s . s s
             k . h . s . h h k . h . s . h .
             k . h . s . h h s . s . s s s s`
    },
    stage3: {
      bpm: 158,
      lead: `E5 . E5 . G5 . E5 . D5 . B4 . E5 . . .
             E5 . G5 . B5 . A5 . G5 . E5 . D5 . . .
             C5 . E5 . G5 . E5 . D5 . C5 . B4 . . .
             B4 . D5 . E5 . G5 . A5 . G5 . E5 . . .`,
      bass: `E2 . E2 E2 . . B2 . E2 . E2 E2 . . G2 .
             E2 . E2 E2 . . B2 . E2 . E2 E2 . . D3 .
             C3 . C3 C3 . . G2 . D3 . D3 D3 . . A2 .
             E2 . E2 E2 . . B2 . E2 . E2 E2 . . B2 .`,
      drum: `k . h s k . h s k . h s k h s h
             k . h s k . h s k . h s k h s h
             k . h s k . h s k . h s k h s h
             k . h s k . h s s s s s s s s s`
    },
    clear: {
      bpm: 104,
      lead: `C5 . E5 . G5 . C6 . . . G5 . E5 . . .
             A4 . C5 . E5 . A5 . . . E5 . C5 . . .
             F4 . A4 . C5 . F5 . A5 . G5 . F5 . E5 .
             G4 . B4 . D5 . G5 . . . . . . . . .`,
      bass: `C3 . . . G2 . . . A2 . . . E2 . . .
             A2 . . . E2 . . . F2 . . . C3 . . .
             F2 . . . C3 . . . D3 . . . G2 . . .
             G2 . . . D3 . . . C3 . . . G2 . . .`,
      drum: `k . . h s . h . k . . h s . h h
             k . . h s . h . k . . h s . h h
             k . . h s . h . k . . h s . h h
             k . . h s . h . s . s . s s s s`
    },
    boss: {
      bpm: 164,
      lead: `E5 . F5 . E5 . D5 . C5 . D5 . E5 . . .
             B4 . C5 . B4 . A4 . G4 . A4 . B4 . . .
             E5 . F5 . G5 . A5 . G5 . F5 . E5 . . .
             D5 . E5 . F5 . E5 . D5 . C5 . B4 . . .`,
      bass: `E2 E2 . E2 E2 . E2 E2 C3 C3 . C3 C3 . B2 B2
             B2 B2 . B2 B2 . B2 B2 A2 A2 . A2 A2 . G2 G2
             E2 E2 . E2 E2 . E2 E2 C3 C3 . C3 C3 . B2 B2
             D3 D3 . D3 D3 . D3 D3 B2 B2 . B2 B2 . E2 E2`,
      drum: `k h s h k h s h k h s h k h s s
             k h s h k h s h k h s h k h s s
             k h s h k h s h k h s h k h s s
             k h s h k h s h s s s s s s s s`
    }
  };

  const CACHE = {};

  function parseTrack(name) {
    if (CACHE[name]) return CACHE[name];
    const src = T[name];
    if (!src) return null;
    const sp = (s) => s.trim().split(/\s+/).filter(Boolean);
    const tr = {
      bpm: src.bpm,
      lead: sp(src.lead),
      bass: sp(src.bass),
      drum: sp(src.drum),
      len: sp(src.lead).length
    };
    CACHE[name] = tr;
    return tr;
  }

  function sched() {
    if (!ready || !curTrack) return;
    const spb = 60 / curTrack.bpm / 2; // eighth notes
    while (nextT < ac.currentTime + 0.22) {
      const t0 = nextT;
      const L = curTrack.lead, B = curTrack.bass, D = curTrack.drum;
      const ln = L[step % L.length];
      if (ln && ln !== '.' && ln !== '-') {
        const fq = nf(ln);
        tone(fq, t0, spb * 1.45, 'square', 0.13, mGain);
        tone(fq * 2, t0, spb * 0.7, 'square', 0.035, mGain);
      }
      const bn = B[step % B.length];
      if (bn && bn !== '.' && bn !== '-') {
        tone(nf(bn), t0, spb * 1.7, 'triangle', 0.3, mGain);
        tone(nf(bn) * 2, t0, spb * 0.9, 'square', 0.06, mGain);
      }
      const dn = D[step % D.length];
      if (dn === 'k') kick(t0, 0.35);
      else if (dn === 's') nz(t0, 0.14, 0.2, 1900, 0.8);
      else if (dn === 'h') nz(t0, 0.05, 0.1, 7200, 0.7, 'highpass');

      nextT += spb;
      step++;
    }
  }

  function music(name) {
    init();
    if (!ready) return;
    if (curTrack && curTrack.name === name) return;
    const tr = parseTrack(name);
    if (!tr) return;
    curTrack = tr; curTrack.name = name;
    step = 0; nextT = ac.currentTime + 0.08;
  }

  function stopMusic() { curTrack = null; }

  /* -------- sfx -------- */
  const SFX = {
    swing: () => { const t = now(); nz(t, 0.09, 0.13, 2400, 0.6, 'highpass'); },
    hit: () => { const t = now(); nz(t, 0.1, 0.3, 900, 0.7); tone(180, t, 0.09, 'square', 0.12); },
    heavy: () => {
      const t = now();
      nz(t, 0.16, 0.35, 500, 0.6); kick(t, 0.3);
      tone(110, t, 0.16, 'sawtooth', 0.14);
    },
    hurt: () => {
      const t = now();
      tone(320, t, 0.07, 'square', 0.14); tone(200, t + 0.06, 0.12, 'square', 0.12);
    },
    jump: () => { const t = now(); tone(340, t, 0.11, 'square', 0.1); tone(560, t + 0.03, 0.09, 'square', 0.08); },
    land: () => { const t = now(); nz(t, 0.06, 0.1, 400, 0.8, 'lowpass'); },
    pickup: () => {
      const t = now();
      [660, 880, 1320].forEach((f, i) => tone(f, t + i * 0.06, 0.12, 'square', 0.12));
    },
    special: () => {
      const t = now();
      tone(160, t, 0.3, 'sawtooth', 0.1);
      for (let i = 0; i < 6; i++) nz(t + i * 0.05, 0.06, 0.12, 2500 + i * 400, 1);
      tone(900, t, 0.28, 'square', 0.06);
    },
    die: () => {
      const t = now();
      [440, 392, 330, 262, 196].forEach((f, i) => tone(f, t + i * 0.09, 0.16, 'square', 0.14));
    },
    break: () => { const t = now(); nz(t, 0.22, 0.3, 700, 0.5); kick(t, 0.2); },
    select: () => { const t = now(); tone(740, t, 0.06, 'square', 0.12); },
    start: () => {
      const t = now();
      [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.07, 0.14, 'square', 0.13));
    },
    clear: () => {
      const t = now();
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.115, 0.26, 'square', 0.13));
    },
    gameover: () => {
      const t = now();
      [392, 370, 349, 330, 262].forEach((f, i) => tone(f, t + i * 0.16, 0.3, 'triangle', 0.16));
    }
  };

  window.SND = {
    init,
    sfx(name) { if (!ready) init(); if (!ready || muted) return; const fn = SFX[name]; if (fn) fn(); },
    music,
    stopMusic,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.6;
      return muted;
    },
    get muted() { return muted; }
  };
})();
