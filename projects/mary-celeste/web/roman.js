FACE.snore = { eye: ["dash", "dash"], brow: [0, -1], mouth: "o" };
FACE.stubborn = { eye: ["lid", "lid"], brow: [4, -3], mouth: "frown" };
FACE.squint = { eye: ["slit", "slit"], brow: [3, -2], mouth: "dash" };

// ---------------- Roman-era cast (our own designs), built on the Pen / blob / face helpers above ----------------
const STEEL = "#aeb6bf", BRASS = "#d9a845", LEATHER = "#7a4a2a";
export const OUTFITS = {
  legion: { tunic: "#b8322f", cape: "#8f2228", skin: SKIN, helmet: true, armor: true, spear: true, shield: true },
  old: { tunic: "#9c4a3c", cape: "#6e3330", skin: "#f3d6bb", helmet: "old", armor: true, spear: true, shield: false, beard: "#f4f1ea", brows: "#f4f1ea" },
  toga: { tunic: "#f1ead8", skin: "#f5c9a0", toga: "#6b3c8f", hair: "#3b2a20", stout: true },
  civA: { tunic: "#4f7fb8", skin: "#f5c9a0", hair: "#5a3b2a" },
  civB: { tunic: "#d9a441", skin: SKIN, hair: "#2b211c", dress: "#c25a7a" },
  civC: { tunic: "#5d8a3a", skin: "#c99067", hair: "#1e1714", stout: true },
  workA: { tunic: "#8a5d3b", skin: "#f5c9a0", cap: "#c2733a", apron: "#d8c9a6" },
  workB: { tunic: "#3f6a6f", skin: "#ecd0b6", cap: "#5b4a8a", moustache: "#4a3020" },
};

/** galea: iron bowl, brass brow band, cheek guards, transverse red crest */
const galea = (p, H, cx, hc, light, thick, ow, old, u) => {
  const crest = old ? "#8d4b3f" : "#d2372f", bowl = old ? "#8f8a7e" : STEEL;
  // crest (behind the bowl top)
  const cy0 = hc - H.b * 0.98;
  const cr = ellPts(cx, cy0, 0.66 * 2 * H.a, 0.42 * 2 * H.b, 180, 360, 0, 40);
  cr.push([cx + 0.66 * 2 * H.a * 0.98, cy0 + 4 * u], [cx - 0.66 * 2 * H.a * 0.98, cy0 + 4 * u]);
  const crP = [...ellPts(cx, cy0 + 2 * u, 0.62 * 2 * H.a, 0.36 * 2 * H.b, 180, 360, 0, 40)];
  p.shadedFill(crP, crest, mul(crest, [0.7, 0.62, 0.7]), light, 0.62 * 2 * H.a, 0.3);
  p.clip(crP, () => { for (let i = -9; i <= 9; i++) p.stroke([[cx + i * 7.4 * u, cy0], [cx + i * 9.4 * u, cy0 - 0.62 * H.b * Math.cos(i / 11)]], 1.4 * u, mul(crest, [0.62, 0.55, 0.62])); });
  if (old) p.clip(crP, () => { for (let i = 0; i < 6; i++) p.ell(cx + (i - 3) * 22 * u, cy0 - 18 * u - (i % 2) * 10 * u, 9 * u, 5 * u, "#6f6a5e", 0); });
  p.inkRing(crP, ow * 0.85, thick);
  p.poly(rrect(cx - 10 * u, cy0 - 6 * u, cx + 10 * u, cy0 + 6 * u, 3 * u), BRASS, 2 * u);
  // bowl: upper head cap
  const bandY = hc - H.b * 0.42;
  const bp = ellPts(cx, bandY, H.a * 1.05, H.b * 0.66, 180, 360, 0, 48);
  p.shadedFill(bp, bowl, mul(bowl, [0.62, 0.64, 0.72]), light, H.a, 0.4);
  p.clip(bp, () => {
    p.stroke(ellPts(cx - 20 * u, bandY - 0.3 * H.b, 0.25 * H.a, 0.18 * H.b, 200, 300, 0, 16), 4 * u, "#ffffff55");
    if (old) for (let i = 0; i < 9; i++) p.ell(cx + Math.sin(i * 2.3) * 0.8 * H.a, bandY - (0.08 + 0.5 * ((i * 0.37) % 1)) * H.b, (3 + (i % 3) * 2) * u, (2 + (i % 2)) * u, "#8a4b22", 0);
  });
  p.inkRing(bp, ow * 0.9, thick);
  p.band([[cx - H.a * 1.04, bandY], [cx + H.a * 1.04, bandY]], old ? "#a88a4a" : BRASS, 7 * u, 1.8 * u, "round");
  for (const s of [-1, 1]) p.dot(cx + s * 0.55 * H.a, bandY, 2.2 * u, "#fff3c4");
};
const cheeks = (p, H, cx, hc, light, ow, old, u) => {
  const bowl = old ? "#8f8a7e" : STEEL;
  for (const s of [-1, 1]) {
    const x0 = cx + s * 0.78 * H.a, x1 = cx + s * 1.07 * H.a, y0 = hc - H.b * 0.42, y1 = hc + H.b * 0.48;
    const pts = [[x0, y0], [x1, y0], [x1 - s * 0.04 * H.a, y1 - 0.1 * H.b], [x0 + s * 0.06 * H.a, y1], [x0 - s * 0.05 * H.a, (y0 + y1) / 2]];
    p.shadedFill(pts, bowl, mul(bowl, [0.62, 0.64, 0.72]), light, 0.2 * H.a, 0.3);
    p.poly(pts, null, ow * 0.8);
    p.dot((x0 + x1) / 2, (y0 + y1) / 2 - 0.05 * H.b, 2.2 * u, BRASS);
  }
};
const cobweb = (p, cx, cy, r, u) => {
  const g = p.g; g.save(); g.globalAlpha = 0.8;
  for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.05 + 0.9 * i / 6); p.stroke([[cx, cy], [cx + Math.cos(a) * r, cy + Math.sin(a) * r]], 1.1 * u, "#f2f2f2"); }
  for (let k = 1; k <= 4; k++) { const rr = r * k / 4.3, pts = []; for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.05 + 0.9 * i / 6); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } p.stroke(pts, 1 * u, "#f2f2f2"); }
  g.restore();
};

/** front-facing Roman-era character. opts: expr, blink, look, facing, seed, L/R arm poses, tilt, headTilt, bob, nohelmet, light */
export const romanFront = (p, key, opts = {}) => {
  const O = typeof key === "string" ? OUTFITS[key] : key;
  const { expr = "neutral", blink = 0, look = 0, facing = 0, seed = 3, L = "hang", R = O.spear ? "spear" : "hang", tilt = 0, headTilt = 0,
    bob = 0, nohelmet = false, light = rad(-120), web = false, step = 0 } = opts;
  const lid = lidOf(blink), skin = O.skin ?? SKIN;
  const H = headBlob(seed, 118, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const torsoL = O.stout ? 1.12 : 1.08, legsL = 1.38, sole = 975;
  const torsoBot = sole - legsL * HH - bob * HH, chin = torsoBot - torsoL * HH, hc = chin - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u, cx = 300;
  const legCol = mix(O.tunic, INK, 0.62), armCol = mix(O.tunic, INK, 0.5);
  const helmet = !!O.helmet && !nohelmet, old = O.helmet === "old";
  p.rot = null;
  // ---- cape behind everything ----
  if (O.cape) {
    const cp = [[cx - 0.48 * W, chin + 0.08 * HH], [cx + 0.48 * W, chin + 0.08 * HH], [cx + 0.62 * W, sole - 0.55 * HH], [cx + 0.2 * W, sole - 0.45 * HH], [cx - 0.2 * W, sole - 0.5 * HH], [cx - 0.62 * W, sole - 0.55 * HH]];
    p.gradFill(cp, O.cape, mul(O.cape, [0.6, 0.6, 0.7]), light); p.inkRing(cp, ow * 0.8, thick);
  }
  // ---- legs ----
  const dress = !!O.dress;
  for (const side of [-1, 1]) {
    const up = Math.max(0, Math.sin(Math.PI * 2 * (step + (side > 0 ? 0.5 : 0)))) * 30 * (step ? 1 : 0);
    const hx = cx + side * 16 * u, fx = cx + side * 22 * u, fy = sole - 4 * u - up;
    p.stroke(curve([hx, hipY], [(hx + fx) / 2 + side * 2 * u, (hipY + fy) / 2], [fx, fy]), 5.8 * u, legCol);
    const sandal = O.helmet ? LEATHER : "#5a3b2a";
    p.stroke([[fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u]], 7.5 * u + 3, INK);
    p.stroke([[fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u]], 7.5 * u, sandal);
    if (O.helmet) for (let k = 1; k <= 3; k++) p.stroke([[fx - 4 * u, fy - k * 0.07 * HH], [fx + 4 * u, fy - k * 0.07 * HH - 2 * u]], 2 * u, LEATHER);
  }
  // ---- upper body ----
  p.rot = tilt ? [rad(tilt), cx, hipY] : null;
  const T = { a: (0.4 * W) / 1.06 * (O.stout ? 1.12 : 1), b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: O.stout ? 0.17 : 0.12, asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = cx + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const S = (side) => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const arm = (side, pose) => {
    const s = S(side), X = (k) => tcx + side * (T.a * 1.1 + k * u);
    switch (pose) {
      case "spear": return { pts: [s, [X(6), s[1] + 0.42 * HH], [X(10), s[1] + 0.2 * HH]], front: false };
      case "point": return { pts: [s, [X(28), s[1] - 0.02 * HH], [X(62), s[1] - 0.1 * HH]], front: false, finger: true };
      case "up": return { pts: [s, [X(14), s[1] - 0.3 * HH], [X(22), s[1] - 0.75 * HH]], front: false };
      case "wave": return { pts: [s, [X(16), s[1] - 0.2 * HH], [X(30 + 10 * Math.sin(opts.wv || 0)), s[1] - 0.62 * HH]], front: false };
      case "hip": return { pts: [s, [X(22), s[1] + 0.3 * HH], [tcx + side * T.a * 0.95, torsoBot - 0.3 * HH]], front: false };
      case "belly": return { pts: [s, [X(8), s[1] + 0.45 * HH], [tcx + side * 0.25 * T.a, torsoBot - 0.35 * HH]], front: true };
      case "temple": return { pts: [s, [X(26), s[1] + 0.05 * HH], [cx + side * (H.a + 16 * u), hc - 0.1 * HH]], front: false, swirl: true };
      case "lift": return { pts: [s, [X(20), s[1] - 0.25 * HH], [X(4), s[1] - 0.82 * HH]], front: false };
      case "shield": return { pts: [s, [X(4), s[1] + 0.4 * HH], [tcx + side * 0.6 * T.a, torsoBot - 0.1 * HH]], front: true };
      case "cross": return { pts: [s, [X(2), s[1] + 0.38 * HH], [tcx - side * 0.45 * T.a, s[1] + 0.32 * HH]], front: true };
      case "reach": { const lf = (opts.lift || 0) * 0.62 * HH; return { pts: [s, [X(42), s[1] - 0.12 * HH - lf * 0.6], [X(82), s[1] - 0.5 * HH - lf]], front: false }; }
      case "cheek": return { pts: [s, [X(16), s[1] + 0.05 * HH], [cx + side * (H.a + 2 * u), hc + 0.25 * H.b]], front: false };
      case "thumb": return { pts: [s, [X(20), s[1] + 0.12 * HH], [X(44), s[1] - 0.12 * HH]], front: false, thumb: true };
      default: return { pts: [s, [X(4), s[1] + 0.48 * HH], [X(3), chin + 1.04 * HH]], front: false };
    }
  };
  const arms = [arm(-1, L), arm(1, R)];
  const drawArm = (a) => {
    p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol);
    const [hx, hy] = a.pts[2];
    p.dot(hx, hy, 5.5 * u);
    if (a.finger) { const dx = a.pts[2][0] - a.pts[1][0], dy = a.pts[2][1] - a.pts[1][1], l = Math.hypot(dx, dy); p.stroke([[hx, hy], [hx + dx / l * 14 * u, hy + dy / l * 14 * u]], 2.6 * u); }
    if (a.thumb) p.stroke([[hx, hy], [hx + Math.sign(hx - cx) * 6 * u, hy - 12 * u]], 2.6 * u);
  };
  // spear behind
  if (O.spear && R === "spear") {
    const [hx, hy] = arms[1].pts[2], s0 = [hx + 2 * u, sole - 2 * u], s1 = [hx - 3 * u, 70];
    p.band([s0, s1], old ? "#6d5236" : "#8a5a34", 4.2 * u, 1.4 * u, "round");
    const tip = [[s1[0] - 7 * u, s1[1] + 6 * u], [s1[0], s1[1] - 34 * u], [s1[0] + 7 * u, s1[1] + 6 * u], [s1[0], s1[1] + 14 * u]];
    p.poly(tip, old ? "#8b7c6a" : "#c9cfd6", 2 * u);
    if (web) cobweb(p, s1[0] - 2 * u, s1[1] + 60 * u, 70 * u, u);
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso
  if (dress) {
    const D = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(cx, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, O.dress, mul(O.dress, SH_CLOTH), light); p.inkRing(dp, ow, thick);
  }
  // skirt / pteruges below the torso
  if (!dress) {
    const sk = [[tcx - 0.92 * T.a, torsoBot - 0.2 * HH], [tcx + 0.92 * T.a, torsoBot - 0.2 * HH], [tcx + 1.0 * T.a, torsoBot + 0.3 * HH], [tcx - 1.0 * T.a, torsoBot + 0.3 * HH]];
    p.gradFill(sk, O.tunic, mul(O.tunic, SH_CLOTH), light); p.poly(sk, null, ow * 0.8);
    if (O.armor) for (let i = -3; i <= 3; i++) { const x = tcx + i * 0.27 * T.a, st = [[x - 9 * u, torsoBot - 0.05 * HH], [x + 9 * u, torsoBot - 0.05 * HH], [x + 9 * u, torsoBot + 0.22 * HH], [x - 9 * u, torsoBot + 0.22 * HH]]; p.poly(st, old ? "#5e4632" : LEATHER, 1.6 * u); }
  }
  p.gradFill(tp, O.tunic, mul(O.tunic, SH_CLOTH), light);
  p.clip(tp, () => {
    if (O.armor) {
      const top = chin - 0.1 * HH, bot = torsoBot - 0.25 * HH, n = 5;
      for (let i = 0; i < n; i++) {
        const y0 = top + (bot - top) * i / n, y1 = top + (bot - top) * (i + 1) / n;
        const c = old ? (i % 2 ? "#8d8679" : "#9a9384") : (i % 2 ? "#a7b0ba" : "#bcc4cc");
        p.poly([[tcx - 1.5 * T.a, y0], [tcx + 1.5 * T.a, y0 + 3 * u], [tcx + 1.5 * T.a, y1 + 3 * u], [tcx - 1.5 * T.a, y1]], c, 1.8 * u);
      }
      p.band([[tcx - 1.4 * T.a, torsoBot - 0.2 * HH], [tcx + 1.4 * T.a, torsoBot - 0.2 * HH]], LEATHER, 0.08 * HH, 1.5 * u);
      for (let i = -2; i <= 2; i++) p.dot(tcx + i * 0.3 * T.a, torsoBot - 0.2 * HH, 2.4 * u, BRASS);
      if (old) for (let i = 0; i < 5; i++) p.ell(tcx + Math.sin(i * 1.7) * 0.7 * T.a, top + (bot - top) * ((i * 0.31) % 1), 6 * u, 3 * u, "#8a4b22", 0);
    } else {
      p.band([[tcx - 1.4 * T.a, torsoBot - 0.24 * HH], [tcx + 1.4 * T.a, torsoBot - 0.24 * HH]], O.apron ? "#5a3b2a" : "#e2c27a", 0.05 * HH, 1.2 * u);
      if (O.toga) p.band([[tcx - 1.0 * T.a, chin - 0.1 * HH], [tcx + 1.1 * T.a, torsoBot - 0.1 * HH]], O.toga, 0.16 * HH, 1.6 * u);
      if (O.apron) p.poly([[tcx - 0.55 * T.a, torsoBot - 0.2 * HH], [tcx + 0.55 * T.a, torsoBot - 0.2 * HH], [tcx + 0.6 * T.a, torsoBot + 0.2 * HH], [tcx - 0.6 * T.a, torsoBot + 0.2 * HH]], O.apron, 1.6 * u);
      p.stroke([[tcx - 0.2 * T.a, chin + 0.02 * HH], [tcx, chin + 0.16 * HH], [tcx + 0.2 * T.a, chin + 0.02 * HH]], 2 * u);
    }
  });
  p.inkRing(tp, ow, thick);
  if (O.armor) for (const s of [-1, 1]) { // shoulder plates
    const sp = ellPts(tcx + s * 0.72 * T.a, chin + 0.1 * HH, 0.42 * T.a, 0.13 * HH, 180, 360, s * 8, 20);
    p.poly(sp, old ? "#9a9384" : "#c5ccd3", 1.8 * u);
  }
  if (O.moss) {/* reserved */}
  for (const a of arms) if (a.front) drawArm(a);
  // shield in front, held by the left hand
  if (O.shield && L === "shield") {
    const sx = tcx - 0.55 * T.a, sy = torsoBot + 0.05 * HH, sw = 0.36 * W, sh = 0.78 * HH;
    const sp = rrect(sx - sw, sy - sh, sx + sw, sy + sh, 8 * u);
    p.gradFill(sp, "#c0302c", "#7d1d22", light);
    p.clip(sp, () => {
      p.band([[sx - sw, sy], [sx + sw, sy]], BRASS, 6 * u, 1.2 * u);
      p.band([[sx, sy - sh], [sx, sy + sh]], BRASS, 6 * u, 1.2 * u);
      for (const s of [-1, 1]) { p.stroke([[sx + s * 12 * u, sy - 14 * u], [sx + s * 34 * u, sy - 46 * u], [sx + s * 22 * u, sy - 44 * u], [sx + s * 46 * u, sy - 74 * u]], 3.5 * u, BRASS); p.stroke([[sx + s * 12 * u, sy + 14 * u], [sx + s * 34 * u, sy + 46 * u], [sx + s * 22 * u, sy + 44 * u], [sx + s * 46 * u, sy + 74 * u]], 3.5 * u, BRASS); }
      p.stroke(ellPts(sx - sw * 0.5, sy - sh * 0.7, sw * 0.3, sh * 0.1, 200, 320, 0, 10), 3 * u, "#ffffff44");
    });
    p.ell(sx, sy, 13 * u, 13 * u, "#e6c068", 2.2 * u);
    p.inkRing(sp, ow, thick);
  }
  // ---- head ----
  const [cpx, cpy] = rotAbout([cx, chin], rad(tilt), [cx, hipY]);
  const Ah = tilt + headTilt;
  p.rot = Ah ? [rad(Ah), cx, chin, cpx - cx, cpy - chin] : null;
  if (helmet) galea(p, H, cx, hc, light, thick, ow, old, u);
  const hp = blobPts(cx, hc, H);
  if (O.hair && !helmet) { const hb = blobPts(cx, hc - 0.03 * HH, { ...H, a: H.a * 1.04, b: H.b * 1.05 }); p.poly(hb, O.hair, 0); }
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  if (helmet) {
    const bandY = hc - H.b * 0.42, bp = ellPts(cx, bandY, H.a * 1.05, H.b * 0.66, 180, 360, 0, 48);
    p.shadedFill(bp, old ? "#8f8a7e" : STEEL, mul(old ? "#8f8a7e" : STEEL, [0.62, 0.64, 0.72]), light, H.a, 0.4);
    p.clip(bp, () => { p.stroke(ellPts(cx - 20 * u, bandY - 0.3 * H.b, 0.25 * H.a, 0.18 * H.b, 200, 300, 0, 16), 5 * u, "#ffffff66");
      if (old) for (let i = 0; i < 9; i++) p.ell(cx + Math.sin(i * 2.3) * 0.8 * H.a, bandY - (0.08 + 0.5 * ((i * 0.37) % 1)) * H.b, (4 + (i % 3) * 2) * u, (2.5 + (i % 2)) * u, "#8a4b22", 0); });
    p.poly(bp, null, ow * 0.9);
    p.band([[cx - H.a * 1.05, bandY], [cx + H.a * 1.05, bandY]], old ? "#a88a4a" : BRASS, 7 * u, 1.8 * u, "round");
    p.poly(rrect(cx - 4 * u, bandY - 0.55 * H.b, cx + 4 * u, bandY - 3 * u, 2 * u), old ? "#a88a4a" : BRASS, 1.5 * u);
    cheeks(p, H, cx, hc, light, ow, old, u);
  } else if (O.cap) hatOn(p, { hat: "cap", cap: O.cap, jacket: O.tunic }, hp, H, cx, hc, light, seed, facing, false);
  else if (O.hair) hatOn(p, { hat: "hair", hair: O.hair, jacket: O.tunic }, hp, H, cx, hc, light, seed, facing, false);
  else if (O.helmet && nohelmet) { // bald old head with white side tufts
    for (const s of [-1, 1]) p.ell(cx + s * 0.9 * H.a, hc - 0.1 * H.b, 0.22 * H.a, 0.3 * H.b, "#f4f1ea", 3 * u);
  }
  if (O.beard) {
    const bd = blobPts(cx + 6 * u * facing, hc + 0.85 * H.b, { a: 0.62 * H.a, b: 0.75 * H.b, nTop: 2.4, nBot: 1.6, egg: -0.35, asym: 0, rot: 0, noise: 0.02, seed: seed + 4 });
    p.shadedFill(bd, O.beard, mul(O.beard, [0.86, 0.86, 0.92]), light, 0.6 * H.a, 0.3);
    p.clip(bd, () => { for (let i = -3; i <= 3; i++) p.stroke([[cx + i * 9 * u, hc + 0.45 * H.b], [cx + i * 7 * u, hc + 1.35 * H.b]], 1.2 * u, "#c9c4bb"); });
    p.inkRing(bd, ow * 0.8, thick);
  }
  faceFront(p, cx, hc, W, expr, facing, look, lid, helmet, skin, O.beard ? O.beard : O.moustache, !!O.stout);
  if (O.brows) for (const s of [-1, 1]) p.ell(cx + 7 * u * facing + s * 14 * u, hc - 20 * u, 11 * u, 5 * u, O.brows, 2 * u);
  if (O.beard) { // re-draw the mouth over the beard for open mouths
    if (expr === "shock" || expr === "snore") p.ell(cx + 8 * u * facing, hc + 22 * u, 6 * u, 7 * u, "#5a1e28", 2 * u);
  }
  p.rot = null;
  if (arms.some((a) => a.swirl)) { // cuckoo swirl next to the temple
    const a = arms.find((x) => x.swirl), [hx, hy] = a.pts[2], ph = opts.swirl || 0, pts = [];
    for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 4 + ph, r = (4 + i * 0.7) * u; pts.push([hx + Math.cos(t) * r, hy - 40 * u + Math.sin(t) * r]); }
    p.stroke(pts, 3 * u, "#ffffff"); p.stroke(pts, 1.4 * u, INK);
  }
};

/** loose helmet prop card (lifted off the old soldier) */
export const helmetCard = (p) => {
  const H = headBlob(3, 118, 0), u = 2 * H.a / 100, hc = 560, light = rad(-120), thick = thickAngle(light), ow = 5 * u;
  galea(p, H, 300, hc, light, thick, ow, true, u);
  const bandY = hc - H.b * 0.42, bp = ellPts(300, bandY, H.a * 1.05, H.b * 0.66, 180, 360, 0, 48);
  // dark inside visible from below
  p.ell(300, bandY, H.a * 1.05, 0.12 * H.b, "#2a221e", 0);
  p.shadedFill(bp, "#8f8a7e", mul("#8f8a7e", [0.62, 0.64, 0.72]), light, H.a, 0.4);
  p.clip(bp, () => { for (let i = 0; i < 9; i++) p.ell(300 + Math.sin(i * 2.3) * 0.8 * H.a, bandY - (0.08 + 0.5 * ((i * 0.37) % 1)) * H.b, (4 + (i % 3) * 2) * u, (2.5 + (i % 2)) * u, "#8a4b22", 0); });
  p.poly(bp, null, ow * 0.9);
  p.band([[300 - H.a * 1.05, bandY], [300 + H.a * 1.05, bandY]], "#a88a4a", 7 * u, 1.8 * u, "round");
  cheeks(p, H, 300, hc, light, ow, true, u);
};

/** ZZZ for the sleeping guard */
export const fxZ = (p, t) => {
  const g = p.g; g.save(); g.font = "900 120px Arial Black, Arial"; g.lineJoin = "round";
  for (let i = 0; i < 3; i++) {
    const k = (t + i / 3) % 1, x = 220 + i * 70 + Math.sin(k * 6) * 20, y = 700 - k * 500, s = 0.5 + k * 0.7;
    g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = Math.min(1, (1 - k) * 2.5);
    g.lineWidth = 16; g.strokeStyle = INK; g.strokeText("Z", 0, 0); g.fillStyle = "#ffffff"; g.fillText("Z", 0, 0); g.restore();
  }
  g.restore();
};
/** falling leaf */
export const fxLeaf = (p, col) => { p.poly([[300, 380], [420, 470], [300, 620], [180, 470]], col, 14); p.stroke([[300, 400], [300, 600]], 8); };
/** dust cloud puff (k 0..1 growth) */
export const fxDust = (p, k, col = "#e8dcc4") => {
  const g = p.g; g.save(); g.globalAlpha = Math.max(0, 1 - k * k);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = 90 + 150 * k; p.ell(300 + Math.cos(a) * r, 520 + Math.sin(a) * r * 0.6, 120 + 60 * k, 100 + 50 * k, col, 12); }
  p.ell(300, 520, 170 + 110 * k, 140 + 80 * k, col, 0);
  g.restore();
};
export const fxDrip = (p) => p.ell(300, 500, 40, 64, "#9fd4ff", 10);
export const fxWood = (p, seed) => { p.poly([[200, 420], [400, 400], [420, 560], [230, 600]], "#5b3d22", 14); p.stroke([[240, 450], [380, 440]], 6, "#3a2614"); p.ell(330, 520, 26, 18, "#4d7a32", 0); };

export const headCenter = (seed = 3) => { const H = headBlob(seed, 118, 0), HH = 2 * H.b; return 975 - 1.38 * HH - 1.08 * HH - H.b; };

// ================= Mary Celeste cast (1872) =================
// Built on the engine's own Pen / blobPts / headBlob / faceFront helpers (same module scope).
const WOOL = ['#2f3d52', '#4a3b32', '#3c4a3a', '#5a4a3c', '#2d3b3b', '#4d4152', '#6b5a44'];
const wool = (i) => WOOL[i % WOOL.length];
const sailorO = (i, extra = {}) => { const j = wool(i); return { jacket: j, pants: mix(j, INK, 0.45), boots: '#2b2119', skin: SKINS[i % 4], neck: j, ...extra }; };

export const CAST = {
  captain: { jacket: '#243247', pants: '#1c2534', boots: '#20180f', skin: '#f0c8a0', hat: 'captain', beard: '#e9e6df', beardMouth: true, neck: '#b23a34' },
  first: { jacket: '#2f3d52', pants: '#22303f', boots: '#2b2119', skin: '#f2c9a0', hat: 'mate', beard: '#6b5a44', neck: '#3c5a4a' },
  sarah: { jacket: '#5b6472', dress: '#47545f', boots: '#2b2119', skin: '#f7d3b0', hair: '#6b4a2e', bonnet: '#cdbd93' },
  girl: { jacket: '#8a5a6b', dress: '#a4667a', boots: '#2b2119', skin: '#fbdcbe', hair: '#7a5535', build: 'kid', hairRibbon: '#d8b45a' },
  sailor: sailorO(1),
  sailorB: sailorO(2, { moustache: '#4a3020' }),
  sailorC: sailorO(3, { hat: 'tar', beard: '#3a2c22' }),
  sailorD: sailorO(4),
  sailorE: sailorO(5, { moustache: '#2a201a', glasses: true }),
  consular: { jacket: '#2b2f3a', pants: '#22252e', boots: '#15181e', skin: '#f0c8a0', hat: 'bowler', moustache: '#3a2c22', glasses: true },
};

/** headgear for this story, drawn in the engine's flat-with-dark-seams style */
const hatSea = (p, o, H, cx, hc, light, u) => {
  const crown = hc - H.b, HH = 2 * H.b;
  const band = (y, w, col, k = 1) => p.band([[cx - w, y], [cx + w, y]], col, 7 * u, 1.6 * u);
  if (o.hat === 'captain') {
    const yb = crown + 0.16 * HH, ht = 0.6 * HH, wb = 34 * u, wt = 30 * u;
    const body = [[cx - wb, yb], [cx - wt, yb - ht * .55], [cx - wt * .9, yb - ht], [cx + wt * .9, yb - ht], [cx + wt, yb - ht * .55], [cx + wb, yb]];
    p.poly([[cx - 56 * u, yb + 1 * u], [cx + 56 * u, yb + 1 * u], [cx + 46 * u, yb + 10 * u], [cx - 46 * u, yb + 10 * u]], '#12141a', 2.4 * u);
    p.shadedFill(body, '#1d2129', '#0d0f13', light, wt, 0.45); p.poly(body, null, 4 * u);
    band(yb - ht * .34, wt * .95, '#c9a44a');
    p.dot(cx + 3 * u, yb - ht * .34, 3 * u, '#f0d488');
  } else if (o.hat === 'mate') {
    const yb = crown + 0.2 * HH, ht = 0.3 * HH, wb = 40 * u, wt = 34 * u;
    p.poly([[cx - 46 * u, yb + 2 * u], [cx + 46 * u, yb + 2 * u], [cx + 38 * u, yb + 10 * u], [cx - 38 * u, yb + 10 * u]], '#101318', 2.4 * u);
    const body = [[cx - wb, yb], [cx - wt, yb - ht], [cx + wt, yb - ht], [cx + wb, yb]];
    p.shadedFill(body, '#28313d', '#131a22', light, wt, 0.4); p.poly(body, null, 3.6 * u);
    band(yb, wb, '#181d24');
  } else if (o.hat === 'tar') {
    const yb = crown + 0.24 * HH, ht = 0.32 * HH, wb = 44 * u;
    const body = [[cx - wb, yb + 5 * u], [cx - wb * .82, yb - ht], [cx + wb * .82, yb - ht], [cx + wb, yb + 5 * u], [cx + wb * 1.12, yb + 10 * u], [cx - wb * 1.12, yb + 10 * u]];
    p.shadedFill(body, '#242a24', '#10140f', light, wb, 0.4); p.poly(body, null, 3.6 * u);
    p.clip(body, () => p.stroke([[cx - wb * .9, yb - ht * .4], [cx + wb * .9, yb - ht * .4]], 2.4 * u, 'rgba(255,255,255,.16)'));
  } else if (o.hat === 'bowler') {
    const yb = crown + 0.14 * HH, ht = 0.44 * HH, wt = 30 * u;
    p.shadedFill([[cx - 54 * u, yb + 3 * u], [cx + 54 * u, yb + 3 * u], [cx + 40 * u, yb - 4 * u], [cx - 40 * u, yb - 4 * u]], '#26282c', '#141517', light, 54 * u, 0.4);
    const body = [[cx - wt, yb - 2 * u], [cx - wt, yb - ht * .7], [cx - wt * .5, yb - ht], [cx + wt * .5, yb - ht], [cx + wt, yb - ht * .7], [cx + wt, yb - 2 * u]];
    p.shadedFill(body, '#2b2d31', '#15171a', light, wt, 0.4); p.poly(body, null, 3.4 * u);
    band(yb - ht * .28, wt * .98, '#171a1d');
  } else if (o.bonnet) {
    // hood only: it sits behind the head; the brim is drawn over the face after the skull (bonnetBrim)
    const yb = crown + 0.34 * HH, rw = 0.6 * 2 * H.a;
    const hood = [];
    for (let i = 0; i <= 22; i++) { const a = Math.PI * (1 - i / 22); hood.push([cx + Math.cos(a) * rw, yb + Math.sin(a) * 0.8 * HH - 0.1 * HH]); }
    hood.push([cx + rw * 0.99, yb + 0.14 * HH], [cx - rw * 0.99, yb + 0.14 * HH]);
    p.shadedFill(hood, o.bonnet, mul(o.bonnet, SH_FELT), light, rw, 0.42); p.poly(hood, null, 3.4 * u);
    p.clip(hood, () => { for (let i = -3; i <= 3; i++) p.stroke([[cx + i * 0.16 * rw, yb - 0.62 * HH], [cx + i * 0.2 * rw, yb + 0.1 * HH]], 1.2 * u, mul(o.bonnet, [0.8, 0.76, 0.66])); });
  }
};

/** front-facing card for this story's cast: same design space as romanFront (600x1000, soles at y=975) */
export const seaFront = (p, key, opts = {}) => {
  const O = typeof key === 'string' ? { ...CAST[key], ...(opts.outfit || {}) } : key;
  const { expr = 'neutral', blink = 0, look = 0, facing = 0, seed = 5, L = 'hang', R = 'hang', tilt = 0, headTilt = 0,
    bob = 0, light = rad(-120), step = 0 } = opts;
  const lid = lidOf(blink), skin = O.skin ?? SKIN, kid = O.build === 'kid';
  const H = headBlob(seed, kid ? 112 : 118, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const torsoL = kid ? 0.87 : 1.1, legsL = kid ? 1.02 : 1.36, sole = 975;
  const torsoBot = sole - legsL * HH - bob * HH, chin = torsoBot - torsoL * HH, hc = chin - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u, cx = 300;
  const LGW = 7.2 * u, BTW = 8.8 * u;
  const legCol = mix(O.pants || O.dress, INK, 0.5), armCol = mix(O.jacket, INK, 0.5);
  p.rot = null;
  // ---- legs (hidden by the skirt when dressed) ----
  if (!O.dress) for (const side of [-1, 1]) {
    const up = Math.max(0, Math.sin(Math.PI * 2 * (step + (side > 0 ? 0.5 : 0)))) * 26 * (step ? 1 : 0);
    const hx = cx + side * 17 * u, fx = cx + side * 22 * u, fy = sole - 4 * u - up;
    p.stroke(curve([hx, hipY], [(hx + fx) / 2 + side * 2 * u, (hipY + fy) / 2], [fx, fy]), LGW, legCol);
    p.stroke([[fx - side * 2 * u, fy], [fx + side * 15 * u, fy + 0.5 * u]], BTW + 3, INK);
    p.stroke([[fx - side * 2 * u, fy], [fx + side * 15 * u, fy + 0.5 * u]], BTW, O.boots || '#2b2119');
  }
  // ---- arms ----
  p.rot = tilt ? [rad(tilt), cx, hipY] : null;
  const T = { a: (0.44 * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: 0.1, asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = cx + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const S = (side) => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const arm = (side, pose) => {
    const s = S(side), X = (k) => tcx + side * (T.a * 1.1 + k * u);
    switch (pose) {
      case 'rod': return { pts: [s, [X(6), s[1] + 0.42 * HH], [X(10), s[1] + 0.2 * HH]], front: false };
      case 'hip': return { pts: [s, [X(22), s[1] + 0.3 * HH], [tcx + side * T.a * 0.95, torsoBot - 0.3 * HH]], front: false };
      case 'point': return { pts: [s, [X(28), s[1] - 0.02 * HH], [X(62), s[1] - 0.1 * HH]], front: false, finger: true };
      case 'reach': return { pts: [s, [X(42), s[1] - 0.12 * HH], [X(82), s[1] - 0.5 * HH]], front: false };
      case 'cheek': return { pts: [s, [X(16), s[1] + 0.05 * HH], [cx + side * (H.a + 2 * u), hc + 0.25 * H.b]], front: false };
      case 'lift': return { pts: [s, [X(20), s[1] - 0.25 * HH], [X(4), s[1] - 0.82 * HH]], front: false };
      case 'up': return { pts: [s, [X(14), s[1] - 0.3 * HH], [X(22), s[1] - 0.75 * HH]], front: false };
      case 'hold': return { pts: [s, [X(12), s[1] + 0.34 * HH], [tcx + side * 0.5 * T.a, torsoBot - 0.12 * HH]], front: true };
      case 'cross': return { pts: [s, [X(2), s[1] + 0.38 * HH], [tcx - side * 0.45 * T.a, s[1] + 0.32 * HH]], front: true };
      case 'shrug': return { pts: [s, [X(22), s[1] + 0.26 * HH], [X(36), s[1] + 0.12 * HH]], front: false };
      case 'wave': return { pts: [s, [X(16), s[1] - 0.2 * HH], [X(30 + 10 * Math.sin((opts.wv || 0))), s[1] - 0.62 * HH]], front: false };
      default: return { pts: [s, [X(4), s[1] + 0.48 * HH], [X(3), chin + 1.04 * HH]], front: false };
    }
  };
  const arms = [arm(-1, L), arm(1, R)];
  const drawArm = (a) => {
    p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.4 * u, armCol);
    const [hx, hy] = a.pts[2];
    p.dot(hx, hy, 5.6 * u, skin);
    if (a.finger) { const dx = a.pts[2][0] - a.pts[1][0], dy = a.pts[2][1] - a.pts[1][1], l = Math.hypot(dx, dy); p.stroke([[hx, hy], [hx + dx / l * 15 * u, hy + dy / l * 15 * u]], 2.8 * u, skin); }
  };
  for (const a of arms) if (!a.front) drawArm(a);
  // ---- skirt ----
  if (O.dress) {
    const D = { a: 0.5 * W, b: 0.5 * ((sole - 0.28 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.34, asym: 0, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(cx, sole - 0.28 * HH - D.b, D);
    p.gradFill(dp, O.dress, mul(O.dress, SH_CLOTH), light); p.inkRing(dp, ow, thick);
    p.clip(dp, () => { for (let i = -2; i <= 2; i++) p.stroke([[cx + i * 0.15 * W, chin + 0.25 * HH], [cx + i * 0.19 * W, sole - 0.32 * HH]], 1.4 * u, mul(O.dress, [0.7, 0.7, 0.76])); });
    for (const side of [-1, 1]) { const fx = cx + side * 13 * u; p.stroke([[fx - side * 2 * u, sole - 4 * u], [fx + side * 14 * u, sole - 3.5 * u]], BTW, O.boots || '#2b2119'); }
  }
  // ---- torso ----
  p.gradFill(tp, O.jacket, mul(O.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (O.dress) {
      p.band([[tcx - 0.92 * T.a, chin + 0.18 * HH], [tcx, chin + 0.02 * HH], [tcx + 0.92 * T.a, chin + 0.18 * HH]], mul(O.dress, [1.14, 1.12, 1.06]), 0.09 * HH, 1.5 * u);
      p.band([[tcx - 1.3 * T.a, torsoBot - 0.26 * HH], [tcx + 1.3 * T.a, torsoBot - 0.26 * HH]], mul(O.jacket, [0.68, 0.68, 0.7]), 0.06 * HH, 1.3 * u);
      for (let i = 0; i < 3; i++) p.dot(tcx + 3 * u * facing, chin + 0.34 * HH + i * 0.17 * HH, 2.2 * u, '#e3d6b0');
    } else {
      p.band([[tcx - 1.3 * T.a, torsoBot - 0.24 * HH], [tcx + 1.3 * T.a, torsoBot - 0.24 * HH]], '#cdb489', 0.055 * HH, 1.3 * u);
      if (O.neck) {
        p.band([[tcx - 0.55 * T.a, chin + 0.22 * HH], [tcx + 0.55 * T.a, chin + 0.12 * HH]], O.neck, 0.07 * HH, 1.6 * u);
        p.poly([[tcx - 13 * u, chin + 0.2 * HH], [tcx + 13 * u, chin + 0.18 * HH], [tcx + 5 * u, chin + 0.46 * HH], [tcx - 5 * u, chin + 0.46 * HH]], shade(O.neck, 0.82), 1.8 * u);
      }
      if (O.hat === 'captain' || O.hat === 'mate') for (let i = 0; i < 3; i++) for (const s of [-1, 1]) p.dot(tcx + s * 0.36 * T.a, chin + 0.36 * HH + i * 0.18 * HH, 3 * u, '#d8b25a');
      else for (let i = 0; i < 3; i++) p.dot(tcx + 2 * u * facing, chin + 0.32 * HH + i * 0.16 * HH, 2.2 * u, shade(O.jacket, 0.6));
    }
  });
  p.inkRing(tp, ow, thick);
  for (const a of arms) if (a.front) drawArm(a);
  // ---- head ----
  const [cpx, cpy] = rotAbout([cx, chin], rad(tilt), [cx, hipY]);
  const Ah = tilt + headTilt;
  p.rot = Ah ? [rad(Ah), cx, chin, cpx - cx, cpy - chin] : null;
  if (O.hair && !O.hat && !O.bonnet) { const hb = blobPts(cx, hc - 0.02 * HH, { ...H, a: H.a * 1.05, b: H.b * 1.06 }); p.poly(hb, O.hair, 0); }
  hatSea(p, O, H, cx, hc, light, u);
  const hp = blobPts(cx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  if (O.hair) p.clip(hp, () => {
    if (O.hairRibbon) p.poly([[cx - 0.62 * H.a, hc - 0.7 * H.b], [cx - 0.24 * H.a, hc - 1.02 * H.b], [cx - 0.18 * H.a, hc - 0.6 * H.b]], O.hairRibbon, 2 * u);
    p.poly([[cx - H.a, hc - H.b * 0.1], [cx - H.a * 0.62, hc - H.b * 1.18], [cx + H.a * 0.1, hc - H.b * 1.24], [cx - H.a * 0.02, hc - H.b * 0.42]], O.hair, 0);
  });
  if (O.beard) {
    const bd = blobPts(cx + 6 * u * facing, hc + 0.86 * H.b, { a: 0.6 * H.a, b: 0.7 * H.b, nTop: 2.4, nBot: 1.6, egg: -0.35, asym: 0, rot: 0, noise: 0.02, seed: seed + 4 });
    p.shadedFill(bd, O.beard, mul(O.beard, [0.86, 0.86, 0.92]), light, 0.6 * H.a, 0.3);
    p.clip(bd, () => { for (let i = -2; i <= 2; i++) p.stroke([[cx + i * 12 * u, hc + 0.5 * H.b], [cx + i * 9 * u, hc + 1.3 * H.b]], 1.2 * u, mul(O.beard, [0.82, 0.82, 0.88])); });
    p.inkRing(bd, ow * 0.8, thick);
  }
  faceFront(p, cx, hc, W, expr, facing, look, lid, false, skin, O.moustache, kid);
  if (O.bonnet) {   // brim: a filled crescent across the front of the hood
    const yb = hc - H.b + 0.3 * HH, rw = 0.62 * 2 * H.a, ry = 0.52 * HH;
    const outer = [], inner = [];
    for (let i = 0; i <= 18; i++) { const a = Math.PI + Math.PI * i / 18; outer.push([cx + Math.cos(a) * rw, yb + Math.sin(a) * ry]); }
    for (let i = 18; i >= 0; i--) { const a = Math.PI + Math.PI * i / 18; inner.push([cx + Math.cos(a) * rw * 0.99, yb + Math.sin(a) * ry * 0.34]); }
    const brimPts = [...outer, ...inner];
    p.shadedFill(brimPts, mul(O.bonnet, [1.05, 1.03, 0.97]), mul(O.bonnet, [0.74, 0.7, 0.6]), light, rw, 0.4);
    p.poly(brimPts, null, 3 * u);
    p.stroke([[cx - 0.5 * rw, yb - 0.62 * ry], [cx, yb - 0.72 * ry], [cx + 0.5 * rw, yb - 0.62 * ry]], 2 * u, mul(O.bonnet, [0.7, 0.66, 0.56]));
  }
  if (O.beard && (expr === 'shock' || expr === 'laugh' || expr === 'whistle')) p.ell(cx + 8 * u * facing, hc + 22 * u, 6 * u, 7 * u, '#5a1e28', 2 * u);
  p.rot = null;
  if (O.glasses) for (const s of [-1, 1]) { p.ell(cx + 4 * u * facing + s * 22 * u, hc - 2 * u, 15 * u, 13 * u, null, 2.6 * u, '#3a3a3a'); p.stroke([[cx + 4 * u * facing + s * 7 * u, hc - 2 * u], [cx + 4 * u * facing, hc - 2 * u]], 1.8 * u, '#3a3a3a'); }
};

export const headCenterSea = (seed = 5, kid = false) => {
  const H = headBlob(seed, kid ? 112 : 118, 0), HH = 2 * H.b;
  return 975 - (kid ? 1.02 : 1.36) * HH - (kid ? 0.87 : 1.1) * HH - H.b;
};

/** a distant gull, two strokes (used as a tiny FX card) */
export const fxGull = (p, t) => {
  const flap = Math.sin(t * Math.PI * 6) * 0.6;
  p.stroke([[140, 500], [220, 470 - 24 * flap], [300, 500]], 9, "#f4f7fa");
  p.stroke([[300, 500], [380, 470 - 24 * flap], [460, 500]], 9, "#f4f7fa");
  p.stroke([[140, 500], [300, 500], [460, 500]], 5, "rgba(60,70,90,.5)");
};
