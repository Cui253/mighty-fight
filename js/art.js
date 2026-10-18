/* ============================================================
   MIGHTY FINAL FIGHT — fan remake (private use)
   NES-style characters: sprite-matrix pixel art, chibi 2-head
   proportions matching the original NES release
   ============================================================ */
(function () {
  'use strict';

  const PAL = {
    cody:  { skin:'#f8d8b0', hair:'#f8f8f0', shirt:'#f8f8f0', shirtD:'#b8ccdc', pant:'#3850c8', pantD:'#283890', shoe:'#f8f8f0', belt:'#3850c8', hand:'#f8d8b0' },
    guy:   { skin:'#f8d8b0', hair:'#282830', shirt:'#3878e8', shirtD:'#2850a8', pant:'#f0f0f0', pantD:'#b0b8c8', shoe:'#f04030', belt:'#f04030', hand:'#f8d8b0' },
    haggar:{ skin:'#f0c090', hair:'#584028', shirt:'#584028', shirtD:'#383018', pant:'#48a048', pantD:'#2f7030', shoe:'#303018', belt:'#c8a030', hand:'#f0c090' },

    /* Mad Gear goons */
    jake:  { skin:'#f8d8b0', hair:'#c87828', shirt:'#e83828', shirtD:'#a82018', pant:'#282838', pantD:'#181828', shoe:'#e8e8e8', belt:'#f8f8f0', hand:'#f8d8b0' },
    axel:  { skin:'#e8b880', hair:'#282838', shirt:'#48a048', shirtD:'#2f7030', pant:'#a03020', pantD:'#701f14', shoe:'#282828', belt:'#e8e8e8', hand:'#e8b880' },
    fat:   { skin:'#e8b880', hair:'#181818', shirt:'#c87838', shirtD:'#904f20', pant:'#585848', pantD:'#3a3a2e', shoe:'#282828', belt:'#c8b870', hand:'#e8b880' },
    bill:  { skin:'#f8d8b0', hair:'#803818', shirt:'#f8f8f0', shirtD:'#c0c0cc', pant:'#8038a8', pantD:'#5a2478', shoe:'#282828', belt:'#f0d040', hand:'#f8d8b0' },

    /* bosses */
    damnd:  { skin:'#8a5a30', hair:'#181818', shirt:'#e838a8', shirtD:'#a02070', pant:'#3858c8', pantD:'#243888', shoe:'#f8f8f0', belt:'#f8f030', hand:'#8a5a30' },
    soma:   { skin:'#e8b880', hair:'#f8f0f0', shirt:'#e8e8f0', shirtD:'#b0b0c0', pant:'#d83868', pantD:'#982040', shoe:'#282828', belt:'#e8e8e8', hand:'#e8b880' },
    abigail:{ skin:'#e8a878', hair:'#d8d8e0', shirt:'#d84038', shirtD:'#982820', pant:'#383848', pantD:'#242430', shoe:'#181820', belt:'#f0d040', hand:'#e8a878' },
    belger: { skin:'#e8c090', hair:'#888890', shirt:'#783830', shirtD:'#502018', pant:'#282830', pantD:'#181820', shoe:'#282830', belt:'#c8a030', hand:'#e8c090' },

    flash: null
  };
  PAL.flash = (() => { const o = {}; for (const k in PAL.cody) o[k] = '#ffffff'; return o; })();

  /* ---------- which atlas sprite set each palette uses ---------- */
  PAL.cody.sprite = 'cody';   PAL.guy.sprite = 'guy';     PAL.haggar.sprite = 'haggar';
  PAL.jake.sprite = 'jake';   PAL.axel.sprite = 'axel';   PAL.fat.sprite = 'fat';
  PAL.bill.sprite = 'bill';   PAL.damnd.sprite = 'damnd'; PAL.soma.sprite = 'sodom';
  PAL.abigail.sprite = 'abigail'; PAL.belger.sprite = 'belger';

  /* ---------- original sprite atlas (ripped frames, see tools/extract_sprites.py) ---------- */
  const ATLAS = { img: null, ready: false };
  (function () {
    if (typeof Image === 'undefined' || !window.SPRITE_FRAMES) return;
    const im = new Image();
    im.onload = function () { ATLAS.img = im; ATLAS.ready = true; };
    im.onerror = function () { /* fallback to procedural art */ };
    im.src = 'js/sprites.png';
  })();

  /* state -> local frame indices (from grid previews of the original sheet) */
  const ANIM = {
    cody: { idle:[0], walk:[1,36,2,36], punch1:[10], punch2:[11], punch3:[13], jump:[26],
            jumpkick:[14], hurt:[24], down:[38], getup:[37], spin:[16,17], grab:[20],
            knee:[18], throw:[19], special:[22,23], crouch:[5], dead:[39] },
    haggar: { idle:[0], walk:[1,2,3,4], punch1:[8], punch2:[9], punch3:[10], jump:[12],
              jumpkick:[16], hurt:[26], down:[28], getup:[27], spin:[16,17], grab:[23],
              knee:[9], throw:[21], special:[25], crouch:[6], dead:[29] },
    guy: { idle:[0], walk:[1,2,3,2], punch1:[5], punch2:[10], punch3:[12], jump:[9],
           jumpkick:[25], hurt:[32], down:[43], getup:[44], spin:[40,41], grab:[13],
           knee:[21], throw:[19], special:[29,40,41], crouch:[8], dead:[45] }
  };
  /* walk cycle: real NES walk frames verified against the sheet
     (walk-check.png). Frame 4 of haggar is a punch pose and frame 36 of
     cody is a dash pose — mixing them in made walking look broken. */
  const WALK = {
    cody:   [1, 2, 3, 2],   // step / pass / step / pass
    haggar: [1, 2, 3, 2],
    guy:    [1, 2, 3, 2]
  };
  const ANIM_BASE = { cody:'cody', jake:'cody', axel:'cody',
                      haggar:'haggar', fat:'haggar', sodom:'haggar', abigail:'haggar', belger:'haggar',
                      guy:'guy', bill:'guy', damnd:'guy', retu:'guy' };

  /* per-frame pivot: horizontal anchor = foot contact point, vertical = ground line.
     Computed once from the atlas' opaque pixels, so a sprite never jitters sideways
     when the frame width changes (that was the "walk flicker"). */
  const PIVOT = {};   // key -> {ax:[...], ay:[...]}  fraction 0..1 of frame w/h
  function framePivot(base, idx, f) {
    const pf = window.SPRITE_FRAMES.frames[f];
    const img = ATLAS.img;
    if (!img || !img.getContext) return { ax: 0.5, ay: 1 };
    if (!PIVOT[base]) PIVOT[base] = {};
    if (PIVOT[base][idx]) return PIVOT[base][idx];
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    try {
      const cv = framePivot._cv || (framePivot._cv = document.createElement('canvas'));
      cv.width = pf.w; cv.height = pf.h;
      const c2 = cv.getContext('2d');
      c2.clearRect(0, 0, pf.w, pf.h);
      c2.drawImage(img, pf.x, pf.y, pf.w, pf.h, 0, 0, pf.w, pf.h);
      const d = c2.getImageData(0, 0, pf.w, pf.h).data;
      for (let y = 0; y < pf.h; y++) {
        for (let x = 0; x < pf.w; x++) {
          if (d[(y * pf.w + x) * 4 + 3] > 40) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
    } catch (e) { x0 = 0; x1 = pf.w - 1; y0 = 0; y1 = pf.h - 1; }
    if (x1 < x0) { x0 = 0; x1 = pf.w - 1; y0 = 0; y1 = pf.h - 1; }
    /* feet column: use the bottom 25% band, average of its opaque columns */
    let sx = 0, n = 0;
    if (img && img.getContext && framePivot._cv) {
      try {
        const c2 = framePivot._cv.getContext('2d');
        const d = c2.getImageData(0, 0, pf.w, pf.h).data;
        const band = Math.max(y0, y1 - Math.round((y1 - y0) * 0.22));
        for (let y = band; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            if (d[(y * pf.w + x) * 4 + 3] > 40) { sx += x; n++; }
          }
        }
      } catch (e) { n = 0; }
    }
    const res = {
      ax: n ? (sx / n + 0.5) / pf.w : 0.5,
      ay: (y1 + 1) / pf.h,
      h: (y1 - y0 + 1)
    };
    PIVOT[base][idx] = res;
    return res;
  }

  function blitDude(g, o, key) {
    const set = window.SPRITE_SETS[key];
    const base = ANIM_BASE[key] || 'cody';
    const S = o.state || 'idle';
    let anim = (ANIM[base] && ANIM[base][S]) || ANIM[base].idle;
    if (S === 'walk' && WALK[base]) anim = WALK[base];
    let li;
    if (anim.length > 1) {
      if (S === 'walk') {
        /* o.ph is a normalized 0..1 cycle advanced by travelled distance,
           so frame changes are evenly spaced and feet track the ground */
        const p = (((o.ph || 0) % 1) + 1) % 1;
        li = anim[Math.min(anim.length - 1, Math.floor(p * anim.length))];
      } else if (S === 'spin' || S === 'getup' || S === 'throw') {
        li = anim[((Math.floor((o.t || 0) / 4) % anim.length) + anim.length) % anim.length];
      } else {
        li = anim[((Math.floor((o.t || 0) / 5) % anim.length) + anim.length) % anim.length];
      }
    } else li = anim[0];
    const f = window.SPRITE_FRAMES.frames[set.start + li];
    if (!f) return procDude(g, o);
    const pv = framePivot(base, li, set.start + li);
    const u = o.u || 2, sc = u * 0.85;
    const fx = o.x, fy = o.y, face = o.face || 1;
    const dw = f.w * sc, dh = f.h * sc;
    /* anchor the frame on its foot contact column so frames of different
       widths never shift the character sideways */
    const ox = -pv.ax * dw;          // already in the (mirrored) local space
    const oy = -pv.ay * dh;
    /* no extra bob: the NES frames already contain the body's own rise & fall,
       adding one on top made walking look jittery */
    g.save();
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.translate(Math.round(fx), Math.round(fy));
    g.scale(face, 1);
    g.drawImage(ATLAS.img, f.x, f.y, f.w, f.h,
      Math.round(ox), Math.round(oy), Math.round(dw), Math.round(dh));
    g.restore();
  }

  /* big artwork frames for portraits (local index within each hero's set) */
  const PORTRAIT_FRAME = { cody: 31, guy: 37, haggar: 20, sodom: 20, damnd: 37 };

  function rnd(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function px(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0));
  }

  /* ---------- chibi dude, ~26 units tall, feet at (x,y), pixel unit u ---------- */
  function drawDude(g, o) {
    /* prefer the original ripped sprites; fall back to procedural if not loaded */
    const key = (o.pal && o.pal.sprite) || o.sprite;
    if (ATLAS.ready && key && window.SPRITE_SETS && window.SPRITE_SETS[key]) return blitDude(g, o, key);
    return procDude(g, o);
  }

  function procDude(g, o) {
    const p = o.pal, u = o.u || 2, face = o.face || 1;
    const S = o.state || 'idle', ph = o.ph || 0, t = o.t || 0;
    const fx = Math.round(o.x), fy = Math.round(o.y);
    const X = (lx) => fx + lx * u * face;
    const Y = (ly) => fy - ly * u;

    function P(lx, ly, w, h, c) { px(g, X(lx) - w * u / 2, Y(ly) - h * u, w * u, h * u, c); }
    function RA(lx, ly, w, h, c) { /* anchored right edge (for feet pointing forward) */
      const ax = face > 0 ? X(lx) : X(lx) - w * u;
      px(g, ax, Y(ly) - h * u, w * u, h * u, c);
    }
    function limb(x1, y1, x2, y2, w, c) {
      const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
      for (let pass = 0; pass < 2; pass++) {
        const col = pass ? c : '#000';
        const ww = pass ? w : w + 1;
        g.fillStyle = col;
        for (let i = 0; i <= steps; i++) {
          const k = i / steps;
          const lx = x1 + (x2 - x1) * k, ly = y1 + (y2 - y1) * k;
          g.fillRect((X(lx) - ww * u / 2) | 0, (Y(ly) - ww * u) | 0, Math.ceil(ww * u), Math.ceil(ww * u));
        }
      }
    }

    /* joints (native units) */
    let hipY = 11, topY = 18, headY = 22;
    let fArm = [5, 15], fElb = [3, 17], bArm = [-4, 15], bElb = [-3, 17];
    let fKnee = [2, 6], fFoot = [2, 0], bKnee = [-2, 6], bFoot = [-2, 0];
    let headX = 0, lean = 0;

    const cyc = ph % (Math.PI * 2);
    switch (S) {
      case 'idle': {
        const b = Math.sin(t * 0.07) * 0.4;
        headY += b; topY += b * 0.4;
        fArm = [4, 14 + b]; bArm = [-4, 14 + b];
        break;
      }
      case 'walk': {
        const s = Math.sin(cyc);
        fFoot = [2 + s * 3.4, Math.max(0, s) * 1.8]; fKnee = [2 + s * 1.6, 6];
        bFoot = [-2 - s * 3.4, Math.max(0, -s) * 1.8]; bKnee = [-2 - s * 1.6, 6];
        fArm = [4 - s * 2.4, 14]; bArm = [-4 + s * 2.4, 14];
        fElb = [3 - s, 16]; bElb = [-3 + s, 16];
        headY += Math.abs(Math.cos(cyc)) * 0.5;
        break;
      }
      case 'punch1': case 'epunch': {
        const e = ph < 0.3 ? ph / 0.3 : ph < 0.55 ? 1 : 1 - (ph - 0.55) / 0.45;
        fArm = [4 + 6.4 * e, 16 - e]; fElb = [3 + 3 * e, 17];
        bArm = [-4.6, 14]; bElb = [-3, 16];
        headX = 0.5 * e; lean = 0.5 * e;
        fFoot = [3, 0]; bFoot = [-3, 0]; bKnee = [-3, 6];
        break;
      }
      case 'punch2': {
        const e = ph < 0.3 ? ph / 0.3 : ph < 0.55 ? 1 : 1 - (ph - 0.55) / 0.45;
        bArm = [-4 + 10.4 * e, 16]; bElb = [-2 + 4 * e, 17];
        fArm = [4 - e, 14]; fElb = [3, 16];
        headX = 0.4 * e;
        break;
      }
      case 'punch3': {
        const e = ph < 0.34 ? ph / 0.34 : ph < 0.6 ? 1 : 1 - (ph - 0.6) / 0.4;
        fArm = [4 + 2 * e, 12 + 10 * e]; fElb = [3 + e, 14 + 4 * e];
        hipY += 1.2 * e; topY += 1.8 * e; headY += 1.8 * e;
        fFoot = [3, e]; bFoot = [-2.6, 0];
        break;
      }
      case 'jump': {
        fKnee = [3, 8]; fFoot = [4, 4]; bKnee = [-2, 8]; bFoot = [-3.4, 4.6];
        fArm = [4, 17]; bArm = [-4, 17]; fElb = [3, 18]; bElb = [-3, 18];
        break;
      }
      case 'jumpkick': {
        fKnee = [5, 9]; fFoot = [8, 8.4];
        bKnee = [-2, 7]; bFoot = [-3.4, 3];
        fArm = [3, 16]; bArm = [-4.4, 15];
        lean = 1;
        break;
      }
      case 'hurt': {
        lean = -1.6; headX = -1.2;
        fArm = [1, 19]; bArm = [-5, 18]; fElb = [1, 17]; bElb = [-4, 17];
        bFoot = [-3.6, 0]; bKnee = [-3, 6];
        break;
      }
      case 'down': drawLying(g, o); return;
      case 'getup': {
        hipY = 7; topY = 12; headY = 15;
        fKnee = [3.4, 4]; fFoot = [4, 0]; bKnee = [-1.6, 4]; bFoot = [-3.4, 0];
        fArm = [4, 9]; bArm = [-3, 9]; fElb = [3, 11]; bElb = [-3, 11];
        break;
      }
      case 'spin': drawSpin(g, o); return;
      case 'grab': {
        fArm = [7, 15]; fElb = [5, 16]; bArm = [6, 13]; bElb = [5, 15];
        lean = 0.6;
        break;
      }
      case 'knee': {
        fKnee = [5.4, 10]; fFoot = [4.4, 6];
        fArm = [6, 15]; bArm = [5, 13]; bElb = [4, 15];
        break;
      }
      case 'throw': {
        fArm = [6, 19]; fElb = [4, 18]; bArm = [-5, 18];
        lean = 1.4;
        break;
      }
      default: break;
    }

    /* shadow */
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath();
    g.ellipse(fx, fy + 1, 10 * u, 3 * u, 0, 0, 6.3);
    g.fill();

    const tx = headX + lean * 0.5;
    const top = p.shirt, topD = p.shirtD;

    /* back arm */
    limb(bArm[0] - 1, bArm[1], bElb[0] - 1, bElb[1], 2.6, topD);
    limb(bElb[0] - 1, bElb[1], bArm[0] - 1, bArm[1], 2.2, p.hand);
    P(bArm[0] - 1, bArm[1], 2.4, 2.4, p.hand);

    /* back leg */
    limb(-1, hipY, bKnee[0] - 1, bKnee[1], 3, p.pantD);
    limb(bKnee[0] - 1, bKnee[1], bFoot[0] - 1, bFoot[1], 2.6, p.pantD);
    RA(bFoot[0] - 2.6, bFoot[1], 4, 1.7, '#141414');

    /* torso */
    px(g, (X(tx) - 4.5 * u) | 0, (Y(topY) ) | 0, 9 * u, (topY - hipY + 2) * u, '#000');
    px(g, (X(tx) - 4 * u) | 0, (Y(topY) + 0.5 * u) | 0, 8 * u, (topY - hipY + 1) * u, top);
    px(g, (X(tx - 2.6) - 1 * u) | 0, (Y(topY) + 0.5 * u) | 0, 2 * u, (topY - hipY + 1) * u, topD);
    P(tx, hipY + 0.7, 8, 1.6, p.belt);

    /* head: big NES chibi head, 8x8 with hair */
    px(g, (X(headX) - 5 * u) | 0, (Y(headY) - 4.6 * u) | 0, 10 * u, 9 * u, '#000');
    px(g, (X(headX) - 4 * u) | 0, (Y(headY) - 3.8 * u) | 0, 8 * u, 7.6 * u, p.skin);
    /* hair by style */
    const hs = o.hairStyle || 'spiky';
    if (hs === 'long') { /* cody blond mop */
      px(g, (X(headX) - 4.6 * u) | 0, (Y(headY) - 4.2 * u) | 0, 9.2 * u, 3 * u, p.hair);
      px(g, (X(headX) - 4.6 * u) | 0, (Y(headY) - 2 * u) | 0, 2 * u, 2.4 * u, p.hair);
      px(g, (X(headX) + 2.6 * u) | 0, (Y(headY) - 2 * u) | 0, 2 * u, 2.4 * u, p.hair);
    } else if (hs === 'spiky') { /* guy */
      px(g, (X(headX) - 4.6 * u) | 0, (Y(headY) - 4.2 * u) | 0, 9.2 * u, 2.6 * u, p.hair);
      for (let i = 0; i < 3; i++) P(headX - 2.6 + i * 2.4, headY + 4.4, 1.6, 1.8, p.hair);
      px(g, (X(headX) - 5 * u) | 0, (Y(headY) - 2.6 * u) | 0, 1.6 * u, 3.4 * u, p.hair);
    } else if (hs === 'mohawk') {
      px(g, (X(headX) - 4 * u) | 0, (Y(headY) - 4.4 * u) | 0, 8 * u, 2.2 * u, p.skin);
      for (let i = 0; i < 3; i++) P(headX - 2 + i * 2, headY + 5, 1.4, 2.6, p.hair);
    } else if (hs === 'flat') { /* haggar */
      px(g, (X(headX) - 4.6 * u) | 0, (Y(headY) - 4.4 * u) | 0, 9.2 * u, 2.2 * u, p.hair);
      px(g, (X(headX) - 5 * u) | 0, (Y(headY) - 3.4 * u) | 0, 1.6 * u, 2.6 * u, p.hair);
    }
    /* eye */
    px(g, (X(headX + 1.6) - 0.7 * u) | 0, (Y(headY + 1.2) - 1.2 * u) | 0, Math.max(1, u), Math.max(1, 1.2 * u), '#000');
    /* mouth */
    px(g, (X(headX + 1.4) - 0.6 * u) | 0, (Y(headY - 1.2) - 0.7 * u) | 0, Math.max(1, 1.4 * u), Math.max(1, 0.7 * u), 'rgba(120,50,40,.8)');

    /* front leg */
    limb(1, hipY, fKnee[0], fKnee[1], 3, p.pant);
    limb(fKnee[0], fKnee[1], fFoot[0], fFoot[1], 2.6, p.pant);
    RA(fFoot[0] - 2.8, fFoot[1], 4.4, 1.8, p.shoe);

    /* front arm */
    limb(fArm[0], fArm[1], fElb[0], fElb[1], 2.8, top);
    limb(fElb[0], fElb[1], fArm[0], fArm[1], 2.4, p.hand);
    P(fArm[0], fArm[1], 2.6, 2.6, p.hand);

    /* weapon */
    if (o.weapon === 'pipe' && (S === 'punch1' || S === 'epunch')) {
      const e = Math.min(1, ph * 2.6);
      limb(fArm[0] + 1, fArm[1] + 0.5, fArm[0] + 11 * e, fArm[1] + 1.4, 1.8, '#c8c8d4');
    } else if (o.weapon === 'knife' && (S === 'punch1' || S === 'epunch')) {
      P(fArm[0] + 2.4, fArm[1], 3.4, 1, '#e8e8f4');
    } else if (o.weapon === 'stick' && (S === 'punch1' || S === 'epunch')) {
      const e = Math.min(1, ph * 2.6);
      limb(fArm[0] + 1, fArm[1] + 0.5, fArm[0] + 13 * e, fArm[1] + 2, 1.6, '#c8a058');
    }
  }

  function drawSpin(g, o) {
    const p = o.pal, u = o.u, t = o.t || 0;
    const fx = Math.round(o.x), fy = Math.round(o.y);
    const X = (lx) => fx + lx * u * (o.face || 1);
    const Y = (ly) => fy - ly * u;
    const a = t * 0.55;
    /* speed arc */
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(fx, fy - 15 * u, 16 * u, 5 * u, 0, 0, 6.3); g.stroke();
    function Q(lx, ly, w, h, c) { px(g, X(lx) - w * u / 2, Y(ly) - h * u, w * u, h * u, c); }
    /* legs */
    Q(1.4, 5.5, 3.4, 11, '#000'); Q(-1.4, 5.5, 3.4, 11, '#000');
    Q(1.4, 5.5, 2.4, 10, p.pant); Q(-1.4, 5.5, 2.4, 10, p.pantD);
    Q(2.4, 0.8, 3.6, 1.7, p.shoe); Q(-2.4, 0.8, 3.6, 1.7, '#141414');
    /* torso */
    Q(0, 14.5, 9.4, 9.4, '#000'); Q(0, 14.5, 8.4, 8.4, p.shirt);
    Q(0, 11.2, 8.4, 1.6, p.belt);
    /* spinning arms */
    for (let i = 0; i < 2; i++) {
      const aa = a + i * Math.PI;
      const hx = Math.cos(aa) * 8, hy = 16 + Math.sin(aa) * 2.4;
      const col = i ? '#000' : p.hand;
      g.fillStyle = col;
      for (let k = 0; k <= 8; k++) {
        const kk = k / 8;
        const lx = Math.cos(aa) * 2 + (hx - Math.cos(aa) * 2) * kk;
        const ly = 16 + (hy - 16) * kk;
        g.fillRect((X(lx) - 1.2 * u) | 0, (Y(ly) - 1.2 * u) | 0, Math.ceil(2.4 * u), Math.ceil(2.4 * u));
      }
      Q(hx, hy, 2.6, 2.6, p.hand);
    }
    /* head */
    Q(0, 22.5, 10, 9.4, '#000'); Q(0, 22.5, 9, 8.4, p.skin);
    Q(0, 25.4, 9.4, 2.6, p.hair);
    Q(1.8, 23.4, 1.4, 1.4, '#000');
  }

  function drawLying(g, o) {
    const p = o.pal, u = o.u, face = o.face || 1;
    const fx = Math.round(o.x), fy = Math.round(o.y);
    const LX = (lx) => fx + lx * u * face;
    const LY = (ly) => fy - ly * u;
    function Q(lx, ly, w, h, c) { px(g, LX(lx) - w * u / 2, LY(ly) - h * u, w * u, h * u, c); }
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath(); g.ellipse(fx, fy + 1, 14 * u, 3 * u, 0, 0, 6.3); g.fill();
    Q(8, 1.7, 7.4, 2.8, '#000'); Q(8, 1.7, 6.4, 1.9, p.pant);
    Q(12, 1.4, 3.2, 1.9, p.shoe);
    Q(-1, 2.8, 9, 4.4, '#000'); Q(-1, 2.8, 8, 3.4, p.shirt);
    Q(2.2, 2.8, 2, 3.4, p.shirtD);
    Q(-6.6, 3.4, 7.6, 7, '#000'); Q(-6.6, 3.4, 6.6, 6, p.skin);
    Q(-6.6, 5.6, 7, 2.6, p.hair);
    Q(-5, 4.4, 1, 1, '#000');
    Q(-2, 6, 4.4, 2, p.hand);
  }

  /* ---------- props ---------- */
  function drawObject(g, o, camX) {
    const x = Math.round(o.x - camX), y = Math.round(o.y);
    if (x < -40 || x > 520) return;
    g.fillStyle = 'rgba(0,0,0,.4)';
    g.beginPath(); g.ellipse(x, y + 1, 12, 3, 0, 0, 6.3); g.fill();
    if (o.type === 'barrel') {
      px(g, x - 10, y - 26, 20, 26, '#000');
      px(g, x - 9, y - 25, 18, 24, '#b8b8c0');
      px(g, x - 9, y - 25, 5, 24, '#e4e4ee');
      px(g, x - 9, y - 20, 18, 2, '#707084');
      px(g, x - 9, y - 8, 18, 2, '#707084');
      px(g, x - 10, y - 26, 20, 2, '#d8d8e4');
    } else {
      px(g, x - 11, y - 22, 22, 22, '#000');
      px(g, x - 10, y - 21, 20, 20, '#c89858');
      px(g, x - 10, y - 21, 20, 3, '#e0b878');
      g.strokeStyle = '#705028'; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x - 9, y - 20); g.lineTo(x + 9, y - 2);
      g.moveTo(x + 9, y - 20); g.lineTo(x - 9, y - 2);
      g.stroke();
    }
  }

  function drawFood(g, f, camX, t) {
    const x = Math.round(f.x - camX), y = Math.round(f.y);
    if (x < -30 || x > 510) return;
    const bob = Math.round(Math.sin(t * 0.1 + f.id));
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath(); g.ellipse(x, y + 1, 7, 2, 0, 0, 6.3); g.fill();
    g.save(); g.translate(x, y - 5 + bob);
    if (f.kind === 'chicken') {
      px(g, -6, -4, 12, 9, '#000');
      px(g, -5, -3, 10, 7, '#e8a048');
      px(g, -4, -2, 7, 4, '#f8d088');
      px(g, 5, 0, 4, 2, '#f8f0d8');
    } else if (f.kind === 'burger') {
      px(g, -6, -5, 12, 10, '#000');
      px(g, -5, -4, 10, 4, '#e8b048');
      px(g, -5, 0, 10, 2, '#58b038');
      px(g, -5, 2, 10, 1, '#a03828');
      px(g, -5, 3, 10, 2, '#e8b048');
    } else {
      px(g, -5, -6, 10, 11, '#000');
      px(g, -4, -5, 8, 5, '#f8d040');
      px(g, -3, -8, 1, 4, '#f8e880'); px(g, 0, -9, 1, 5, '#f8e880'); px(g, 3, -8, 1, 4, '#f8e880');
      px(g, -4, 0, 8, 5, '#d83828');
      px(g, -4, 2, 8, 1, '#f8f0d8');
    }
    g.restore();
  }

  /* NES-style plate portrait (head only) for HUD & select */
  function drawPortrait(g, key, x, y, u) {
    /* prefer original big artwork frame */
    if (ATLAS.ready && window.SPRITE_SETS && PORTRAIT_FRAME[key] != null) {
      const set = window.SPRITE_SETS[key];
      const f = window.SPRITE_FRAMES.frames[set.start + PORTRAIT_FRAME[key]];
      if (f) {
        const sc = (u * 16) / Math.max(f.w, f.h);
        g.drawImage(ATLAS.img, f.x, f.y, f.w, f.h,
          Math.round(x - f.w * sc / 2), Math.round(y - f.h * sc / 2),
          Math.round(f.w * sc), Math.round(f.h * sc));
        return;
      }
    }
    const c = PAL[key] || PAL[key === 'sodom' ? 'soma' : key] || PAL.cody;
    const hs = key === 'guy' || key === 'damnd' ? 'spiky' : key === 'cody' || key === 'sodom' ? 'long' : 'flat';
    px(g, x - 7 * u, y - 8 * u, 14 * u, 9 * u, '#000');
    px(g, x - 6 * u, y - 7 * u, 12 * u, 7.4 * u, c.skin);
    px(g, x - 6 * u, y - 7 * u, 12 * u, 2.6 * u, c.hair);
    if (hs === 'long') { px(g, x - 6 * u, y - 7 * u, 2.4 * u, 4 * u, c.hair); px(g, x + 3.6 * u, y - 7 * u, 2.4 * u, 4 * u, c.hair); }
    if (hs === 'flat') px(g, x - 6 * u, y - 5.4 * u, 12 * u, 1.2 * u, c.hair);
    px(g, x + 1.4 * u, y - 3.6 * u, 1.6 * u, 1.6 * u, '#000');
    px(g, x - 5.6 * u, y - 3.6 * u, 1.6 * u, 1.6 * u, '#000');
    px(g, x - 1.4 * u, y - 1.6 * u, 3 * u, 0.8 * u, 'rgba(120,50,40,.9)');
    /* collar */
    px(g, x - 6 * u, y - 1 * u, 12 * u, 1.6 * u, c.shirt);
  }

  window.ART = { PAL, drawDude, drawPortrait, drawObject, drawFood, rnd };
})();
