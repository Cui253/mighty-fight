/* ============================================================
   MIGHTY FINAL FIGHT — fan remake (private use)
   NES-faithful: Cody / Guy / Haggar, Mad Gear, 5 rounds,
   PLAYER/ENEMY bars, LEVEL & EXP system, specials
   ============================================================ */
(function () {
  'use strict';

  const cv = document.getElementById('game');
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;

  const W = 480, H = 270, FLOOR = 150, ZMAX = 104, GRAV = 0.27;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const pad = (n, l) => String(n).padStart(l, '0');
  const rnd = ART.rnd;
  const PAL = ART.PAL;

  /* ---------------- input ---------------- */
  const Input = {
    ax: 0, ay: 0,
    q: { a: false, b: false, c: false, start: false, pause: false },
    press(k) { if (this.q[k]) { this.q[k] = false; return true; } return false; }
  };
  const keys = {};

  addEventListener('keydown', (e) => {
    const k = e.key;
    const lk = k.length === 1 ? k.toLowerCase() : k;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].indexOf(k) >= 0) e.preventDefault();
    if (lk === 'ArrowLeft' || lk === 'a') keys.left = 1;
    if (lk === 'ArrowRight' || lk === 'd') keys.right = 1;
    if (lk === 'ArrowUp' || lk === 'w') keys.up = 1;
    if (lk === 'ArrowDown' || lk === 's') keys.down = 1;
    if (lk === 'j' || lk === 'z') { if (!keys.atk) { Input.q.a = true; } keys.atk = 1; }
    if (lk === 'k' || lk === 'x') { if (!keys.jmp) { Input.q.b = true; } keys.jmp = 1; }
    if (lk === 'l' || lk === 'c') { if (!keys.spc) { Input.q.c = true; } keys.spc = 1; }
    if (lk === 'Enter' || lk === ' ') Input.q.start = true;
    if (lk === 'p' || lk === 'Escape') Input.q.pause = true;
    SND.init();
  });
  addEventListener('keyup', (e) => {
    const lk = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (lk === 'ArrowLeft' || lk === 'a') keys.left = 0;
    if (lk === 'ArrowRight' || lk === 'd') keys.right = 0;
    if (lk === 'ArrowUp' || lk === 'w') keys.up = 0;
    if (lk === 'ArrowDown' || lk === 's') keys.down = 0;
    if (lk === 'j' || lk === 'z') keys.atk = 0;
    if (lk === 'k' || lk === 'x') keys.jmp = 0;
    if (lk === 'l' || lk === 'c') keys.spc = 0;
  });

  const touchWrap = document.getElementById('touch');
  const stick = document.getElementById('stick');
  const knob = document.getElementById('knob');
  const R = 46;
  let stickId = null;

  function stickPos(e) {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const m = Math.min(len, R);
    knob.style.transform = 'translate(' + (dx / len * m).toFixed(1) + 'px,' + (dy / len * m).toFixed(1) + 'px)';
    Input.ax = (dx / len) * (m / R);
    Input.ay = (dy / len) * (m / R);
  }
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(e.pointerId);
    SND.init(); stickPos(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) { e.preventDefault(); stickPos(e); } });
  function stickEnd(e) {
    if (e.pointerId !== stickId) return;
    stickId = null; Input.ax = 0; Input.ay = 0; knob.style.transform = 'translate(0,0)';
  }
  stick.addEventListener('pointerup', stickEnd);
  stick.addEventListener('pointercancel', stickEnd);

  document.querySelectorAll('[data-b]').forEach((el) => {
    const k = el.dataset.b;
    const down = (e) => { e.preventDefault(); Input.q[k] = true; el.classList.add('down'); SND.init(); };
    const up = () => el.classList.remove('down');
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  });

  cv.addEventListener('pointerdown', () => { Input.q.a = true; Input.q.start = true; SND.init(); });

  const pauseBtn = document.getElementById('pause');
  pauseBtn.addEventListener('click', () => { Input.q.pause = true; });

  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    touchWrap.classList.remove('hidden');
  }
  setTimeout(() => { const h = document.getElementById('hint'); if (h) h.style.opacity = '0'; }, 9000);

  /* ---------------- data ---------------- */
  const CHARS = {
    cody: {
      key: 'cody', name: 'CODY', cn: '科迪', spd: 1.55, hp: 100, pow: 1.0,
      hair: 'long', style: '格斗术',
      moves: ['飞踢 / 膝击 / 旋风腿', '必杀：波动拳 LV4'],
      sp: 'hadouken', spLv: 4
    },
    guy: {
      key: 'guy', name: 'GUY', cn: '凯', spd: 1.85, hp: 88, pow: 0.92,
      hair: 'spiky', style: '忍术',
      moves: ['疾走 / 飞踢 / 膝击', '必杀：凯旋脚 LV4'],
      sp: 'hurricane', spLv: 4
    },
    haggar: {
      key: 'haggar', name: 'HAGGAR', cn: '哈格', spd: 1.25, hp: 122, pow: 1.32,
      hair: 'flat', style: '摔角技',
      moves: ['头锤 / 螺旋打桩', '必杀：双碎拳 初始'],
      sp: 'clothesline', spLv: 1
    }
  };
  const CHAR_KEYS = ['cody', 'guy', 'haggar'];

  const ATK = [
    { s: 3, a: 4, r: 8, dmg: 7, kb: 1.2, reach: 8, len: 23, next: 1 },
    { s: 4, a: 4, r: 9, dmg: 8, kb: 1.6, reach: 7, len: 25, next: 2 },
    { s: 6, a: 5, r: 16, dmg: 14, kb: 3.6, reach: 5, len: 27, next: 0, launch: true }
  ];

  const ETYPES = {
    jake:  { hp: 24, spd: 0.6, dmg: 7, score: 100, pal: 'jake', scale: 1, atkRange: 26, hair: 'spiky' },
    axel:  { hp: 32, spd: 0.82, dmg: 9, score: 150, pal: 'axel', scale: 1, atkRange: 26, hair: 'flat' },
    bill:  { hp: 30, spd: 0.92, dmg: 10, score: 200, pal: 'bill', scale: 0.97, atkRange: 27, hair: 'mohawk', weapon: 'knife' },
    fat:   { hp: 62, spd: 0.42, dmg: 13, score: 300, pal: 'fat', scale: 1.14, atkRange: 30, hair: 'flat', bulky: true },
    damnd:  { hp: 100, spd: 0.72, dmg: 12, score: 1000, pal: 'damnd', scale: 1.1, atkRange: 30, hair: 'flat', boss: true, armor: true },
    sodom:  { hp: 135, spd: 0.6, dmg: 14, score: 1500, pal: 'soma', scale: 1.16, atkRange: 34, hair: 'long', boss: true, armor: true, weapon: 'stick' },
    abigail:{ hp: 165, spd: 0.5, dmg: 16, score: 2000, pal: 'abigail', scale: 1.3, atkRange: 32, hair: 'mohawk', boss: true, armor: true, bulky: true },
    retu:   { hp: 195, spd: 0.55, dmg: 17, score: 2500, pal: 'fat', scale: 1.3, atkRange: 33, hair: 'flat', boss: true, armor: true, bulky: true },
    belger: { hp: 260, spd: 0.5, dmg: 20, score: 5000, pal: 'belger', scale: 1.35, atkRange: 36, hair: 'flat', boss: true, armor: true, bulky: true, weapon: 'stick' }
  };
  const BOSS_NAME = { damnd: 'DAMND', sodom: 'SODOM', abigail: 'ABIGAIL', retu: 'RETU', belger: 'BELGER' };

  const STAGES = [
    {
      name: 'SLUM', cn: '贫民窟', round: 1, len: 1900, endX: 1770, music: 'stage1', bg: 'slum',
      waves: [
        { x: 240, list: ['jake', 'jake'] },
        { x: 600, list: ['jake', 'axel'] },
        { x: 980, list: ['axel', 'jake', 'jake'] },
        { x: 1340, list: ['bill'] },
        { x: 1560, list: ['damnd'] }
      ],
      objs: [{ x: 420, z: 52, type: 'barrel' }, { x: 800, z: 90, type: 'crate' }, { x: 1180, z: 40, type: 'barrel' }]
    },
    {
      name: 'HABOR TOWN', cn: '港口镇', round: 2, len: 2000, endX: 1870, music: 'stage2', bg: 'habor',
      waves: [
        { x: 260, list: ['axel', 'axel'] },
        { x: 640, list: ['jake', 'bill'] },
        { x: 1040, list: ['bill', 'axel', 'jake'] },
        { x: 1400, list: ['fat'] },
        { x: 1640, list: ['sodom'] }
      ],
      objs: [{ x: 460, z: 44, type: 'barrel' }, { x: 880, z: 86, type: 'barrel' }, { x: 1280, z: 60, type: 'crate' }]
    },
    {
      name: 'FACTORY', cn: '工厂', round: 3, len: 2100, endX: 1960, music: 'stage3', bg: 'factory',
      waves: [
        { x: 280, list: ['fat', 'jake'] },
        { x: 700, list: ['axel', 'fat'] },
        { x: 1120, list: ['bill', 'jake', 'bill'] },
        { x: 1500, list: ['fat', 'axel'] },
        { x: 1740, list: ['abigail'] }
      ],
      objs: [{ x: 500, z: 50, type: 'crate' }, { x: 940, z: 40, type: 'barrel' }, { x: 1360, z: 84, type: 'barrel' }]
    },
    {
      name: 'RIVERSIDE', cn: '河岸', round: 4, len: 2100, endX: 1960, music: 'stage1', bg: 'river',
      waves: [
        { x: 280, list: ['bill', 'bill'] },
        { x: 700, list: ['fat', 'bill'] },
        { x: 1120, list: ['axel', 'axel', 'fat'] },
        { x: 1500, list: ['fat', 'fat'] },
        { x: 1740, list: ['retu'] }
      ],
      objs: [{ x: 520, z: 54, type: 'barrel' }, { x: 960, z: 46, type: 'crate' }, { x: 1380, z: 80, type: 'barrel' }]
    },
    {
      name: 'BAY AREA', cn: '湾区', round: 5, len: 2200, endX: 2060, music: 'stage2', bg: 'bay',
      waves: [
        { x: 300, list: ['fat', 'bill'] },
        { x: 720, list: ['axel', 'fat', 'bill'] },
        { x: 1160, list: ['fat', 'fat', 'bill'] },
        { x: 1560, list: ['axel', 'fat', 'jake'] },
        { x: 1860, list: ['belger'] }
      ],
      objs: [{ x: 540, z: 48, type: 'crate' }, { x: 1000, z: 42, type: 'barrel' }, { x: 1440, z: 86, type: 'barrel' }, { x: 1720, z: 56, type: 'crate' }]
    }
  ];

  /* ---------------- game state ---------------- */
  const G = {
    state: 'title', t: 0, stageIdx: 0, stage: null, camX: 0,
    player: null, enemies: [], objs: [], items: [], parts: [], pops: [], shots: [],
    score: 0, lives: 3, hi: 0, char: 'cody',
    lock: null, lockT: 0, waveIdx: 0, tokens: 2,
    shake: 0, msg: '', msgT: 0, combo: 0, comboT: 0,
    introT: 0, storyT: 0, clearT: 0, goT: 0, endT: 0, uid: 0, bonus: 0,
    menuSel: 0, muted: false, continueCount: 0
  };

  try { G.hi = parseInt(localStorage.getItem('sb_hi') || '0', 10) || 0; } catch (e) { G.hi = 0; }
  function saveHi() {
    if (G.score > G.hi) { G.hi = G.score; try { localStorage.setItem('sb_hi', String(G.hi)); } catch (e) {} }
  }

  /* ---------------- helpers ---------------- */
  function txt(s, x, y, size, color, align, outline) {
    g.font = 'bold ' + size + 'px "Courier New",ui-monospace,monospace';
    g.textAlign = align || 'center';
    g.textBaseline = 'middle';
    if (outline !== false) {
      g.fillStyle = outline || '#000';
      g.fillText(s, x + 1.5, y + 1.5);
    }
    g.fillStyle = color;
    g.fillText(s, x, y);
  }

  function spawnSpark(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      G.parts.push({
        x: x, y: y, vx: (Math.random() - 0.5) * 4.2, vy: -Math.random() * 3.2 - 0.4,
        life: 16 + Math.random() * 12, max: 26, col: col || '#fff', size: 1 + Math.random() * 1.6
      });
    }
  }
  function spawnDust(x, z, n) {
    for (let i = 0; i < n; i++) {
      G.parts.push({
        x: x + (Math.random() - 0.5) * 12, y: FLOOR + z, vx: (Math.random() - 0.5) * 1.4, vy: Math.random() * 1.1,
        life: 20, max: 20, col: 'rgba(200,200,200,', size: 2 + Math.random() * 2, dust: true
      });
    }
  }
  function addPop(x, z, s, col) {
    G.pops.push({ x: x, z: z, s: s, life: 46, col: col || '#ffe58a' });
  }
  function addExp(n) {
    const p = G.player;
    if (!p || p.level >= 9) return;
    p.exp += n;
    while (p.exp >= p.expNeed && p.level < 9) {
      p.exp -= p.expNeed;
      p.level++;
      p.expNeed = 30 + (p.level - 1) * 15;
      p.maxHp += 5; p.hp = Math.min(p.maxHp, p.hp + 14);
      G.msg = 'LEVEL UP! LV' + p.level; G.msgT = 70;
      SND.sfx('pickup');
      spawnSpark(p.x, FLOOR + p.z - 40, 14, '#8ff0ff');
    }
  }

  /* ---------------- entities ---------------- */
  function newPlayer(charKey) {
    const c = CHARS[charKey];
    return {
      kind: 'p', char: charKey, x: 50, z: 70, y: 0, vy: 0, vx: 0, ph: 0,
      face: 1, hp: c.hp, maxHp: c.hp, state: 'idle', st: 0, t: 0,
      atkIdx: 0, atk: ATK[0], atkPh: 0, hitSet: new Set(), queued: false, atkAir: false,
      inv: 0, flash: 0, grabbed: null, grabCool: 0, deadT: 0,
      level: 1, exp: 0, expNeed: 30, weapon: null, wUses: 0, spCool: 0
    };
  }

  function newEnemy(type, x, z) {
    const c = ETYPES[type];
    const rf = 1 + 0.12 * G.stageIdx;
    return {
      kind: 'e', id: ++G.uid, type: type, x: x, z: z, y: 0, vy: 0, vx: 0,
      hp: Math.round(c.hp * rf), maxHp: Math.round(c.hp * rf), face: -1, state: 'walk', st: 0, ph: Math.random() * 6,
      cfg: c, pal: c.pal, scale: 1, drawScale: c.scale, bulky: !!c.bulky, weapon: c.weapon || null,
      hair: c.hair || 'spiky', flash: 0, alive: true,
      cool: 26 + Math.random() * 40, hurtT: 0, deadT: 0, stagger: 0, landT: 0,
      token: false, hasHit: false, inv: 0
    };
  }

  /* ---------------- flow ---------------- */
  function startGame(charKey) {
    G.char = charKey;
    G.player = newPlayer(charKey);
    G.score = 0; G.lives = 3; G.continueCount = 0;
    loadStage(0, true);
    SND.sfx('start');
  }

  function loadStage(i, withStory) {
    G.stageIdx = i;
    G.stage = STAGES[i];
    G.waveIdx = 0; G.lock = null; G.lockT = 0; G.tokens = 2;
    G.enemies = []; G.items = []; G.parts = []; G.pops = []; G.shots = [];
    G.objs = G.stage.objs.map((o, k) => ({
      id: k, x: o.x, z: o.z, type: o.type,
      hp: o.type === 'barrel' ? 14 : 18, maxHp: o.type === 'barrel' ? 14 : 18
    }));
    const p = G.player;
    p.x = 50; p.z = 70; p.y = 0; p.vy = 0; p.vx = 0; p.ph = 0;
    p.state = 'idle'; p.st = 0; p.hp = p.maxHp; p.inv = 70; p.flash = 0;
    p.grabbed = null; p.deadT = 0; p.atkAir = false; p.hitSet = new Set(); p.grabCool = 0;
    p.weapon = null; p.wUses = 0;
    G.camX = 0; G.combo = 0; G.comboT = 0;
    G.msg = ''; G.msgT = 0;
    if (withStory && i === 0) { G.state = 'story'; G.storyT = 0; SND.stopMusic(); }
    else { G.state = 'map'; G.introT = 0; SND.stopMusic(); }
  }

  function beginRound() {
    G.state = 'intro'; G.introT = 0;
    SND.music(G.stage.music);
  }

  function toTitle() {
    G.state = 'title'; G.player = null; G.enemies = []; G.items = []; G.shots = [];
    SND.music('title');
  }

  /* ---------------- waves ---------------- */
  function startWave(w) {
    G.camX = clamp(G.player.x - 170, 0, G.stage.len - W);
    G.lock = { cam: G.camX };
    G.lockT = 0; G.tokens = 2;
    G.player.x = clamp(G.player.x, G.camX + 34, G.camX + W - 34);
    w.list.forEach((t, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const sx = side > 0 ? G.camX + W + 18 + i * 20 : G.camX - 18 - i * 20;
      const e = newEnemy(t, sx, 26 + Math.random() * 64);
      e.face = side > 0 ? -1 : 1;
      G.enemies.push(e);
    });
    const boss = w.list.some((t) => ETYPES[t].boss);
    if (boss) SND.music('boss');
    G.msg = boss ? 'BOSS!' : 'GO!'; G.msgT = 45;
  }

  function updateWaves() {
    const st = G.stage;
    if (!G.lock && G.waveIdx < st.waves.length) {
      if (G.player.x >= st.waves[G.waveIdx].x) startWave(st.waves[G.waveIdx]);
    }
    if (G.lock) {
      const anyAlive = G.enemies.some((e) => e.alive);
      if (!anyAlive) {
        G.lockT++;
        if (G.lockT > 40) {
          const w = st.waves[G.waveIdx];
          const wasBoss = w && w.list.some((t) => ETYPES[t].boss);
          G.lock = null; G.lockT = 0; G.waveIdx++;
          if (wasBoss) SND.music(st.music);
          G.msg = 'GO!!'; G.msgT = 40;
        }
      }
    }
  }

  /* ---------------- combat ---------------- */
  function gainOnHit() {
    addExp(1);
  }

  function hitEnemy(e, dmg, kb, launch) {
    if (!e.alive) return;
    const p = G.player;
    dmg = Math.round(dmg * (1 + (p.level - 1) * 0.06) * (p.weapon ? 1.2 : 1));
    e.hp -= dmg;
    e.flash = 7;
    G.combo++; G.comboT = 80;
    G.score += 10 + Math.min(G.combo, 20) * 3;
    gainOnHit();
    spawnSpark(e.x, FLOOR + e.z - 28, 5, '#ffe58a');
    SND.sfx(launch ? 'heavy' : 'hit');
    G.shake = Math.max(G.shake, launch ? 5 : 3);

    if (e.hp <= 0) { killEnemy(e, kb); return; }

    if (e.cfg.armor && !launch) {
      e.x += kb * 0.5;
      e.stagger++;
      if (e.stagger >= 7) { e.stagger = 0; e.state = 'hurt'; e.hurtT = 16; e.st = 0; e.vx = kb; }
      clampEnemy(e);
      return;
    }
    if (launch) {
      e.state = 'down'; e.st = 0; e.y = Math.max(e.y, 1); e.vy = 3.4; e.vx = kb * 1.25; e.landT = 0;
      if (e.token) { G.tokens++; e.token = false; }
    } else {
      e.state = 'hurt'; e.hurtT = 13; e.st = 0; e.vx = kb;
      if (e.token) { G.tokens++; e.token = false; }
    }
    clampEnemy(e);
  }

  function killEnemy(e, kb) {
    e.alive = false; e.deadT = 0;
    e.state = 'down'; e.y = Math.max(e.y, 1); e.vy = 3.8; e.vx = (kb || 2) * 1.3; e.landT = 0;
    G.score += e.cfg.score;
    addExp(e.cfg.boss ? 30 : 4);
    addPop(e.x, e.z, '+' + e.cfg.score, '#ffe58a');
    spawnSpark(e.x, FLOOR + e.z - 28, 12, '#ff9a4a');
    SND.sfx('die');
    if (e.token) { G.tokens++; e.token = false; }
    const r = Math.random();
    if (r < 0.14) G.items.push({ id: ++G.uid, x: e.x, z: e.z, kind: 'chicken', value: 30 });
    else if (r < 0.2) G.items.push({ id: ++G.uid, x: e.x, z: e.z, kind: 'burger', value: 22 });
    else if (r < 0.26) G.items.push({ id: ++G.uid, x: e.x, z: e.z, kind: 'pipe', value: 0 });
  }

  function playerHitCheck(p, A) {
    const c = CHARS[p.char];
    const reach = A.reach * 1 + (p.weapon ? 7 : 0);
    const len = A.len + (p.weapon ? 8 : 0);
    const x1 = p.face > 0 ? p.x + reach : p.x - reach - len;
    const x2 = x1 + len;
    let hit = false;
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (!e.alive || e.state === 'down') continue;
      if (p.hitSet.has(e.id)) continue;
      const ew = 9 * (e.drawScale || 1);
      if (e.x + ew > x1 && e.x - ew < x2 && Math.abs(e.z - p.z) < 17) {
        p.hitSet.add(e.id);
        hitEnemy(e, A.dmg * c.pow, p.face * A.kb, !!A.launch);
        hit = true;
      }
    }
    for (let i = 0; i < G.objs.length; i++) {
      const o = G.objs[i];
      if (o.hp <= 0 || p.hitSet.has('o' + o.id)) continue;
      if (o.x + 12 > x1 && o.x - 12 < x2 && Math.abs(o.z - p.z) < 17) {
        p.hitSet.add('o' + o.id);
        damageObject(o, A.dmg);
        hit = true;
      }
    }
    if (hit && p.weapon) {
      p.wUses--;
      if (p.wUses <= 0) { p.weapon = null; addPop(p.x, p.z, '武器损坏!', '#ffb0a0'); }
    }
    if (hit) G.shake = Math.max(G.shake, 3);
  }

  function airHitCheck(p) {
    const c = CHARS[p.char];
    const x1 = p.face > 0 ? p.x + 4 : p.x - 32;
    const x2 = x1 + 28;
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (!e.alive || e.state === 'down' || p.hitSet.has(e.id)) continue;
      if (e.x + 9 > x1 && e.x - 9 < x2 && Math.abs(e.z - p.z) < 18) {
        p.hitSet.add(e.id);
        hitEnemy(e, 12 * c.pow, p.face * 2.6, true);
        p.y = Math.max(p.y, 10);
      }
    }
    for (let i = 0; i < G.objs.length; i++) {
      const o = G.objs[i];
      if (o.hp <= 0 || p.hitSet.has('o' + o.id)) continue;
      if (o.x + 12 > x1 && o.x - 12 < x2 && Math.abs(o.z - p.z) < 18) {
        p.hitSet.add('o' + o.id); damageObject(o, 12);
      }
    }
  }

  function specialHit(p, dmg) {
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (!e.alive || e.state === 'down' || p.hitSet.has(e.id)) continue;
      if (Math.abs(e.x - p.x) < 46 && Math.abs(e.z - p.z) < 30) {
        p.hitSet.add(e.id);
        hitEnemy(e, dmg, p.face * 2.2, true);
      }
    }
    for (let i = 0; i < G.objs.length; i++) {
      const o = G.objs[i];
      if (o.hp <= 0 || p.hitSet.has('o' + o.id)) continue;
      if (Math.abs(o.x - p.x) < 46 && Math.abs(o.z - p.z) < 30) { p.hitSet.add('o' + o.id); damageObject(o, 14); }
    }
  }

  function startSpecial(p) {
    const c = CHARS[p.char];
    if (p.spCool > 0) return;
    if (p.level < c.spLv) {
      G.msg = c.sp + ' 需要 LV' + c.spLv; G.msgT = 60;
      return;
    }
    if (c.sp === 'hadouken') {
      p.state = 'punch3'; p.st = 0; p.atk = { s: 6, a: 4, r: 20, dmg: 0, kb: 0, reach: 0, len: 0, next: 0 }; p.atkIdx = 2; p.atkPh = 0; p.hitSet = new Set();
      G.shots.push({ id: ++G.uid, x: p.x + p.face * 14, z: p.z, y: 20, vx: p.face * 4.2, dmg: 16, life: 130, face: p.face, delay: 10 });
      SND.sfx('special');
      p.spCool = 70;
      return;
    }
    if (c.sp === 'hurricane') {
      if (p.hp <= 12) return;
      p.hp -= 8;
      p.state = 'spin'; p.st = 0; p.inv = 46; p.hitSet = new Set(); p.spinMove = true;
      SND.sfx('special');
      G.shake = 4; p.spCool = 90;
      return;
    }
    /* clothesline */
    if (p.hp <= 14) return;
    p.hp -= 10;
    p.state = 'spin'; p.st = 0; p.inv = 42; p.hitSet = new Set(); p.spinMove = false;
    SND.sfx('special');
    G.shake = 4; p.spCool = 80;
  }

  function damageObject(o, dmg) {
    o.hp -= dmg;
    SND.sfx('hit');
    spawnSpark(o.x, FLOOR + o.z - 16, 5, '#ffd24a');
    if (o.hp <= 0) {
      o.hp = 0;
      SND.sfx('break');
      G.shake = 6;
      spawnSpark(o.x, FLOOR + o.z - 16, 16, o.type === 'barrel' ? '#e4e4ee' : '#c99454');
      G.score += 60;
      const r = Math.random();
      if (r < 0.4) G.items.push({ id: ++G.uid, x: o.x, z: o.z, kind: 'chicken', value: 30 });
      else if (r < 0.55) G.items.push({ id: ++G.uid, x: o.x, z: o.z, kind: 'pipe', value: 0 });
      else if (r < 0.7) G.items.push({ id: ++G.uid, x: o.x, z: o.z, kind: 'burger', value: 22 });
    }
  }

  function damagePlayer(dmg, fromX) {
    const p = G.player;
    if (p.inv > 0 || p.state === 'down' || p.state === 'getup' || p.state === 'dead' || p.state === 'spin') return;
    p.hp -= dmg;
    p.flash = 9;
    G.shake = 6; G.combo = 0;
    SND.sfx('hurt');
    spawnSpark(p.x, FLOOR + p.z - 30, 6, '#ff6a5a');
    if (p.hp <= 0) { playerDie(); return; }
    p.state = 'hurt'; p.st = 0; p.vx = ((p.x - fromX) >= 0 ? 1 : -1) * 1.7;
    p.inv = 55; p.atkAir = false; p.grabbed = null;
  }

  function playerDie() {
    const p = G.player;
    p.hp = 0; p.state = 'dead'; p.st = 0; p.deadT = 0;
    p.y = 0; p.vy = 3.8; p.vx = -p.face * 2.2; p.atkAir = false; p.grabbed = null;
    SND.sfx('die');
    G.shake = 8;
  }

  /* ---------------- player update ---------------- */
  function startAttack(p) {
    p.atkIdx = 0; p.atk = ATK[0]; p.st = 0; p.state = 'atk';
    p.hitSet = new Set(); p.queued = false;
    SND.sfx('swing');
  }
  function startJump(p) {
    p.state = 'jump'; p.st = 0; p.vy = 4.45; p.atkAir = false;
    SND.sfx('jump');
    spawnDust(p.x, p.z, 3);
  }

  function clampPlayer(p) {
    const minX = G.lock ? G.lock.cam + 20 : 16;
    const maxX = G.lock ? G.lock.cam + W - 20 : G.stage.len - 24;
    p.x = clamp(p.x, minX, maxX);
    p.z = clamp(p.z, 4, ZMAX);
  }
  function clampEnemy(e) {
    e.z = clamp(e.z, 4, ZMAX);
    const minX = G.lock ? G.lock.cam - 70 : -40;
    const maxX = G.lock ? G.lock.cam + W + 70 : G.stage.len + 40;
    e.x = clamp(e.x, minX, maxX);
  }

  function updatePlayer() {
    const p = G.player, c = CHARS[p.char];
    p.t++;
    p.inv = Math.max(0, p.inv - 1);
    p.flash = Math.max(0, p.flash - 1);
    p.grabCool = Math.max(0, p.grabCool - 1);
    p.spCool = Math.max(0, p.spCool - 1);

    let mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (Math.abs(Input.ax) > 0.22 || Math.abs(Input.ay) > 0.22) { mx = Input.ax; my = Input.ay; }
    const spd = c.spd;

    if (p.state === 'dead') {
      p.y += p.vy; p.vy -= GRAV; p.x += p.vx; p.vx *= 0.94;
      if (p.y <= 0) { p.y = 0; p.vy = 0; p.vx = 0; }
      p.deadT++;
      if (p.deadT > 96) {
        G.lives--;
        if (G.lives < 0) {
          saveHi();
          G.state = 'gameover'; G.goT = 0;
          SND.stopMusic(); SND.sfx('gameover');
        } else {
          p.hp = p.maxHp; p.state = 'idle'; p.st = 0; p.deadT = 0;
          p.inv = 100; p.y = 0; p.z = 70; p.vx = 0; p.vy = 0;
          p.x = G.lock ? G.lock.cam + 70 : Math.max(40, p.x);
          G.enemies.forEach((e) => { if (e.alive && Math.abs(e.x - p.x) < 80) { e.state = 'walk'; e.cool = 70; if (e.token) { G.tokens++; e.token = false; } } });
        }
      }
      return;
    }

    if (p.state === 'hurt') {
      p.st++; p.x += p.vx; p.vx *= 0.86;
      if (p.st > 15) { p.state = 'idle'; p.st = 0; }
      clampPlayer(p); return;
    }

    if (p.state === 'down') {
      p.y += p.vy; p.vy -= GRAV; p.x += p.vx; p.vx *= 0.9;
      if (p.y <= 0) { p.y = 0; p.vy = 0; p.vx = 0; }
      p.st++;
      if (p.st > 46) { p.state = 'getup'; p.st = 0; p.inv = 55; }
      clampPlayer(p); return;
    }

    if (p.state === 'getup') {
      p.st++;
      if (p.st > 18) { p.state = 'idle'; p.st = 0; }
      clampPlayer(p); return;
    }

    if (p.state === 'atk') {
      const A = p.atk;
      p.st++;
      const tot = A.s + A.a + A.r;
      p.atkPh = clamp(p.st / tot, 0, 1);
      if (p.st <= A.s + A.a + 1) { p.x += p.face * 0.5; clampPlayer(p); }
      if (A.dmg > 0 && p.st >= A.s && p.st <= A.s + A.a) playerHitCheck(p, A);
      if (Input.press('a') && p.st > 2) p.queued = true;
      if (p.st >= tot) {
        if (p.queued && A.next > 0) {
          p.atkIdx = A.next; p.atk = ATK[p.atkIdx]; p.st = 0;
          p.hitSet = new Set(); p.queued = false;
          SND.sfx('swing');
        } else {
          p.state = 'idle'; p.st = 0; p.atkIdx = 0; p.queued = false;
        }
      }
      return;
    }

    if (p.state === 'jump') {
      p.y += p.vy; p.vy -= GRAV;
      if (Math.abs(mx) > 0.22) { p.x += mx * spd * 0.74; p.face = mx > 0 ? 1 : -1; }
      if (Math.abs(my) > 0.22) p.z += my * spd * 0.5;
      clampPlayer(p);
      if (Input.press('a')) { p.atkAir = true; p.hitSet = new Set(); SND.sfx('swing'); }
      if (p.atkAir) airHitCheck(p);
      if (p.y <= 0) {
        p.y = 0; p.vy = 0; p.atkAir = false; p.state = 'idle'; p.st = 0;
        spawnDust(p.x, p.z, 4); SND.sfx('land');
      }
      return;
    }

    if (p.state === 'spin') {
      p.st++;
      specialHit(p, 10 * c.pow);
      if (p.st % 9 === 0) p.hitSet = new Set(); // hurricane multi-hit
      if (p.spinMove) p.x += p.face * 1.15;
      clampPlayer(p);
      if (p.st > 34) { p.state = 'idle'; p.st = 0; p.spinMove = false; }
      return;
    }

    if (p.state === 'grab') {
      const e = p.grabbed;
      p.st++;
      if (!e || !e.alive || e.state !== 'grabbed') { p.state = 'idle'; p.grabbed = null; p.st = 0; return; }
      e.x = p.x + p.face * 15; e.z = p.z; e.y = 0; e.face = -p.face;
      if (p.st > 150) { releaseGrab(p); return; }
      if (Input.press('a')) {
        e.hp -= 9 * c.pow; e.flash = 7; G.score += 35; G.shake = 4;
        addExp(1);
        spawnSpark(e.x, FLOOR + e.z - 26, 7, '#ffe58a');
        SND.sfx('heavy');
        p.state = 'knee'; p.st = 0;
        if (e.hp <= 0) { killEnemy(e, p.face * 3); p.grabbed = null; p.state = 'idle'; p.st = 0; }
        return;
      }
      if (Input.press('b')) { throwEnemy(p); return; }
      if (Input.press('c')) { releaseGrab(p); return; }
      return;
    }

    if (p.state === 'knee') {
      p.st++;
      const e = p.grabbed;
      if (e && e.state === 'grabbed') { e.x = p.x + p.face * 13; e.z = p.z; }
      if (p.st > 15) { if (p.grabbed) { p.state = 'grab'; p.st = 0; } else { p.state = 'idle'; p.st = 0; } }
      return;
    }

    /* idle / walk */
    const moving = Math.abs(mx) > 0.2 || Math.abs(my) > 0.2;
    if (Math.abs(mx) > 0.2) {
      p.x += mx * spd; p.face = mx > 0 ? 1 : -1;
      /* advance the walk cycle by distance actually travelled, so feet
         stay glued to the ground (fixed per-frame steps caused stutter) */
      p.ph += Math.abs(mx) * spd * 0.19;
    }
    if (Math.abs(my) > 0.2) {
      p.z += my * spd * 0.62;
      p.ph += Math.abs(my) * spd * 0.10;
    }
    p.state = moving ? 'walk' : 'idle';
    if (!moving) { p.ph += 0.045; p.idleT = (p.idleT || 0) + 1; } else p.idleT = 0;
    p.bob = moving;
    p.st = 0;
    clampPlayer(p);

    if (Input.press('c')) { startSpecial(p); return; }
    if (Input.press('a')) { startAttack(p); return; }
    if (Input.press('b')) { startJump(p); return; }

    if (p.grabCool <= 0) tryGrab(p);
  }

  function tryGrab(p) {
    for (let i = 0; i < G.enemies.length; i++) {
      const e = G.enemies[i];
      if (!e.alive || e.state !== 'hurt') continue;
      if (Math.abs(e.x - p.x) < 18 && Math.abs(e.z - p.z) < 11) {
        p.state = 'grab'; p.grabbed = e; p.st = 0;
        e.state = 'grabbed'; e.st = 0;
        p.hitSet = new Set();
        SND.sfx('select');
        G.msg = '抓到了!'; G.msgT = 26;
        return;
      }
    }
  }

  function releaseGrab(p) {
    const e = p.grabbed;
    if (e && e.state === 'grabbed') { e.state = 'walk'; e.st = 0; e.cool = 30; e.x += p.face * 10; }
    p.grabbed = null; p.state = 'idle'; p.st = 0; p.grabCool = 20;
  }

  function throwEnemy(p) {
    const e = p.grabbed;
    if (!e) { p.state = 'idle'; return; }
    e.hp -= 8;
    SND.sfx('heavy'); G.shake = 6;
    if (e.hp <= 0) { killEnemy(e, p.face * 5); }
    else {
      e.state = 'down'; e.st = 0; e.y = Math.max(e.y, 8); e.vy = 3.6; e.vx = p.face * 5.4; e.landT = 0;
      addPop(e.x, e.z, '投掷!', '#ff9a4a');
    }
    p.grabbed = null; p.state = 'idle'; p.st = 0; p.grabCool = 30;
  }

  /* ---------------- enemy update ---------------- */
  function updateEnemy(e) {
    e.flash = Math.max(0, e.flash - 1);
    e.inv = Math.max(0, e.inv - 1);

    if (!e.alive) {
      e.deadT++;
      if (e.state === 'down') {
        e.y += e.vy; e.vy -= GRAV; e.x += e.vx; e.vx *= 0.9;
        if (e.y <= 0) { e.y = 0; e.vy = 0; e.vx = 0; }
      }
      return;
    }

    if (e.state === 'grabbed') return;

    if (e.state === 'hurt') {
      e.hurtT--; e.x += e.vx; e.vx *= 0.84;
      if (e.hurtT <= 0) { e.state = 'walk'; e.st = 0; }
      clampEnemy(e); return;
    }

    if (e.state === 'down') {
      e.y += e.vy; e.vy -= GRAV; e.x += e.vx; e.vx *= 0.9;
      if (e.y <= 0) {
        e.y = 0; e.vy = 0; e.vx = 0;
        e.landT++;
        if (e.landT > 26) { e.state = 'getup'; e.st = 0; e.landT = 0; e.inv = 40; }
      }
      clampEnemy(e); return;
    }

    if (e.state === 'getup') {
      e.st++;
      if (e.st > 26) { e.state = 'walk'; e.st = 0; }
      return;
    }

    if (e.state === 'eatk') {
      e.st++;
      const T1 = 14, T2 = 19, T3 = 42;
      if (e.st === T1) SND.sfx('swing');
      if (e.st >= T1 && e.st <= T2 && !e.hasHit) {
        const p = G.player;
        const dx = (p.x - e.x) * e.face;
        const reach = e.cfg.atkRange + (e.weapon ? 8 : 0) + 6;
        if (dx > -6 && dx < reach && Math.abs(p.z - e.z) < 16 && p.y < 24) {
          e.hasHit = true;
          damagePlayer(e.cfg.dmg, e.x);
        }
      }
      if (e.st > T3) {
        e.state = 'walk'; e.st = 0; e.cool = 46 + Math.random() * 46;
        if (e.token) { G.tokens++; e.token = false; }
      }
      return;
    }

    if (e.state === 'dash') {
      e.st++;
      e.x += e.face * 3.4;
      e.ph += 0.4;
      const p = G.player;
      if (!e.hasHit && Math.abs(p.x - e.x) < 20 && Math.abs(p.z - e.z) < 16) {
        e.hasHit = true; damagePlayer(e.cfg.dmg, e.x);
      }
      clampEnemy(e);
      if (e.st > 26) { e.state = 'walk'; e.st = 0; e.cool = 70; }
      return;
    }

    /* AI */
    const p = G.player;
    const dx = p.x - e.x, dz = p.z - e.z;
    const adx = Math.abs(dx), adz = Math.abs(dz);
    if (e.cool > 0) e.cool--;

    if (e.cfg.boss && (e.type === 'damnd' || e.type === 'belger') && e.cool <= 0 && adx > 60 && adx < 170 && Math.abs(dz) < 14) {
      e.state = 'dash'; e.st = 0; e.hasHit = false; e.face = dx > 0 ? 1 : -1; e.cool = 90;
      SND.sfx('special');
      return;
    }

    const range = e.cfg.atkRange;
    if (adx > range || adz > 9) {
      e.face = adx > 3 ? (dx > 0 ? 1 : -1) : e.face;
      const sp = e.cfg.spd;
      const movedX = adx > range ? Math.abs(Math.sign(dx) * sp) : 0;
      if (adx > range) e.x += Math.sign(dx) * sp;
      e.z += Math.sign(dz) * sp * 0.62 * Math.min(1, adz / 14);
      e.ph += movedX * 0.155 + 0.01;   /* distance-based step, same as the player */
      if (e.state !== 'walk') { e.state = 'walk'; e.st = 0; }
    } else {
      e.face = dx > 0 ? 1 : -1;
      if (e.state !== 'idle') { e.state = 'idle'; e.st = 0; }
      if (e.cool <= 0 && G.tokens > 0) {
        G.tokens--; e.token = true;
        e.state = 'eatk'; e.st = 0; e.hasHit = false;
        e.cool = 60 + Math.random() * 40;
      }
    }

    for (let i = 0; i < G.enemies.length; i++) {
      const o = G.enemies[i];
      if (o === e || !o.alive) continue;
      const ddx = e.x - o.x;
      if (Math.abs(ddx) < 16 && Math.abs(e.z - o.z) < 9) {
        e.x += (ddx >= 0 ? 1 : -1) * 0.35;
      }
    }
    clampEnemy(e);
  }

  /* ---------------- projectiles ---------------- */
  function updateShots() {
    for (let i = G.shots.length - 1; i >= 0; i--) {
      const s = G.shots[i];
      if (s.delay > 0) { s.delay--; continue; }
      s.x += s.vx; s.life--;
      let dead = s.life <= 0;
      for (let j = 0; j < G.enemies.length; j++) {
        const e = G.enemies[j];
        if (!e.alive || e.state === 'down') continue;
        if (Math.abs(e.x - s.x) < 12 && Math.abs(e.z - s.z) < 15) {
          hitEnemy(e, s.dmg, s.face * 2, true);
          dead = true;
          break;
        }
      }
      if (s.x < G.camX - 30 || s.x > G.camX + W + 30) dead = true;
      if (dead) {
        spawnSpark(s.x, FLOOR + s.z - s.y, 8, '#68c8ff');
        G.shots.splice(i, 1);
      }
    }
  }

  /* ---------------- world ---------------- */
  function updateWorld() {
    const st = G.stage;
    if (G.msgT > 0) G.msgT--;
    if (G.comboT > 0) { G.comboT--; if (G.comboT === 0) G.combo = 0; }
    G.shake *= 0.86; if (G.shake < 0.4) G.shake = 0;

    updatePlayer();
    updateShots();

    for (let i = G.enemies.length - 1; i >= 0; i--) {
      const e = G.enemies[i];
      updateEnemy(e);
      if (!e.alive && e.deadT > 96) G.enemies.splice(i, 1);
    }

    for (let i = G.items.length - 1; i >= 0; i--) {
      const f = G.items[i];
      const p = G.player;
      if (Math.abs(f.x - p.x) < 15 && Math.abs(f.z - p.z) < 11 && p.state !== 'dead') {
        if (f.kind === 'pipe') {
          p.weapon = 'pipe'; p.wUses = 8;
          addPop(f.x, f.z, '铁管 GET!', '#c8d8ff');
        } else {
          p.hp = Math.min(p.maxHp, p.hp + f.value);
          G.score += 60; addPop(f.x, f.z, '+' + f.value + ' HP', '#6ae06a');
        }
        SND.sfx('pickup');
        G.items.splice(i, 1);
      }
    }

    for (let i = G.parts.length - 1; i >= 0; i--) {
      const q = G.parts[i];
      q.x += q.vx; q.y += q.vy; q.vy += q.dust ? -0.02 : 0.18; q.vx *= 0.97;
      q.life--;
      if (q.life <= 0) G.parts.splice(i, 1);
    }
    for (let i = G.pops.length - 1; i >= 0; i--) {
      const q = G.pops[i]; q.life--; q.z += 0.14;
      if (q.life <= 0) G.pops.splice(i, 1);
    }

    updateWaves();

    if (G.lock) {
      G.camX = G.lock.cam;
      G.player.x = clamp(G.player.x, G.lock.cam + 20, G.lock.cam + W - 20);
    } else {
      const target = clamp(G.player.x - 170, 0, st.len - W);
      G.camX += (target - G.camX) * 0.16;
      if (Math.abs(target - G.camX) < 0.4) G.camX = target;
    }

    if (!G.lock && G.waveIdx >= st.waves.length && G.player.x >= st.endX && G.state === 'play') {
      G.state = 'clear'; G.clearT = 0;
      G.bonus = Math.floor(Math.max(0, G.player.hp)) * 8 + 800;
      G.score += G.bonus;
      saveHi();
      SND.stopMusic(); SND.sfx('clear');
    }
  }

  /* ---------------- NES-style backgrounds ---------------- */
  /* palette from the real screenshots: wall #ffa000 / dark #c07000 /
     window #4060f8+#60a0ff / sidewalk #bcbcbc / grass #48a068 / black */
  /* original background strips (baked from the NES Round 1 sheet, palette-swapped) */
  const BGIMG = {};
  (function () {
    if (typeof Image === 'undefined') return;
    ['slum', 'habor', 'factory', 'river', 'bay'].forEach(function (k) {
      const im = new Image();
      im.onload = function () { BGIMG[k] = im; };
      im.onerror = function () {};
      im.src = 'js/bg-' + k + '.png';
    });
  })();
  const BG_SPLIT = 110, BG_BAND_TOP = 110, BG_BAND_BOT = 146; // rows in the bg strip
  function drawOrigBG(cam, img) {
    const W = 480, FLOOR = 150, H = 270;
    const S = FLOOR / BG_SPLIT;           // buildings region scaled to reach the horizon
    const tw = img.width * S;
    const bandH = (BG_BAND_BOT - BG_BAND_TOP) * S;
    let off = -((cam * S) % tw); if (off > 0) off -= tw;
    for (let x = off - tw; x < W + tw; x += tw) {
      g.drawImage(img, 0, 0, img.width, BG_SPLIT, Math.round(x), 0, Math.ceil(tw), FLOOR);
      for (let y = FLOOR; y < H; y += bandH) {
        g.drawImage(img, 0, BG_BAND_TOP, img.width, BG_BAND_BOT - BG_BAND_TOP,
          Math.round(x), y, Math.ceil(tw), bandH);
      }
    }
    /* depth shading on the far walk rows so entities pop */
    g.fillStyle = 'rgba(0,0,0,.14)';
    g.fillRect(0, FLOOR, W, 10);
  }

  function nesBG(cam, kind) {
    const W = 480, FLOOR = 150;
    const img = BGIMG[kind] || BGIMG.slum;
    if (img) return drawOrigBG(cam, img);
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, FLOOR);

    /* building facade layers (2-depth parallax, NES chunky) */
    const layers = kind === 'slum' || kind === 'habor'
      ? [{ p: 0.35, col: '#c07000', win: '#2840b0' }, { p: 0.7, col: '#ffa000', win: '#4060f8' }]
      : [{ p: 0.35, col: '#585868', win: '#3848a0' }, { p: 0.7, col: '#8890a0', win: '#6070e0' }];
    if (kind === 'river') {
      layers[0].col = '#2868a8'; layers[0].win = '#183870';
      layers[1].col = '#3888c8'; layers[1].win = '#4060f8';
    }
    if (kind === 'bay') {
      layers[0].col = '#704898'; layers[0].win = '#382870';
      layers[1].col = '#a058b0'; layers[1].win = '#5840c0';
    }
    if (kind === 'factory') {
      layers[0].col = '#485848'; layers[0].win = '#283828';
      layers[1].col = '#687868'; layers[1].win = '#405848';
    }

    for (let li = 0; li < 2; li++) {
      const L = layers[li];
      const baseY = li === 0 ? 150 : 150;
      const topY = li === 0 ? 18 : 6;
      for (let i = 0; i < 8; i++) {
        const bw = 86;
        const bx = Math.round(i * bw - (cam * L.p) % bw - bw);
        /* wall */
        g.fillStyle = '#000';
        g.fillRect(bx, topY, bw, baseY - topY);
        g.fillStyle = L.col;
        g.fillRect(bx + 2, topY, bw - 4, baseY - topY);
        /* brick texture lines */
        g.fillStyle = 'rgba(0,0,0,.16)';
        for (let by = topY + 8; by < baseY - 30; by += 8) g.fillRect(bx + 2, by, bw - 4, 1);
        /* windows: 2 columns x rows */
        if (li === 1) {
          for (let r = 0; r < 3; r++) {
            const wy = topY + 12 + r * 30;
            for (let c = 0; c < 2; c++) {
              const wx = bx + 12 + c * 40;
              g.fillStyle = '#000';
              g.fillRect(wx - 2, wy - 2, 22, 22);
              g.fillStyle = L.win;
              g.fillRect(wx, wy, 18, 18);
              g.fillStyle = '#8ca0ff';
              g.fillRect(wx + 2, wy + 2, 6, 6);
              /* window sill */
              g.fillStyle = '#000';
              g.fillRect(wx - 3, wy + 20, 24, 3);
            }
          }
          /* door */
          const dx = bx + 32;
          g.fillStyle = '#000'; g.fillRect(dx - 2, baseY - 34, 26, 34);
          g.fillStyle = '#705028'; g.fillRect(dx, baseY - 32, 22, 32);
          g.fillStyle = '#a88040'; g.fillRect(dx + 3, baseY - 28, 7, 24);
          /* sign occasionally */
          if ((i + G.stageIdx) % 3 === 0) {
            g.fillStyle = '#000'; g.fillRect(bx + 6, baseY - 52, 74, 12);
            g.fillStyle = ['#e83828', '#3878e8', '#48a048'][(i + G.stageIdx) % 3];
            g.fillRect(bx + 8, baseY - 50, 70, 8);
            g.fillStyle = '#fff';
            g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(['BAR', 'HOTEL', 'SHOP', 'CAFE', 'GAME'][(i + G.stageIdx) % 5], bx + 43, baseY - 45);
          }
        }
      }
    }

    /* sidewalk */
    g.fillStyle = '#8a8a94';
    g.fillRect(0, 150, W, 10);
    g.fillStyle = '#bcbcbc';
    g.fillRect(0, 160, W, 110);
    /* sidewalk tile joints with parallax */
    g.fillStyle = '#9a9aa4';
    for (let x = Math.round(-(cam % 42)); x < W; x += 42) g.fillRect(x, 160, 2, 110);
    for (let y = 178; y < 270; y += 22) g.fillRect(0, y, W, 1);
    /* curb edge */
    g.fillStyle = '#d8d8e0';
    g.fillRect(0, 160, W, 2);
    g.fillStyle = '#70707a';
    g.fillRect(0, 150, W, 2);

    if (kind === 'river') {
      /* water strip behind sidewalk */
      g.fillStyle = '#2868c8';
      g.fillRect(0, 138, W, 12);
      g.fillStyle = '#5898e8';
      for (let x = Math.round(-(cam * 0.5 % 24)); x < W; x += 24) g.fillRect(x, 142, 12, 1);
    }
    if (kind === 'habor') {
      /* crates & rope posts at wall base */
      for (let i = 0; i < 6; i++) {
        const cx = Math.round(i * 150 - (cam * 0.7) % 150 - 150);
        g.fillStyle = '#000'; g.fillRect(cx, 126, 24, 24);
        g.fillStyle = '#a87838'; g.fillRect(cx + 2, 128, 20, 20);
        g.fillStyle = '#c89858'; g.fillRect(cx + 2, 128, 20, 4);
      }
    }
    if (kind === 'factory') {
      for (let i = 0; i < 6; i++) {
        const cx = Math.round(i * 140 - (cam * 0.7) % 140 - 140);
        g.fillStyle = '#000'; g.fillRect(cx, 118, 30, 32);
        g.fillStyle = '#586858'; g.fillRect(cx + 2, 120, 26, 30);
        g.fillStyle = '#788878'; g.fillRect(cx + 2, 120, 26, 5);
        g.fillStyle = '#e8c040';
        for (let s = 0; s < 5; s++) g.fillRect(cx + 3 + s * 5, 140 + (s % 2) * 4, 3, 3);
      }
    }
    if (kind === 'bay') {
      /* city skyline + moon */
      g.fillStyle = '#383848';
      for (let i = 0; i < 10; i++) {
        const bx2 = Math.round(i * 70 - (cam * 0.25) % 70 - 70);
        const bh = 30 + rnd(i + G.stageIdx * 7) * 40;
        g.fillRect(bx2, 110 - bh, 62, bh);
      }
      g.fillStyle = '#f8f0c8';
      g.beginPath(); g.arc(400, 40, 14, 0, 6.3); g.fill();
    }
  }

  /* ---------------- render ---------------- */
  function drawEnt(e) {
    const sx = e.x - G.camX;
    const sy = FLOOR + e.z - e.y;
    if (sx < -70 || sx > W + 70) return;

    if (e.kind === 'p') {
      const p = e;
      let ds = 'idle', ph = p.ph, alpha = 1, flash = p.flash > 0;
      switch (p.state) {
        case 'walk': ds = 'walk'; break;
        case 'atk': ds = ['punch1', 'punch2', 'punch3'][p.atkIdx] || 'punch1'; ph = p.atkPh; break;
        case 'jump': ds = p.atkAir ? 'jumpkick' : 'jump'; break;
        case 'hurt': ds = 'hurt'; break;
        case 'down': case 'dead': ds = 'down'; break;
        case 'getup': ds = 'getup'; break;
        case 'spin': ds = 'spin'; break;
        case 'grab': ds = 'grab'; break;
        case 'knee': ds = 'knee'; break;
        default: ds = 'idle';
      }
      if (p.inv > 0 && p.state !== 'dead' && p.state !== 'down') {
        /* gentle invulnerability blink: slow, low contrast, never on walk start */
        alpha = (Math.floor(G.t / 6) % 2 === 0) ? 0.78 : 1;
      }
      if (p.state === 'dead') alpha = clamp(1 - p.deadT / 130, 0.25, 1);
      ART.drawDude(g, {
        x: sx, y: sy, u: 2, face: p.face, pal: flash ? PAL.flash : PAL[CHARS[p.char].key],
        state: ds, ph: ph, t: p.t, alpha: alpha, hairStyle: CHARS[p.char].hair,
        weapon: p.weapon, bob: p.bob
      });
      return;
    }

    let ds = 'walk', ph = e.ph;
    switch (e.state) {
      case 'idle': ds = 'idle'; break;
      case 'walk': ds = 'walk'; break;
      case 'hurt': ds = 'hurt'; break;
      case 'down': case 'grabbed': ds = 'down'; break;
      case 'getup': ds = 'getup'; break;
      case 'eatk': ds = 'punch1'; ph = clamp(e.st / 42, 0, 1); break;
      case 'dash': ds = 'walk'; ph = e.ph; break;
      default: ds = 'walk';
    }
    let alpha = 1;
    if (!e.alive) alpha = clamp(1 - (e.deadT - 40) / 60, 0, 1);
    ART.drawDude(g, {
      x: sx, y: sy, u: 2 * (e.drawScale || 1), face: e.face,
      pal: e.flash > 0 ? PAL.flash : PAL[e.pal],
      state: ds, ph: ph, t: G.t, alpha: alpha, hairStyle: e.hair, weapon: e.weapon,
      bob: ds === 'walk'
    });
  }

  function drawWorld() {
    nesBG(G.camX, G.stage.bg);

    const list = [];
    for (let i = 0; i < G.objs.length; i++) { if (G.objs[i].hp > 0) list.push({ z: G.objs[i].z, k: 'o', r: G.objs[i] }); }
    for (let i = 0; i < G.items.length; i++) list.push({ z: G.items[i].z, k: 'f', r: G.items[i] });
    for (let i = 0; i < G.enemies.length; i++) list.push({ z: G.enemies[i].z, k: 'e', r: G.enemies[i] });
    list.push({ z: G.player.z, k: 'p', r: G.player });
    list.sort((a, b) => a.z - b.z);

    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (it.k === 'o') ART.drawObject(g, it.r, G.camX);
      else if (it.k === 'f') {
        if (it.r.kind === 'pipe') {
          const x = it.r.x - G.camX, y = FLOOR + it.r.z;
          g.fillStyle = 'rgba(0,0,0,.4)';
          g.beginPath(); g.ellipse(x, y + 1, 8, 2, 0, 0, 6.3); g.fill();
          g.save(); g.translate(x, y - 4);
          g.fillStyle = '#000'; g.fillRect(-9, -2, 18, 4);
          g.fillStyle = '#c8c8d4'; g.fillRect(-8, -1, 16, 2);
          g.restore();
        } else {
          ART.drawFood(g, { x: it.r.x, y: FLOOR + it.r.z, kind: it.r.kind, id: it.r.id }, G.camX, G.t);
        }
      }
      else drawEnt(it.r);
    }

    /* hadouken fireballs */
    for (let i = 0; i < G.shots.length; i++) {
      const s = G.shots[i];
      if (s.delay > 0) continue;
      const x = s.x - G.camX, y = FLOOR + s.z - s.y;
      g.fillStyle = '#000';
      g.fillRect(x - 7, y - 6, 14, 12);
      g.fillStyle = '#38a0f8';
      g.fillRect(x - 6, y - 5, 12, 10);
      g.fillStyle = '#a8e0ff';
      g.fillRect(x - 3 + Math.round(Math.sin(G.t * 0.6) * 2), y - 3, 6, 6);
      g.fillStyle = '#fff';
      g.fillRect(x - 1, y - 1, 3, 3);
    }

    /* particles */
    for (let i = 0; i < G.parts.length; i++) {
      const q = G.parts[i];
      const a = q.life / q.max;
      g.fillStyle = q.dust ? q.col + (a * 0.5) + ')' : q.col;
      g.globalAlpha = q.dust ? 1 : clamp(a, 0, 1);
      g.fillRect(Math.round(q.x - G.camX), Math.round(q.y), q.size, q.size);
    }
    g.globalAlpha = 1;

    /* popups */
    for (let i = 0; i < G.pops.length; i++) {
      const q = G.pops[i];
      g.globalAlpha = clamp(q.life / 30, 0, 1);
      txt(q.s, q.x - G.camX, FLOOR + q.z - 48, 9, q.col, 'center');
    }
    g.globalAlpha = 1;

    /* GO arrow */
    if (!G.lock && G.state === 'play' && G.waveIdx < G.stage.waves.length) {
      const a = 0.55 + Math.sin(G.t * 0.16) * 0.45;
      g.globalAlpha = a;
      g.fillStyle = '#ffe58a';
      const ax = W - 26;
      g.beginPath(); g.moveTo(ax, 126); g.lineTo(ax + 12, 136); g.lineTo(ax, 146); g.closePath(); g.fill();
      g.fillRect(ax - 10, 132, 10, 8);
      g.globalAlpha = 1;
    }
  }

  /* ---------------- NES HUD ---------------- */
  function drawHUD() {
    const p = G.player;
    if (!p) return;
    /* top black band */
    g.fillStyle = '#000'; g.fillRect(0, 0, W, 34);
    g.fillStyle = '#fff'; g.fillRect(0, 34, W, 1);

    g.font = 'bold 11px "Courier New",monospace';
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText('PLAYER', 10, 10);
    g.fillText('ENEMY', 10, 24);

    /* bars */
    function bar(x, y, w, h, ratio, col) {
      g.fillStyle = '#fff'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle = '#000'; g.fillRect(x, y, w, h);
      g.fillStyle = col || '#e8e8e8';
      g.fillRect(x, y, Math.max(0, Math.round(w * clamp(ratio, 0, 1))), h);
    }
    bar(76, 5, 130, 8, p.hp / p.maxHp, p.hp / p.maxHp > 0.3 ? '#e8e8e8' : '#e84038');
    const target = nearestEnemy();
    if (target) bar(76, 19, 130, 8, target.hp / target.maxHp, '#e84038');
    else bar(76, 19, 130, 8, 0);

    /* RD / PL */
    g.textAlign = 'right';
    g.fillStyle = '#fff';
    g.font = 'bold 11px "Courier New",monospace';
    g.fillText('RD', W - 58, 10);
    g.fillText('PL', W - 58, 24);
    g.textAlign = 'left';
    g.fillText(String(G.stage.round), W - 40, 10);
    g.fillText('x' + Math.max(0, G.lives), W - 46, 24);

    /* SCORE small */
    g.textAlign = 'center';
    g.fillStyle = '#8ff0ff';
    g.fillText(pad(G.score, 7), W / 2, 10);
    g.fillStyle = '#ffe58a';
    g.fillText('HI ' + pad(G.hi, 7), W / 2, 24);

    /* weapon indicator */
    if (p.weapon) {
      g.textAlign = 'left';
      g.fillStyle = '#c8d8ff';
      g.fillText('PIPE x' + p.wUses, 216, 10);
    }

    /* bottom band: LEVEL & EXP */
    g.fillStyle = '#000'; g.fillRect(0, H - 16, W, 16);
    g.fillStyle = '#fff'; g.fillRect(0, H - 17, W, 1);
    g.textAlign = 'left';
    g.fillStyle = '#fff';
    g.fillText('LEVEL', 10, H - 8);
    const lw = 90;
    g.fillStyle = '#fff'; g.fillRect(58, H - 12, lw + 2, 10);
    g.fillStyle = '#000'; g.fillRect(59, H - 11, lw, 8);
    g.fillStyle = '#f8d040';
    g.fillRect(59, H - 11, lw * clamp((p.level - 1) / 8, 0, 1), 8);
    /* exp fill within current level */
    g.fillStyle = '#e87830';
    g.fillRect(59, H - 11, lw * clamp(p.exp / p.expNeed, 0, 1) * (1 / 8), 8);
    g.textAlign = 'right';
    g.fillText('EXP ' + pad(p.exp, 3) + '/' + pad(p.expNeed, 3), W - 10, H - 8);
    g.textAlign = 'left';
    g.fillStyle = '#8ff0ff';
    g.fillText('LV' + p.level, 152, H - 8);

    if (target && target.cfg.boss && target.alive) {
      g.textAlign = 'center';
      g.fillStyle = '#ff7060';
      g.fillText(BOSS_NAME[target.type] || 'BOSS', W / 2, 40);
    }

    if (G.msgT > 0 && G.msg) {
      g.globalAlpha = clamp(G.msgT / 20, 0, 1);
      txt(G.msg, W / 2, 66, 17, '#ffe58a', 'center');
      g.globalAlpha = 1;
    }
    if (G.combo > 1 && G.comboT > 0) {
      txt(G.combo + ' HITS', W - 12, 46, 10, '#ffe58a', 'right');
    }
  }

  function nearestEnemy() {
    let best = null, bd = 1e9;
    for (const e of G.enemies) {
      if (!e.alive) continue;
      const d = Math.abs(e.x - G.player.x);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  /* ---------------- screens ---------------- */
  function drawTitle() {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    /* skyline strip */
    g.fillStyle = '#101028';
    for (let i = 0; i < 12; i++) {
      const bx = i * 44 - 8;
      const bh = 30 + rnd(i + 3) * 60;
      g.fillRect(bx, 168 - bh, 38, bh);
      for (let wy = 168 - bh + 6; wy < 160; wy += 10) {
        for (let wx = bx + 5; wx < bx + 32; wx += 9) {
          if (rnd(wx * 0.7 + wy) > 0.6) { g.fillStyle = '#f8d878'; g.fillRect(wx, wy, 3, 4); g.fillStyle = '#101028'; }
        }
      }
    }
    g.fillStyle = '#7050a0';
    g.fillRect(0, 168, W, 10);
    g.fillStyle = '#bcbcbc';
    g.fillRect(0, 178, W, H - 178);

    /* logo */
    const bounce = Math.sin(G.t * 0.055) * 2;
    g.font = 'bold 44px "Courier New",monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#a02018';
    g.fillText('MIGHTY', W / 2 + 3, 62 + bounce + 3);
    g.fillStyle = '#f83820';
    g.fillText('MIGHTY', W / 2, 62 + bounce);
    g.fillStyle = '#a02018';
    g.font = 'bold 34px "Courier New",monospace';
    g.fillText('FINAL FIGHT', W / 2 + 2, 104 + bounce + 2);
    g.fillStyle = '#f8f8f8';
    g.fillText('FINAL FIGHT', W / 2, 104 + bounce);
    txt('FAN REMAKE · 仅供个人娱乐', W / 2, 134, 10, '#8ff0ff', 'center');

    /* the three heroes */
    ART.drawDude(g, { x: 90, y: 246, u: 2.4, face: 1, pal: PAL.cody, state: 'idle', t: G.t, hairStyle: 'long' });
    ART.drawDude(g, { x: 150, y: 246, u: 2.4, face: 1, pal: PAL.guy, state: 'idle', t: G.t + 20, hairStyle: 'spiky' });
    ART.drawDude(g, { x: 216, y: 246, u: 2.4, face: 1, pal: PAL.haggar, state: 'idle', t: G.t + 40, hairStyle: 'flat' });
    /* goon */
    ART.drawDude(g, { x: 400, y: 246, u: 2.4, face: -1, pal: PAL.jake, state: 'walk', ph: G.t * 0.14, t: G.t, hairStyle: 'spiky' });

    if (Math.floor(G.t / 26) % 2 === 0) txt('TAP SCREEN / PRESS ENTER', W / 2, 196, 11, '#fff', 'center');
    txt('HI-SCORE ' + pad(G.hi, 7), W / 2, 216, 9, '#ffe58a', 'center');
  }

  function drawSelect() {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    txt('SELECT PLAYER', W / 2, 26, 20, '#f8f8f8', 'center');
    txt('选择角色（←→ 选择，A 确定）', W / 2, 48, 9, '#8ff0ff', 'center');

    for (let i = 0; i < 3; i++) {
      const k = CHAR_KEYS[i], c = CHARS[k];
      const x = 70 + i * 120, y = 66, w = 100, h = 168;
      const sel = G.menuSel === i;
      g.fillStyle = sel ? '#182858' : '#101018';
      g.fillRect(x, y, w, h);
      g.strokeStyle = sel ? '#f8f8f8' : '#383850';
      g.lineWidth = sel ? 2 : 1;
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

      ART.drawPortrait(g, k, x + w / 2, y + 30, 2);
      txt(c.name, x + w / 2, y + 52, 12, sel ? '#ffe58a' : '#f8f8f8', 'center');
      txt(c.cn + ' · ' + c.style, x + w / 2, y + 68, 8, '#8ff0ff', 'center');
      /* stats */
      const stats = [[c.hp / 130, '#48c048'], [c.pow / 1.4, '#e84038'], [c.spd / 2, '#3878e8']];
      for (let s = 0; s < 3; s++) {
        g.fillStyle = '#282838';
        g.fillRect(x + 12, y + 80 + s * 6, w - 24, 4);
        g.fillStyle = stats[s][1];
        g.fillRect(x + 12, y + 80 + s * 6, (w - 24) * clamp(stats[s][0], 0, 1), 4);
      }
      /* move list */
      for (let m = 0; m < c.moves.length; m++) {
        txt(c.moves[m], x + w / 2, y + 108 + m * 13, 7.5, '#c8c8d8', 'center');
      }
      txt('速度×' + c.spd.toFixed(2), x + w / 2, y + 150, 7, '#707890', 'center');
    }
    if (Math.floor(G.t / 26) % 2 === 0) txt('按 A / J 出击!', W / 2, 250, 11, '#ffe58a', 'center');
  }

  function drawStory() {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const lines = [
      '疯狂齿轮帮（MAD GEAR）',
      '绑架了市长之女 杰西卡！',
      '',
      '街道沦为法外之地……',
      '',
      '白日的格斗家 科迪',
      '隐世的忍者 凯',
      '还有市长本人 哈格',
      '',
      '三个男人走向了街头。'
    ];
    const show = Math.floor(G.storyT / 14);
    for (let i = 0; i < Math.min(lines.length, show); i++) {
      txt(lines[i], W / 2, 40 + i * 20, 11, i < 2 ? '#ff7060' : '#e8e8f0', 'center');
    }
    if (G.storyT > lines.length * 14 + 40) {
      if (Math.floor(G.t / 26) % 2 === 0) txt('TAP / ENTER', W / 2, 246, 10, '#ffe58a', 'center');
    }
    /* silhouettes */
    if (G.storyT > 60) {
      g.globalAlpha = 0.8;
      ART.drawDude(g, { x: 60, y: 190, u: 2, face: 1, pal: PAL.cody, state: 'idle', t: G.t, hairStyle: 'long' });
      ART.drawDude(g, { x: 100, y: 190, u: 2, face: 1, pal: PAL.guy, state: 'idle', t: G.t + 20, hairStyle: 'spiky' });
      ART.drawDude(g, { x: 145, y: 190, u: 2, face: 1, pal: PAL.haggar, state: 'idle', t: G.t + 40, hairStyle: 'flat' });
      g.globalAlpha = 1;
    }
  }

  function drawMap() {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    txt('ROUND ' + G.stage.round, W / 2, 40, 22, '#f8f8f8', 'center');
    txt(G.stage.cn + ' - ' + G.stage.name, W / 2, 68, 11, '#8ff0ff', 'center');

    /* metro city map */
    const zones = [
      { n: 'SLUM', x: 90, y: 150 },
      { n: 'HABOR TOWN', x: 190, y: 120 },
      { n: 'FACTORY', x: 292, y: 150 },
      { n: 'RIVERSIDE', x: 148, y: 196 },
      { n: 'BAY AREA', x: 250, y: 208 }
    ];
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      const cur = i === G.stageIdx;
      const done = i < G.stageIdx;
      g.fillStyle = done ? '#285828' : '#48a048';
      g.beginPath();
      g.ellipse(z.x, z.y, 48, 22, 0, 0, 6.3);
      g.fill();
      g.strokeStyle = '#78d078'; g.lineWidth = 2;
      g.stroke();
      txt(z.n, z.x, z.y, 9, '#fff', 'center');
      if (cur && Math.floor(G.t / 16) % 2 === 0) {
        g.fillStyle = '#f83820';
        g.beginPath();
        g.moveTo(z.x, z.y - 34);
        g.lineTo(z.x - 7, z.y - 46); g.lineTo(z.x + 7, z.y - 46);
        g.closePath(); g.fill();
      }
    }
    if (G.introT > 50 && Math.floor(G.t / 26) % 2 === 0) txt('TAP / ENTER 开始', W / 2, 250, 10, '#ffe58a', 'center');
  }

  function drawIntro() {
    nesBG(G.camX, G.stage.bg);
    g.fillStyle = 'rgba(0,0,0,' + clamp(G.introT / 20, 0, 0.75) + ')';
    g.fillRect(0, 0, W, H);
    if (G.introT > 16) {
      txt('ROUND ' + G.stage.round, W / 2, 100, 18, '#f8f8f8', 'center');
      txt(G.stage.name, W / 2, 128, 26, '#ffe58a', 'center');
      txt(G.stage.cn, W / 2, 152, 11, '#8ff0ff', 'center');
    }
    if (G.introT > 56 && Math.floor(G.t / 20) % 2 === 0) {
      txt('READY!', W / 2, 190, 16, '#f83820', 'center');
    }
  }

  function drawPause() {
    g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(0, 0, W, H);
    txt('PAUSE', W / 2, 116, 26, '#f8f8f8', 'center');
    txt('按 P / ❚❚ 继续', W / 2, 148, 11, '#c8c8d8', 'center');
    txt('MUSIC: ' + (SND.muted ? 'OFF' : 'ON') + '（连按两次❚❚静音）', W / 2, 172, 8, '#707890', 'center');
  }

  function drawClear() {
    g.fillStyle = 'rgba(0,0,0,.78)'; g.fillRect(0, 0, W, H);
    txt('ROUND ' + G.stage.round + ' CLEAR!', W / 2, 88, 24, '#ffe58a', 'center');
    txt(G.stage.cn + ' 制压完成', W / 2, 116, 11, '#c8c8d8', 'center');
    txt('BONUS  +' + G.bonus, W / 2, 148, 14, '#8ff0ff', 'center');
    txt('SCORE  ' + pad(G.score, 7), W / 2, 174, 11, '#fff', 'center');
    txt('LV' + G.player.level + '  EXP ' + pad(G.player.exp, 3) + '/' + pad(G.player.expNeed, 3), W / 2, 196, 9, '#f8d040', 'center');
    if (G.clearT > 100 && Math.floor(G.t / 26) % 2 === 0) {
      txt(G.stageIdx < STAGES.length - 1 ? 'TAP / ENTER → NEXT ROUND' : 'TAP / ENTER → FINAL', W / 2, 224, 10, '#ffe58a', 'center');
    }
  }

  function drawGameOver() {
    g.fillStyle = 'rgba(0,0,0,.8)'; g.fillRect(0, 0, W, H);
    txt('GAME OVER', W / 2, 92, 30, '#f83820', 'center');
    txt('SCORE  ' + pad(G.score, 7), W / 2, 130, 12, '#fff', 'center');
    const left = Math.max(0, 9 - Math.floor(G.goT / 60));
    if (left > 0) {
      txt('CONTINUE?  ' + left, W / 2, 164, 13, '#ffe58a', 'center');
      txt('按 A / TAP 继续（第 ' + (G.continueCount + 1) + ' 次续关）', W / 2, 190, 9, '#c8c8d8', 'center');
    } else {
      txt('THANKS FOR PLAYING', W / 2, 170, 11, '#c8c8d8', 'center');
    }
  }

  function drawEnding() {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const t = G.endT;
    txt('CONGRATULATIONS!', W / 2, 48, 20, '#ffe58a', 'center');
    const lines = [
      '贝尔加被打倒了，疯狂齿轮帮瓦解。',
      '杰西卡平安获救。',
      '',
      '黎明的 Metro City，',
      '街道又恢复了往日的喧闹。',
      '',
      '科迪：\"接下来去吃热狗吧。\"',
      '凯：\"你只会吃。\"',
      '哈格：\"都给我去锻炼!\"'
    ];
    for (let i = 0; i < lines.length; i++) {
      if (t > i * 18) txt(lines[i], W / 2, 86 + i * 16, i > 5 ? 10 : 9, i > 5 ? '#8ff0ff' : '#d8d8e4', 'center');
    }
    if (t > 170) {
      ART.drawDude(g, { x: W / 2 - 50, y: 240, u: 2.2, face: 1, pal: PAL.cody, state: 'idle', t: G.t, hairStyle: 'long' });
      ART.drawDude(g, { x: W / 2, y: 240, u: 2.2, face: 1, pal: PAL.guy, state: 'idle', t: G.t + 20, hairStyle: 'spiky' });
      ART.drawDude(g, { x: W / 2 + 50, y: 240, u: 2.2, face: 1, pal: PAL.haggar, state: 'idle', t: G.t + 40, hairStyle: 'flat' });
    }
    if (t > 240 && Math.floor(G.t / 26) % 2 === 0) {
      txt('FINAL SCORE ' + pad(G.score, 7) + ' · TAP / ENTER 回标题', W / 2, 258, 9, '#ffe58a', 'center');
    }
  }

  /* ---------------- update ---------------- */
  function update() {
    G.t++;

    if (Input.press('pause')) {
      if (G.state === 'play') { G.state = 'pause'; SND.stopMusic(); }
      else if (G.state === 'pause') { G.state = 'play'; SND.music(G.stage.music); }
    }

    switch (G.state) {
      case 'title':
        if (G.t % 6 === 0) SND.music('title');
        if (Input.press('a') || Input.press('start')) { SND.sfx('select'); G.state = 'select'; G.menuSel = 0; SND.music('select'); }
        break;

      case 'select': {
        let mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        if (Math.abs(Input.ax) > 0.55) mx = Input.ax > 0 ? 1 : -1;
        if (mx !== 0 && G.t % 12 === 0) { G.menuSel = (G.menuSel + mx + 3) % 3; SND.sfx('select'); }
        if (Input.press('b') || Input.press('c')) { G.menuSel = (G.menuSel + 1) % 3; SND.sfx('select'); }
        if (Input.press('a') || Input.press('start')) startGame(CHAR_KEYS[G.menuSel]);
        break;
      }

      case 'story':
        G.storyT++;
        if (Input.press('a') || Input.press('start')) {
          if (G.storyT > 60) { G.state = 'map'; G.introT = 0; }
          else G.storyT = 60;
        }
        if (G.storyT > 460) { G.state = 'map'; G.introT = 0; }
        break;

      case 'map':
        G.introT++;
        if (G.introT > 30 && (Input.press('a') || Input.press('start'))) beginRound();
        if (G.introT > 200) beginRound();
        break;

      case 'intro':
        G.introT++;
        if (G.introT > 100) { G.state = 'play'; G.introT = 0; }
        break;

      case 'play':
        updateWorld();
        break;

      case 'pause':
        if (Input.press('a') || Input.press('start')) { G.state = 'play'; SND.music(G.stage.music); }
        break;

      case 'clear':
        G.clearT++;
        if ((Input.press('a') || Input.press('start')) && G.clearT > 90) {
          if (G.stageIdx < STAGES.length - 1) {
            G.player.hp = Math.min(G.player.maxHp, G.player.hp + 25);
            loadStage(G.stageIdx + 1, false);
          } else {
            G.state = 'ending'; G.endT = 0; SND.music('clear');
          }
        }
        break;

      case 'gameover':
        G.goT++;
        if (Input.press('a') || Input.press('start')) {
          if (G.goT < 540) {
            G.continueCount++;
            G.lives = 3; G.score = 0;
            loadStage(G.stageIdx, false);
          } else toTitle();
        }
        if (G.goT > 720) toTitle();
        break;

      case 'ending':
        G.endT++;
        if (G.endT > 260 && (Input.press('a') || Input.press('start'))) toTitle();
        break;
    }
  }

  function render() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);

    if (G.state === 'title') { drawTitle(); return; }
    if (G.state === 'select') { drawSelect(); return; }
    if (G.state === 'story') { drawStory(); return; }
    if (G.state === 'map') { drawMap(); return; }

    if (!G.player || !G.stage) { drawTitle(); return; }

    g.save();
    if (G.shake > 0.5) {
      g.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake * 0.6);
    }
    drawWorld();
    g.restore();

    drawHUD();

    if (G.state === 'intro') drawIntro();
    else if (G.state === 'pause') drawPause();
    else if (G.state === 'clear') drawClear();
    else if (G.state === 'gameover') drawGameOver();
    else if (G.state === 'ending') drawEnding();
  }

  /* ---------------- loop ---------------- */
  let last = 0, acc = 0;
  function frame(ts) {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    let steps = 0;
    while (acc >= 1 / 60 && steps < 4) { update(); acc -= 1 / 60; steps++; }
    render();
    requestAnimationFrame(frame);
  }

  let pauseHits = 0, pauseTimer = null;
  pauseBtn.addEventListener('click', () => {
    pauseHits++;
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => { pauseHits = 0; }, 500);
    if (pauseHits >= 2) {
      pauseHits = 0;
      G.muted = SND.toggleMute();
    }
  });

  G.player = newPlayer('cody');
  G.stage = STAGES[0];
  SND.music('title');
  G.__stages = STAGES;
  G.loadStage = loadStage;
  window.__SB = G;
  requestAnimationFrame(frame);
})();
