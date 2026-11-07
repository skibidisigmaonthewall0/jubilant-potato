// Shot plan for "The Ship That Sailed With Nobody Aboard" — the Mary Celeste, 1872.
// Timed to the voiceover (32.55 s, 976 frames at 30 fps). Phrase times come from work/phrases.json:
//   0.00-1.60 "In 1872,"                          2.18-3.60 "sailors boarded a ship"
//   3.96-5.34 "in the middle of the Atlantic."    5.88-7.78 "The ship was in perfect order."
//   8.41-9.86 "The crew was gone."                10.60-13.55 "The Mary Celeste had left New York a month earlier"
//   13.90-16.86 "with ten people aboard, including the captain's wife and their little girl."
//   17.26-19.48 "The cargo was untouched."        19.76-24.04 "The food and water were untouched. Only the lifeboat was missing."
//   24.76-29.80 "So ten people climbed into a tiny open boat and left a working ship behind."
//   30.44-32.20 "Nobody has ever found them."
import { M, camFromKeys, idle, blinkAt, q } from './motion.js';

export const FPS = 30, TOTAL = 976, DECK = 4.55;
// where each set is parked in the scene (cameras and cards are written in set-local space)
export const SET_OFF = { sea: [0, 0, 0], cabin: [420, 0, 0], hold: [820, 0, 0], harbour: [0, 0, -520] };   // DECK: the ship's deck top (cards stand on it)
export { DECK as SHIPDECK };

export const SHOTS = [
  { id: 'wide', a: 0, b: 96, set: 'sea', light: 'dawn' },
  { id: 'alongside', a: 97, b: 168, set: 'sea', light: 'day' },
  { id: 'wheel', a: 169, b: 240, set: 'sea', light: 'day' },
  { id: 'cabin', a: 241, b: 300, set: 'cabin', light: 'cabin' },
  { id: 'gone', a: 301, b: 404, set: 'sea', light: 'day' },
  { id: 'harbour', a: 405, b: 460, set: 'sea', light: 'golden' },
  { id: 'harbour_close', a: 461, b: 520, set: 'sea', light: 'golden' },
  { id: 'hold', a: 521, b: 592, set: 'hold', light: 'hold' },
  { id: 'davits', a: 593, b: 730, set: 'sea', light: 'day' },
  { id: 'boat', a: 731, b: 902, set: 'sea', light: 'dusk' },
  { id: 'lost', a: 903, b: 975, set: 'sea', light: 'night' },
];
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f <= s.b) || SHOTS[SHOTS.length - 1];

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const ramp = (f, a, b) => clamp((f - a) / (b - a));

// ---------- lights ----------
export const LIGHTS = {
  dawn: { az: 118, el: 13, sky: '#b9c6dc', ground: '#4a5a6a', hemi: 1.05, sun: '#ffd3a2', sunI: 2.4, fog: '#d9d3cc', fogNear: 60, fogFar: 700,
    skyTop: '#5b8fc4', skyHor: '#f6d9b4', sunDisc: '#fff0cc', sunSize: 0.0032, sat: 1.06, waterDeep: '#173a52', waterShal: '#4f8fa8', glint: '#ffe7c2', vig: 0.26, shadowExt: 26 },
  day: { az: 150, el: 42, sky: '#c3d7ee', ground: '#5d6b72', hemi: 1.15, sun: '#fff4e0', sunI: 2.6, fog: '#cfdae4', fogNear: 80, fogFar: 900,
    skyTop: '#3f80d4', skyHor: '#cfdfee', sat: 1.08, waterDeep: '#12354c', waterShal: '#3f87a4', glint: '#eafaff', vig: 0.2, shadowExt: 26 },
  cabin: { az: 250, el: 30, sky: '#4a423a', ground: '#2a2420', hemi: 0.85, sun: '#ffdca8', sunI: 1.7, fog: '#1a1512', fogNear: 3, fogFar: 34,
    skyTop: '#1a1512', skyHor: '#2a2420', sunDisc: '#000', sat: 1.04, gain: '#ffe8c8', waterDeep: '#101010', waterShal: '#101010', glint: '#101010', vig: 0.42, shadowExt: 6 },
  golden: { az: 8, el: 8, sky: '#9a90c8', ground: '#5a4040', hemi: 1.0, sun: '#ffb46c', sunI: 2.9, fog: '#f0bb8c', fogNear: 70, fogFar: 760,
    skyTop: '#6f6eb0', skyHor: '#ffc27e', sunDisc: '#fff0c8', sunSize: 0.0035, sat: 1.12, gain: '#fff2e2', waterDeep: '#3d4a6a', waterShal: '#c98f6a', glint: '#ffe2a8', vig: 0.26, shadowExt: 22 },
  hold: { az: 200, el: 56, sky: '#4a3c2c', ground: '#31241a', hemi: 1.45, sun: '#ffd7a0', sunI: 2.6, fog: '#1d1611', fogNear: 4, fogFar: 42,
    skyTop: '#1d1610', skyHor: '#2c2318', sunDisc: '#000', sat: 1.05, gain: '#ffeacb', waterDeep: '#101010', waterShal: '#101010', glint: '#101010', vig: 0.4, shadowExt: 8 },
  grey: { az: 165, el: 26, sky: '#aab6c0', ground: '#5f6a70', hemi: 1.05, sun: '#e6ecf0', sunI: 1.9, fog: '#c3ccd2', fogNear: 50, fogFar: 520,
    skyTop: '#6d8aa2', skyHor: '#c9d2d6', sat: 0.9, gain: '#eef3f6', waterDeep: '#2a4450', waterShal: '#54767f', glint: '#dfeef2', vig: 0.24, shadowExt: 20 },
  dusk: { az: 20, el: 5, sky: '#8d86b4', ground: '#4a3a44', hemi: 0.95, sun: '#ff9a5a', sunI: 2.8, fog: '#e0a684', fogNear: 60, fogFar: 620,
    skyTop: '#5a5a9e', skyHor: '#ffb07a', sunDisc: '#ffe0b0', sunSize: 0.004, sat: 1.1, gain: '#ffe6d2', waterDeep: '#2c3a5c', waterShal: '#9a6a72', glint: '#ffd0a0', vig: 0.3, shadowExt: 18 },
  night: { az: 40, el: 16, sky: '#42506e', ground: '#1c2636', hemi: 0.72, sun: '#9fb4d8', sunI: 1.2, fog: '#31415c', fogNear: 60, fogFar: 700,
    skyTop: '#16223c', skyHor: '#4d6280', sat: 1.0, gain: '#dfe8f4', waterDeep: '#101d30', waterShal: '#2b4560', glint: '#cfe0f0', vig: 0.34, shadowExt: 30 },
};
export const lightFor = (S, f) => {
  const L = { ...LIGHTS[S.light] };
  if (S.id === 'cabin') L.shadowExt = 6;
  return L;
};

// ---------- cameras ----------
const CAMS = {
  // hook: low over the water, craning up the hull to the empty deck, then pulling back into a wide
  wide: [
    { f: 0, pos: [-52, 12.0, 38.0], look: [1, 7.4, 0.0], fov: 35 },
    { f: 45, pos: [-47, 10.6, 33.0], look: [1, 7.2, 0.0], fov: 36 },
    { f: 96, pos: [-40, 9.6, 30.0], look: [1, 7.2, -1.0], fov: 38 },
  ],
  // the wheel turning by itself; then a long creep along the empty deck while "the crew was gone"
  // she is hove to alongside the stranger: two hulls, one boat pulling across
  alongside: [
    { f: 97, pos: [-42, 17.0, -27.0], look: [1, 6.5, 15.0], fov: 45 },
    { f: 168, pos: [-35, 14.0, -31.0], look: [0, 6.0, 16.0], fov: 43 },
  ],
  // the wheel still swinging; the deck empty
  wheel: [
    { f: 169, pos: [-9.0, 6.15, 3.15], look: [-11.6, 5.5, 0], fov: 34 },
    { f: 205, pos: [-9.4, 6.1, 2.9], look: [-11.6, 5.5, 0], fov: 33 },
    { f: 240, pos: [-3.6, 7.0, 6.2], look: [-9.0, 5.9, 1.2], fov: 40 },
  ],
  // the abandoned cabin: table, logbook, chair shoved back, stern windows behind
  cabin: [
    { f: 241, pos: [2.6, 1.55, 1.5], look: [-0.6, 0.95, -1.7], fov: 50 },
    { f: 272, pos: [2.75, 1.62, 1.35], look: [-0.8, 0.92, -1.75], fov: 48 },
    { f: 300, pos: [2.9, 1.7, 1.2], look: [-1.0, 0.9, -1.8], fov: 46 },
  ],
  // wide two-shot: the rescuer hove to alongside, her boat rowing across
  gone: [
    { f: 301, pos: [-46, 20.0, -20.0], look: [2, 6.0, 18.0], fov: 47 },
    { f: 352, pos: [-40, 17.0, -25.0], look: [2, 6.0, 18.0], fov: 45 },
    { f: 404, pos: [-30, 13.0, -30.0], look: [2, 6.2, 16.0], fov: 43 },
  ],
  // flashback: the harbour, the ship slipping out, the captain's family at the rail
  // the ship slipping out past the fort, sails filling
  harbour: [
    { f: 405, pos: [-25.0, 7.6, -33.0], look: [1.0, 9.4, -1.0], fov: 42 },
    { f: 460, pos: [-22.5, 7.9, -30.0], look: [1.0, 9.2, -1.2], fov: 41 },
    { f: 520, pos: [-19.5, 8.2, -26.5], look: [1.0, 9.0, -1.4], fov: 40 },
  ],
  // and the people on that deck: the captain's family at the rail
  // the family at the rail, staged in depth along the deck
  // the family at the rail, staged in depth along the deck of the ship as she slips out
  harbour_close: [
    { f: 405, pos: [3.6, 7.9, -12.0], look: [6.6, 6.4, -1.9], fov: 46 },
    { f: 462, pos: [4.2, 7.75, -11.3], look: [6.6, 6.4, -1.9], fov: 45 },
    { f: 520, pos: [4.8, 7.6, -10.6], look: [6.6, 6.4, -1.9], fov: 44 },
  ],
  // the hold: rows of barrels, lantern sliding
  hold: [
    { f: 521, pos: [2.4, 2.0, 2.9], look: [-0.8, 1.0, -2.9], fov: 48 },
    { f: 592, pos: [1.5, 1.85, 3.1], look: [-1.1, 1.0, -2.7], fov: 45 },
  ],
  // the empty davits
  // from the water, up at the empty davits where the boat used to hang
  // from the water, up at the empty davits where the boat used to hang
  davits: [
    { f: 593, pos: [20.0, 3.6, 12.0], look: [6.0, 6.3, 3.9], fov: 40 },
    { f: 660, pos: [19.0, 3.3, 11.2], look: [6.0, 6.25, 3.9], fov: 39 },
    { f: 730, pos: [18.0, 3.0, 10.4], look: [6.0, 6.2, 3.9], fov: 38 },
  ],
  // the tiny open boat on a huge sea; pull back until it is a dot
  boat: [
    { f: 731, pos: [1.2, 3.0, 21.0], look: [8.6, 0.9, 13.2], fov: 36 },
    { f: 800, pos: [2.2, 4.0, 25.5], look: [8.8, 0.85, 13.1], fov: 34 },
    { f: 902, pos: [3.2, 5.0, 30.0], look: [9.0, 0.8, 13.0], fov: 32.5 },
  ],
  // last beat: the sea at dusk, nothing left to see
  // the sea where they were last seen, and one cut rope on the gunwale
  lost: [
    { f: 903, pos: [9.0, 4.6, 34.0], look: [26.0, 4.2, 52.0], fov: 40 },
    { f: 940, pos: [11.0, 5.2, 36.0], look: [34.0, 4.4, 58.0], fov: 43 },
    { f: 975, pos: [13.0, 5.8, 38.0], look: [42.0, 4.6, 64.0], fov: 46 },
  ],
};
const KICKS = [{ f: 97, a: 0.5 }, { f: 209, a: 0.4 }, { f: 731, a: 0.45 }];
export const camAt = (f) => {
  const S = shotAt(f), K = CAMS[S.id];
  const c = camFromKeys(K, f, { kicks: KICKS.filter((k) => k.f >= S.a - 2 && k.f <= S.b + 2) });
  // hard cuts get a 5-frame dissolve of white only on the harbour jump
  c.flash = f >= 405 && f < 409 ? 0.5 * (1 - (f - 405) / 4) : 0;
  return c;
};

// ---------- lens ----------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const dofAt = (f) => {
  const S = shotAt(f), C = camAt(f);
  switch (S.id) {
    case 'wide': return { focus: lerp(52, 36, smooth(ramp(f, 0, 96))), cinf: lerp(5, 7, smooth(ramp(f, 0, 96))) };
    case 'wheel': return { focus: lerp(dist(C.pos, [-11.6, 5.5, 0]), dist(C.pos, [-9.0, 5.9, 1.2]), smooth(ramp(f, 205, 240))), cinf: 8 };
    case 'harbour': return { focus: dist(C.pos, [2.0, 6.4, -2.0]), cinf: lerp(3, 5, smooth(ramp(f, 405, 520))) };
    case 'cabin': return { focus: dist(C.pos, [0.3, 1.0, -0.7]), cinf: lerp(7, 12, smooth(ramp(f, 241, 300))) };
    case 'alongside': return { focus: dist(C.pos, [0, 5.4, 9.0]), cinf: 7 };
    case 'gone': return { focus: dist(C.pos, [1, 5.6, 10.0]), cinf: 6 };
    case 'harbour_close': { const fx = lerp(6.5, 7.0, smooth(ramp(f, 461, 520))); return { focus: dist(C.pos, [fx, 5.7, -1.9]), cinf: 6 }; }
    case 'hold': return { focus: dist(C.pos, [-0.9, 1.0, -2.8]), cinf: lerp(5, 9, smooth(ramp(f, 521, 592))) };
    case 'davits': return { focus: dist(C.pos, [6.0, 6.25, 3.9]), cinf: 6 };
    case 'boat': return { focus: dist(C.pos, [8.7, 0.9, 13.1]), cinf: lerp(6, 11, smooth(ramp(f, 740, 860))) };
    case 'lost': return { focus: 400, cinf: lerp(4, 0.3, smooth(ramp(f, 915, 975))) };
  }
  return { focus: 12, cinf: 0 };
};

// ---------- world state ----------
export const worldAt = (f) => ({
  boatGone: ramp(f, 596, 646),          // the lifeboat drops away on "only the lifeboat was missing"
  sailOut: f >= 405 && f <= 520 ? ramp(f, 405, 520) * 16 : 0,   // the ship slips past the quay in the flashback
});

// ---------- cast ----------
const q2 = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;
const card = (who, o, pos, extra = {}) => ({
  key: who + JSON.stringify(o), draw: (p) => T.seaFront(p, who, o), x: pos[0], y: pos[1], z: pos[2], ...extra,
});
let T;   // the toon module, handed in per frame by main.js via actorsAt(f, T)
const ID = (f, seed) => idle(f, seed);
const tintOf = (S) => S.light === 'golden' ? '#ffe6cf' : S.light === 'dusk' ? '#ffd9c0' : S.light === 'night' ? '#c8d6ea' : S.light === 'grey' ? '#e8eef2' : '#ffffff';

export const actorsAt = (f, TT) => {
  T = TT;
  const S = shotAt(f), out = [], tint = tintOf(S);
  const idleOf = (seed) => { const i = ID(f, seed); return { bob: q2(i.bob, 3), tilt: q2(i.tilt, 1), headTilt: q2(i.headTilt, 1) }; };
  switch (S.id) {
    case 'wheel': {
      // nobody at the wheel: only the swinging lantern and a loose rope do the acting
      break;
    }
    case 'harbour_close': {
      const look = q2(lerp(0.2, 0.05, smooth(ramp(f, 405, 520))), 2);
      const hb = ramp(f, 405, 520) * 1.4;   // she slides forward under them
      // staged in depth along the rail so all three read: girl low and nearest, wife, then the captain
      out.push(card('captain', { expr: 'smile_closed', look, seed: 3, blink: blinkAt(f, 3), ...idleOf(3), L: 'hold', R: 'point' }, [7.4 + hb, DECK, -1.5], { tint, s: 0.97 }));
      out.push(card('sarah', { expr: f > 470 ? 'smile' : 'neutral', look, seed: 8, blink: blinkAt(f, 8), ...idleOf(8), L: 'hold', R: f > 462 ? 'wave' : 'hold', wv: q2(f * 0.3, 1) }, [6.3 + hb, DECK, -1.9], { tint, s: 0.95 }));
      out.push(card('girl', { expr: 'grin', look, seed: 12, blink: blinkAt(f, 12), ...idleOf(12), L: 'up', R: 'up' }, [6.85 + hb, DECK, -2.15], { tint, s: 0.8 }));
      break;
    }
    case 'davits': case 'boat': case 'lost': {
      // the empty boat: a single oar and a shawl tell you people were here
      break;
    }
    case 'gone': {
      // nothing on the deck: the emptiness is the subject
      break;
    }
  }
  return out;
};

// ---------- 2D effects ----------
const FX = (key, draw, pos, s, extra = {}) => ({ key, draw, x: pos[0], y: pos[1], z: pos[2], s, blob: false, shadow: false, order: 5, ...extra });
export const fxAt = (f, TT) => {
  T = TT;
  const S = shotAt(f), out = [];
  if ((S.id === 'wheel' && f > 175) || S.id === 'alongside') {   // a loose rope sliding, a gull
    for (let i = 0; i < 2; i++) {
      const t = ((f - 120) * 0.004 + i * 0.5) % 1;
      out.push(FX('gull' + i, (p) => T.fxGull ? T.fxGull(p, t) : null, [-14 + t * 26, 13.5 + i * 2.4 + Math.sin(t * 7) * 0.6, 18 - t * 10], 1.6, { alpha: 1 }));
    }
  }
  if (S.id === 'boat') {   // spray at the waterline of the boat
    const t = ((f * 0.02) % 1);
    out.push(FX('spray' + q2(t, 1), (p) => T.fxSplash(p, t), [8.5, 0.15, 13.2], 0.5));
  }
  return out;
};
