import * as THREE from './lib/three.module.js';
import * as T from './toon.js';

import * as P from './paint.js';
import { SHOTS, TOTAL, shotAt, camAt, dofAt, LIGHTS, lightFor, actorsAt, worldAt, fxAt, SET_OFF } from './story.js';

const W = 1080, H = 1920;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.08, 1500);
const rx = (a) => a * Math.PI / 180;

// ---------- materials ----------
const grad = (() => { const d = new Uint8Array([90, 90, 90, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 2, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: grad, ...opts });
const texM = (c, rx_ = 1, ry_ = 1, color = '#ffffff') => toon({ map: P.tex(c, rx_, ry_), color });
const M = {
  plank: texM(P.planks(1), 1, 6), beam: texM(P.beam(2), 1, 2), beamDark: texM(P.beam(3, [28, 36, 30]), 1, 2),
  rot: texM(P.rotten(4), 1, 1), rotB: texM(P.rotten(14), 1, 1),
  stone: texM(P.stone(4), 1, 1), stoneMoss: texM(P.mossy(P.stone(4), 5, 1.2), 1, 1),
  grass: texM(P.grass(6), 40, 40), dirt: texM(P.dirt(7), 6, 30), plaster: texM(P.plaster(8), 1, 1), plaster2: texM(P.plaster(18, 28), 1, 1),
  roof: texM(P.roof(9), 2, 2), marble: texM(P.marble(10), 1, 1), marbleTop: toon({ color: '#ece2cf' }),
  trunk: toon({ color: '#6a4a32' }), cypress: toon({ color: '#3f6b36' }), pine: toon({ color: '#5c8a3c' }), bush: toon({ color: '#6c9a42' }),
  hill: toon({ color: '#7aa64c' }), hillFar: toon({ color: '#86ad60' }), mount: toon({ color: '#8fa7b8' }), snow: toon({ color: '#f4f6fa' }),
  iron: toon({ color: '#5c5a57' }), bronze: toon({ color: '#b08a4a' }), wood: toon({ color: '#7a5434' }), door: toon({ color: '#5a3a24' }),
  window: toon({ color: '#2b2430' }), red: toon({ color: '#b8282b' }),
};
M.banner = new THREE.MeshToonMaterial({ gradientMap: grad, map: P.tex(P.banner()), alphaTest: 0.5, side: THREE.DoubleSide });
// helmet
const helmetIn = P.tex(P.helmetInside()); helmetIn.wrapS = helmetIn.wrapT = THREE.ClampToEdgeWrapping;
M.helmIn = new THREE.MeshToonMaterial({ gradientMap: grad, map: helmetIn, side: THREE.BackSide });
M.helmOut = toon({ color: '#8f8a7e' });

// ---------- ink / normal-depth contract ----------
const NOINK = 'noink'; // userData flag: never outlined (cards, fx, water handled specially)
const ndMat = new THREE.ShaderMaterial({
  vertexShader: `varying vec3 vN; varying float vD; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vN; varying float vD; void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n; gl_FragColor = vec4(n*.5+.5, vD); }`,
  side: THREE.DoubleSide,
});
const cardNd = (map) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map } },
  vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv=uv; vec4 mv = modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vD; void main(){ if(texture2D(map,vUv).a<.5) discard; gl_FragColor=vec4(0.,0.,0.,vD); }`,
  side: THREE.DoubleSide,
});
const waterNd = new THREE.ShaderMaterial({
  vertexShader: `varying float vD; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying float vD; void main(){ gl_FragColor=vec4(.5,1.,.5,vD); }`,
});

// ---------- helpers ----------
const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene, opts = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = opts.cast ?? true; m.receiveShadow = true; parent.add(m); return m;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const uvScale = (geo, su, sv) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; };
/** box with world-scaled UVs per face (texel density 1 tile per `t` metres) */
const tbox = (w, h, d, t = 2) => {
  const g = box(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / t, uv.getY(i) * dims[f][1] / t); }
  return g;
};

// ---------- sky ----------
const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, sunSize: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 top, hor, sunDir, sunCol; uniform float sunSize; varying vec3 vP;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    void main(){ float h = clamp(vP.y,0.,1.); vec3 c = mix(hor, top, pow(h, .55)); if(vP.y<0.) c = hor;
      float s = dot(normalize(vP), normalize(sunDir)); c += sunCol * (smoothstep(1.-sunSize, 1.-sunSize*.6, s) + .35*pow(max(s,0.), 24.)*step(.001,sunSize));
      // painted cloud bank: soft horizontal bands, brighter on the sun side
      vec2 q = normalize(vP).xz / max(0.12, vP.y + 0.22);
      float band = noise(q * 1.6) * 0.6 + noise(q * 3.7 + 5.0) * 0.4;
      float cl = smoothstep(0.52, 0.78, band) * smoothstep(0.06, 0.3, vP.y) * (1.0 - smoothstep(0.55, 0.95, vP.y));
      c = mix(c, mix(vec3(0.93,0.94,0.96), sunCol * 1.05 + 0.25, 0.35), cl * 0.55);
      gl_FragColor = vec4(c,1.); }`,
}));
sky.userData.sky = true; scene.add(sky);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffffff', 2); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 2;
scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog('#ffffff', 40, 600);

// ---------- world ----------
// Sets: A the open Atlantic (Mary Celeste), B the captain's cabin, C the hold.
// Each set is its own group, parked far from the others and switched on per shot in worldState().
const SEA = new THREE.Group(); scene.add(SEA);
const CABIN = new THREE.Group(); CABIN.position.set(420, 0, 0); scene.add(CABIN);
const HOLD = new THREE.Group(); HOLD.position.set(820, 0, 0); scene.add(HOLD);

const M2 = {
  deck: texM(P.deckPlank(5), 1, 1), hull: texM(P.hull(7), 1, 1), hullRed: texM(P.hull(8), 1, 1),
  sail: new THREE.MeshToonMaterial({ gradientMap: grad, map: P.tex(P.sail(9)), side: THREE.DoubleSide }),
  sailDim: new THREE.MeshToonMaterial({ gradientMap: grad, map: P.tex(P.sail(19)), color: '#d8cdb8', side: THREE.DoubleSide }),
  timber: texM(P.shipTimber(13), 1, 1), barrel: texM(P.beam(21, [30, 34, 30]), 1, 1),
  barrelTop: new THREE.MeshToonMaterial({ gradientMap: grad, map: P.tex(P.barrelTop(11), 1, 1) }),
  paper: new THREE.MeshToonMaterial({ gradientMap: grad, map: P.tex(P.logPage(15), 1, 1) }),
  rope: toon({ color: '#5b4a34' }), iron: toon({ color: '#3c3a38' }), brass2: toon({ color: '#b8944a' }),
  glass: new THREE.MeshBasicMaterial({ color: '#ffe9b0', transparent: true, opacity: 0.55 }),
  win: new THREE.MeshBasicMaterial({ color: '#cfe6f2', fog: false }),
  lamp: new THREE.MeshBasicMaterial({ color: '#ffd98a' }),
  paint: toon({ color: '#181a1e' }), ochre: toon({ color: '#8a6a3a' }),
};

// ---------------- water ----------------
const seaU = { t: { value: 0 }, deep: { value: new THREE.Color('#173a52') }, mid: { value: new THREE.Color('#2b6a86') }, crest: { value: new THREE.Color('#8fc6d6') }, foam: { value: new THREE.Color('#eef7fa') } };
const seaMat = new THREE.ShaderMaterial({
  uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...seaU }, fog: true,
  vertexShader: `#include <fog_pars_vertex>
    varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader: `#include <fog_pars_fragment>
    uniform float t; uniform vec3 deep, mid, crest, foam; varying vec3 vW;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    void main(){
      float camD = length(vW.xz - cameraPosition.xz);
      // height over distance: big right under the camera, tending to zero at the horizon
      float camH = max(0.35, cameraPosition.y);
      float slope = camH / sqrt(camH*camH + camD*camD);
      vec2 p = vW.xz*0.06;
      float swell = noise(p + vec2(t*0.06, -t*0.035)) * 0.6 + noise(p*2.7 + 11. + vec2(-t*0.1, t*0.05)) * 0.4;
      float ripple = noise(vW.xz*0.5 + vec2(t*0.35, -t*0.2));
      vec3 c = mix(deep, mid, smoothstep(0.25, 0.85, swell));
      c = mix(c, crest, smoothstep(0.72, 0.96, swell) * 0.65);
      // long glints on the swell faces
      float glint = smoothstep(0.62, 0.72, ripple) * smoothstep(0.45, 0.9, swell);
      c = mix(c, foam, glint * 0.5);
      // a flat sea seen at a grazing angle is a mirror of the sky: near the horizon the
      // water has to take the fog colour, or the horizon reads as a hard dark bar.
      c = mix(c, fogColor, (1.0 - smoothstep(0.004, 0.075, slope)) * 0.92);
      gl_FragColor = vec4(c,1.);
      #include <fog_fragment>
    }`,
});
const sea = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600, 1, 1), seaMat);
sea.rotation.x = -Math.PI / 2; sea.userData.nd = waterNd; sea.receiveShadow = false; scene.add(sea);

// ---------------- hull loft ----------------
// stations: [{x, w, yd, yb}]  (half width, deck line, keel line) — lofted into a closed hull
const loftHull = (stations, nSec = 14) => {
  const pos = [], uv = [], idx = [];
  const ring = (s) => {
    const out = [];
    for (let i = 0; i <= nSec; i++) {
      const u = i / nSec, z = -s.w * Math.cos(Math.PI * u), y = s.yd - (s.yd - s.yb) * Math.pow(Math.sin(Math.PI * u), 1.35);
      out.push([s.x, y, z]);
    }
    return out;
  };
  const rings = stations.map(ring);
  let v = 0;
  for (let r = 0; r < rings.length - 1; r++) {
    const A = rings[r], B = rings[r + 1];
    for (let i = 0; i < nSec; i++) {
      const q = [A[i], A[i + 1], B[i + 1], B[i]];
      const vs = q.map((p) => { pos.push(...p); return v++; });
      uv.push([i / nSec * 3, r / (rings.length - 1) * 2], [(i + 1) / nSec * 3, r / (rings.length - 1) * 2],
        [(i + 1) / nSec * 3, (r + 1) / (rings.length - 1) * 2], [i / nSec * 3, (r + 1) / (rings.length - 1) * 2]);
      idx.push(vs[0], vs[1], vs[2], vs[0], vs[2], vs[3]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uvs = []; uv.forEach((a) => uvs.push(...a));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // winding fix: after the deck is mirrored some lofts face inwards and vanish under backface culling
  const nrm = g.attributes.normal, fs3 = [], a = new THREE.Vector3(), b2 = new THREE.Vector3(), c2 = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    a.fromBufferAttribute(g.attributes.position, idx[i]); b2.fromBufferAttribute(g.attributes.position, idx[i + 1]); c2.fromBufferAttribute(g.attributes.position, idx[i + 2]);
    const ny = b2.clone().sub(a).cross(c2.clone().sub(a)).y;
    fs3.push(ny);
  }
  let out = 0, inn = 0;
  for (let i = 0; i < fs3.length; i++) {
    const ci = idx[i * 3];
    (nrm.getY(ci) < -0.05 ? inn++ : out++);
  }
  if (inn > out) {   // the whole loft is inside-out: flip every triangle
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    g.setIndex(idx); g.computeVertexNormals();
  }
  return g;
};
/** deck outline polygon (x,z) for the same stations */
const deckShape = (stations, inset = 0.96) => {
  const pts = [];
  stations.forEach((s) => pts.push([s.x, -s.w * inset]));
  [...stations].reverse().forEach((s) => pts.push([s.x, s.w * inset]));
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => sh.lineTo(p[0], p[1])); sh.closePath();
  return sh;
};
/** a rope/brace between two points */
const rope = (a, b, r = 0.035, parent = SEA) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 5, 1), M2.rope);
  m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  parent.add(m); return m;
};
/** square sail, slightly billowed, hoisted on a yard */
const makeSail = (w, h, mat = M2.sail, billow = 0.3) => {
  const g = new THREE.PlaneGeometry(w, h, 8, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2);
    p.setZ(i, Math.cos(x * Math.PI / 2) * Math.cos(y * Math.PI / 2) * billow * h * 0.18);
    p.setX(i, p.getX(i) * (1 - 0.06 * Math.abs(y)));
  }
  g.computeVertexNormals(); return new THREE.Mesh(g, mat);
};

// ---------------- the Mary Celeste ----------------
const ship = new THREE.Group(); SEA.add(ship);
const LEN = 30, BEAM = 8.2, DK = 4.4;
const stations = [
  { x: -15.2, w: 3.1, yd: DK, yb: 1.9 },
  { x: -13.0, w: 3.75, yd: DK, yb: 0.9 },
  { x: -9.0, w: 4.05, yd: DK + 0.1, yb: 0.25 },
  { x: -3.0, w: 4.1, yd: DK + 0.15, yb: 0.1 },
  { x: 3.0, w: 3.95, yd: DK + 0.15, yb: 0.12 },
  { x: 8.6, w: 3.5, yd: DK + 0.1, yb: 0.5 },
  { x: 12.4, w: 2.55, yd: DK, yb: 1.5 },
  { x: 14.6, w: 1.35, yd: DK, yb: 2.7 },
  { x: 15.6, w: 0.3, yd: DK - 0.1, yb: 3.6 },
];
add(loftHull(stations), M2.hull, 0, 0, 0, ship);
// deck
const deckGeo = new THREE.ExtrudeGeometry(deckShape(stations, 0.97), { depth: 0.22, bevelEnabled: false });
deckGeo.rotateX(Math.PI / 2); deckGeo.translate(0, DK, 0);
add(deckGeo, M2.deck, 0, 0, 0, ship, { cast: false });
// bulwarks: a rail wall following the deck edge
{
  const edge = stations.map((s) => [s.x, s.w * 0.965]);
  for (const sgn of [1, -1]) {
    // the bulwark is a ribbon of quads along the deck edge, so it hugs the hull curve
    const pos = [], idx = [], uv = [];
    edge.forEach(([x, w], i) => {
      const z = sgn * (w - 0.08), y0 = DK - 0.05, y1 = DK + 1.02 - Math.abs(x) * 0.01;
      pos.push(x, y0, z, x, y1, z);
      uv.push(i * 0.6, 0, i * 0.6, 1);
      if (i < edge.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    });
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gg.setIndex(idx); gg.computeVertexNormals();
    const wall = new THREE.Mesh(gg, new THREE.MeshToonMaterial({ gradientMap: grad, map: P.tex(P.hull(8), 1, 1), side: THREE.DoubleSide }));
    ship.add(wall);
    // cap rail along the top
    for (let i = 0; i < edge.length - 1; i++) {
      const [x0, w0] = edge[i], [x1, w1] = edge[i + 1];
      const y0 = DK + 1.02, y1 = DK + 1.02;
      const len = Math.hypot(x1 - x0, w1 - w0);
      const m2 = add(tbox(len + 0.1, 0.13, 0.26, 1), M2.ochre, (x0 + x1) / 2, y0 + 0.06, sgn * ((w0 + w1) / 2 - 0.08), ship);
      m2.rotation.y = -Math.atan2(w1 - w0, x1 - x0) * 0;
    }
  }
}
// deck furniture: cabin skylight, hatch, wheel, capstan, casks
add(tbox(4.2, 1.0, 2.6, 1.2), M2.deck, -4.6, DK + 0.5, 0, ship);              // deckhouse
add(tbox(4.6, 0.22, 3.0, 1.2), M2.ochre, -4.6, DK + 1.1, 0, ship);
add(tbox(2.6, 0.3, 2.0, 1), M2.timber, 3.2, DK + 0.15, 0, ship);               // main hatch
add(tbox(1.6, 0.28, 1.4, 1), M2.timber, 6.6, DK + 0.14, 0, ship);              // fore hatch
{ // wheel + binnacle aft
  const wg = new THREE.Group(); wg.position.set(-11.6, DK + 0.95, 0); ship.add(wg);
  const wheel = add(new THREE.TorusGeometry(0.62, 0.06, 8, 20), M2.rope, 0, 0, 0, wg); wheel.rotation.y = Math.PI / 2;
  for (let i = 0; i < 8; i++) { const sp = add(new THREE.CylinderGeometry(0.035, 0.035, 1.36, 5), M2.rope, 0, 0, 0, wg); sp.rotation.x = Math.PI / 2; sp.rotation.z = i * Math.PI / 8; }
  add(tbox(0.3, 0.95, 0.3, 1), M2.timber, 0, -0.5, 0, wg);
  add(tbox(0.9, 0.7, 0.7, 1), M2.timber, 0.9, -0.55, 0, wg);
}
add(new THREE.CylinderGeometry(0.42, 0.5, 0.75, 12), M2.timber, 8.4, DK + 0.4, 0, ship);   // capstan
for (const [x, z, r] of [[-7.2, 1.6, 0.42], [-7.6, 1.9, 0.34], [-6.9, 2.0, 0.3], [10.4, 1.2, 0.38]]) {
  const b = add(new THREE.CylinderGeometry(r, r * 0.94, r * 2.4, 12), M2.barrel, x, DK + r * 1.2, z, ship);
  b.rotation.z = Math.PI / 2;
}
// masts, yards, sails, rigging
const mast = (x, h, r = 0.28) => {
  const g = new THREE.Group(); g.position.set(x, DK, 0); ship.add(g);
  add(new THREE.CylinderGeometry(r * 0.62, r, h, 10), M2.rope, 0, h / 2, 0, g);
  return { g, top: [x, DK + h, 0], h };
};
const fore = mast(9.4, 17.5);
const mainm = mast(-2.2, 19.5);
const mizzen = mast(-11.0, 11.0, 0.2);
const bowsprit = rope([15.4, DK + 0.3, 0], [22.6, DK + 2.6, 0], 0.16);
const sails = [];
// main mast: two square sails + a top sail
const addSquare = (mx, top, y, w, h, mat) => {
  const s = makeSail(w, h, mat);
  s.position.set(mx + 0.05, y, 0); s.rotation.y = Math.PI / 2; ship.add(s);
  sails.push(s);
  const yard = add(new THREE.CylinderGeometry(0.1, 0.1, w * 1.06, 8), M2.rope, mx, y + h / 2 + 0.08, 0, ship);
  yard.rotation.x = Math.PI / 2;
  return s;
};
addSquare(-2.2, mainm.top, DK + 12.6, 9.4, 4.6);
addSquare(-2.2, mainm.top, DK + 16.9, 6.2, 3.2);
addSquare(9.4, fore.top, DK + 11.0, 8.2, 4.2);
addSquare(9.4, fore.top, DK + 14.9, 5.4, 2.9);
// gaff sail at the mizzen + a jib out along the bowsprit
{
  const g = new THREE.BufferGeometry();
  const a = [-10.2, DK + 6.2, 0], b = [-12.6, DK + 9.2, 0], c = [-13.4, DK + 3.2, 0], d = [-10.4, DK + 2.6, 0];
  const pos = [...a, ...b, ...c, ...a, ...c, ...d];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0.5, 1, 1, 0, 0, 0, 1, 0, 1, 0.2], 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M2.sailDim); ship.add(m); sails.push(m);
  const jib = makeSail(4.0, 8.0, M2.sail, 0.4);
  jib.position.set(18.6, DK + 8.6, 0); jib.rotation.set(0, Math.PI / 2, -0.72); ship.add(jib); sails.push(jib);
}
// rigging
const rig = (a, b) => rope([...a], [...b], 0.03, ship);
rig([-15.4, DK + 0.2, 0], [-2.2, DK + 18.6, 0]); rig([-15.4, DK + 0.2, 0], [9.4, DK + 16.6, 0]);
rig([22.6, DK + 2.6, 0], [9.4, DK + 16.6, 0]); rig([22.6, DK + 2.6, 0], [15.0, DK + 0.4, 0]);
for (const s of [-1, 1]) {
  rig([-2.2, DK + 18.4, 0], [-1.0, DK + 1.0, s * 3.7]); rig([9.4, DK + 16.4, 0], [8.2, DK + 1.0, s * 3.6]);
  rig([-2.2, DK + 18.4, 0], [-11.0, DK + 10.4, 0]);
}
for (let i = 0; i < 7; i++) { const x = -2.2 + (i - 3) * 0.9; rig([x, DK + 16.9, 0], [x, DK + 12.6, 0]); }
// the lifeboat on its davits (it goes missing in the story)
const lifeboat = new THREE.Group(); lifeboat.position.set(6.0, DK + 1.1, 3.9); ship.add(lifeboat);
{
  const st = [
    { x: -2.2, w: 0.35, yd: 0.75, yb: 0.45 }, { x: -1.4, w: 0.72, yd: 0.8, yb: 0.18 },
    { x: 0, w: 0.8, yd: 0.82, yb: 0.1 }, { x: 1.3, w: 0.66, yd: 0.8, yb: 0.2 }, { x: 2.1, w: 0.28, yd: 0.78, yb: 0.46 },
  ];
  add(loftHull(st, 10), M2.sailDim, 0, 0, 0, lifeboat);
  for (const s of [-1, 1]) add(tbox(3.6, 0.1, 0.08, 1), M2.rope, 0, 0.86, s * 0.6, lifeboat);
  for (const x of [-1.2, 0.4]) add(tbox(0.9, 0.06, 1.3, 1), M2.rope, x, 0.66, 0, lifeboat);
}
// davits: a post on the rail with a curved head reaching outboard, and the fall still hanging from it
const davitPosts = [];
for (const s of [-1, 1]) {
  const z = 3.9 + s * 1.75;
  add(new THREE.CylinderGeometry(0.11, 0.13, 2.2, 8), M2.timber, 4.35, DK + 1.1, z, ship);
  // the head: a short timber arm angled out over the water
  const arm = add(tbox(1.5, 0.2, 0.24, 1), M2.timber, 5.0, DK + 2.34, z, ship);
  arm.rotation.z = -0.34;
  add(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 8), M2.iron, 4.4, DK + 2.2, z, ship);   // iron band at the post
  // the fall: a rope hanging from the head, its end frayed where the boat was cut away
  const fall = add(new THREE.CylinderGeometry(0.028, 0.028, 1.35, 5), M2.rope, 5.68, DK + 1.5, z, ship);
  fall.rotation.z = 0.05;
  add(new THREE.CylinderGeometry(0.06, 0.02, 0.34, 5), M2.rope, 5.72, DK + 0.68, z, ship);   // the frayed end
  davitPosts.push(z);
}
// the ship's own boat hanging out over the water on the far side, for a later be-attentioned shot: not needed
// stern name board
{ const g = new THREE.Group(); g.position.set(-15.3, DK - 0.6, 0); ship.add(g);
  const board = add(tbox(0.12, 0.9, 2.4, 1), M2.paint, 0, 0, 0, g);
  add(tbox(0.14, 0.14, 2.1, 1), M2.brass2, 0.03, 0.3, 0, g); add(tbox(0.14, 0.14, 2.1, 1), M2.brass2, 0.03, -0.3, 0, g);
}



// ---------------- the Dei Gratia (the ship that found her) ----------------
const dg = new THREE.Group(); dg.position.set(0, 0, 34); dg.rotation.y = Math.PI + 0.18; SEA.add(dg);
{
  const st = [
    { x: -12, w: 2.6, yd: 4.0, yb: 1.6 }, { x: -9, w: 3.3, yd: 4.0, yb: 0.7 },
    { x: -2, w: 3.6, yd: 4.1, yb: 0.1 }, { x: 5, w: 3.4, yd: 4.1, yb: 0.2 },
    { x: 9.5, w: 2.9, yd: 4.0, yb: 0.8 }, { x: 12.4, w: 1.2, yd: 4.0, yb: 2.4 },
  ];
  add(loftHull(st), M2.hullRed, 0, 0, 0, dg);
  const g2 = new THREE.ExtrudeGeometry(deckShape(st, 0.95), { depth: 0.2, bevelEnabled: false });
  g2.rotateX(Math.PI / 2); g2.translate(0, 4.05, 0); add(g2, M2.deck, 0, 0, 0, dg, { cast: false });
  for (const [x, h] of [[6.4, 14.5], [-1.4, 16.0]]) {
    add(new THREE.CylinderGeometry(0.2, 0.3, h, 8), M2.rope, x, 4 + h / 2, 0, dg);
    for (const z of [-3.2, 3.2]) rope([x, 4.2, z], [x, 9.6, 0], 0.025, dg);
  }
  const s1 = makeSail(6.4, 3.6, M2.sailDim); s1.position.set(6.4, 11.4, 0); s1.rotation.y = Math.PI / 2; dg.add(s1);
  const s2 = makeSail(7.0, 4.0, M2.sailDim); s2.position.set(-1.4, 12.6, 0); s2.rotation.y = Math.PI / 2; dg.add(s2);
  add(tbox(3.4, 1.1, 2.2, 1), M2.deck, -6.4, 4.6, 0, dg);
  // her rowboat, pulling across to the empty ship
  const rb = new THREE.Group(); rb.position.set(2.0, 0.35, -12.0); dg.add(rb);
  add(loftHull([{ x: -1.8, w: 0.3, yd: 0.55, yb: 0.3 }, { x: -1.0, w: 0.62, yd: 0.6, yb: 0.1 }, { x: 0.6, w: 0.66, yd: 0.6, yb: 0.08 }, { x: 1.8, w: 0.34, yd: 0.56, yb: 0.3 }], 10), M2.sailDim, 0, 0, 0, rb);
  for (const x of [-1.0, 0.5]) add(tbox(1.0, 0.07, 1.2, 1), M2.rope, x, 0.48, 0, rb);
  for (const sgn of [-1, 1]) { const o = add(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), M2.rope, 0, 0.55, sgn * 0.75, rb); o.rotation.z = Math.PI / 2 + sgn * 0.25; o.rotation.x = sgn * 0.2; }
  dg.userData.boat = rb;
}


// ---------------- the open boat (final beats) ----------------
// The real boat in the story was never found. This is the shot before that: an empty boat,
// one oar shipped, a shawl left on the thwart.
const openBoat = new THREE.Group(); openBoat.position.set(3.0, 0, 6.2); SEA.add(openBoat);
{
  add(loftHull([{ x: -2.4, w: 0.35, yd: 0.95, yb: 0.55 }, { x: -1.4, w: 0.8, yd: 1.0, yb: 0.25 },
    { x: 0.2, w: 0.85, yd: 1.02, yb: 0.15 }, { x: 1.6, w: 0.7, yd: 1.0, yb: 0.3 }, { x: 2.4, w: 0.3, yd: 0.94, yb: 0.58 }], 10), M2.sailDim, 0, 0, 0, openBoat);
  for (const x of [-1.3, 0.5]) add(tbox(1.1, 0.09, 1.5, 1), M2.rope, x, 0.72, 0, openBoat);
  const o1 = add(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6), M2.rope, 0.6, 0.86, 0.5, openBoat); o1.rotation.z = Math.PI / 2; o1.rotation.y = 0.3;
  add(tbox(0.7, 0.06, 0.24, 1), M2.rope, 2.1, 0.86, 0.9, openBoat).rotation.y = 0.3;
  const o2 = add(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), M2.rope, -0.2, 0.9, -0.7, openBoat); o2.rotation.x = Math.PI / 2; o2.rotation.z = 0.15;
  const shawl = add(new THREE.PlaneGeometry(0.9, 0.6, 6, 4), new THREE.MeshToonMaterial({ gradientMap: grad, color: '#8a5a6b', side: THREE.DoubleSide }), -1.25, 0.8, 0.1, openBoat);
  shawl.rotation.x = -Math.PI / 2 + 0.35;
}

// ---------------- one oar, floating where the boat was last seen ----------------
const lostOar = new THREE.Group(); lostOar.position.set(30.0, 0.06, 55.0); SEA.add(lostOar);
{
  const shaft = add(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), M2.rope, 0, 0, 0, lostOar);
  shaft.rotation.z = Math.PI / 2;
  const blade = add(tbox(0.72, 0.05, 0.26, 1), M2.rope, 1.95, 0, 0, lostOar);
  blade.rotation.y = 0.06;
  const arm = add(tbox(0.9, 0.05, 0.2, 1), M2.timber, -1.5, 0.02, 0.02, lostOar); arm.rotation.y = 0.09;
  lostOar.rotation.y = -0.5;
}

// ---------------- the sea "wide" set: a distant island so the horizon is not empty ----------------
{
  const r = P.rng(61);
  for (let i = 0; i < 3; i++) {
    const a = -0.6 + i * 0.5, d = 700 + r() * 300;
    const h = add(new THREE.SphereGeometry(60 + r() * 60, 16, 8), toon({ color: '#5c7a63' }), Math.cos(a) * d, -18, Math.sin(a) * d - 200, SEA, { cast: false });
    h.scale.y = 0.25 + r() * 0.12;
  }
}

// ---------------- cabin (set B) ----------------
{
  const W = 7.0, D = 5.4, H = 2.5;
  add(tbox(W, 0.1, D, 1.2), M2.deck, 0, 0.05, 0, CABIN, { cast: false });          // floor
  for (const [w, h, d, x, y, z] of [[0.16, H, D, -W / 2, H / 2, 0], [0.16, H, D, W / 2, H / 2, 0], [W, H, 0.16, 0, H / 2, -D / 2], [W, H, 0.16, 0, H / 2, D / 2]]) {
    add(tbox(w, h, d, 1.6), M2.timber, x, y, z, CABIN, { cast: false });
    // raised frame ribs
  }
  add(tbox(W, 0.16, D, 1.6), M2.timber, 0, H, 0, CABIN, { cast: false });          // ceiling
  // hull curvature inside: sloped panels on the two long walls
  for (const s of [-1, 1]) { const p = add(tbox(0.12, 1.1, D, 1.4), M2.timber, s * (W / 2 - 0.34), 0.55, 0, CABIN, { cast: false }); p.rotation.z = s * 0.25; }
  // stern windows (bright, no fog: they read as daylight)
  for (const z of [-1.5, 0, 1.5]) {
    add(box(0.06, 0.85, 0.95), M2.win, -W / 2 + 0.1, 1.62, z, CABIN, { cast: false });
    add(tbox(0.1, 1.0, 0.1, 1), M2.timber, -W / 2 + 0.16, 1.62, z - 0.5, CABIN, { cast: false });
    add(tbox(0.1, 1.0, 0.1, 1), M2.timber, -W / 2 + 0.16, 1.62, z + 0.5, CABIN, { cast: false });
    add(tbox(0.1, 0.1, 1.06, 1), M2.timber, -W / 2 + 0.16, 2.12, z, CABIN, { cast: false });
    add(tbox(0.1, 0.1, 1.06, 1), M2.timber, -W / 2 + 0.16, 1.12, z, CABIN, { cast: false });
  }
  // table with the logbook, chair pushed back, a lamp, a cup
  add(tbox(2.1, 0.1, 1.25, 1), M2.deck, 0.4, 0.78, -0.4, CABIN);
  for (const [x, z] of [[-0.5, -0.92], [1.3, -0.92], [-0.5, 0.12], [1.3, 0.12]]) add(tbox(0.1, 0.78, 0.1, 1), M2.timber, x, 0.4, z, CABIN);
  const log = add(tbox(0.62, 0.07, 0.85, 0.6), M2.paper, 0.5, 0.86, -0.42, CABIN); log.rotation.y = 0.22;
  const log2 = add(tbox(0.6, 0.06, 0.82, 0.6), M2.paper, 0.44, 0.9, -0.46, CABIN); log2.rotation.y = 0.16; log2.rotation.z = 0.03;
  add(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 8), toon({ color: '#d8d2c4' }), 1.15, 0.98, -0.8, CABIN);   // ink pot
  add(new THREE.CylinderGeometry(0.05, 0.045, 0.16, 8), toon({ color: '#cfd6d8' }), -0.25, 0.9, -0.25, CABIN); // cup
  // chair, shoved back and turned
  const ch = new THREE.Group(); ch.position.set(0.2, 0, 0.72); ch.rotation.y = 0.5; CABIN.add(ch);
  add(tbox(0.62, 0.08, 0.58, 1), M2.deck, 0, 0.46, 0, ch);
  add(tbox(0.62, 0.7, 0.08, 1), M2.deck, 0, 0.82, -0.26, ch);
  for (const [x, z] of [[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.24], [0.25, 0.24]]) add(tbox(0.07, 0.46, 0.07, 1), M2.timber, x, 0.23, z, ch);
  // hanging lamp over the table
  const lamp = new THREE.Group(); lamp.position.set(0.4, 2.05, -0.4); CABIN.add(lamp);
  add(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4), M2.iron, 0, 0.24, 0, lamp);
  add(new THREE.SphereGeometry(0.16, 12, 10), M2.glass, 0, 0, 0, lamp, { cast: false });
  add(new THREE.CylinderGeometry(0.06, 0.1, 0.1, 8), M2.brass2, 0, 0.18, 0, lamp);
  add(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 10), M2.brass2, 0, -0.17, 0, lamp);
  // shelves and a chest for texture
  add(tbox(1.8, 0.08, 0.42, 1), M2.deck, 2.4, 1.5, -2.3, CABIN);
  for (let i = 0; i < 5; i++) add(tbox(0.16, 0.3, 0.3, 1), toon({ color: ['#7a3b34', '#3c5a48', '#6b5a3a', '#43506b', '#5b4a63'][i] }), 1.7 + i * 0.3, 1.69, -2.3, CABIN);
  add(tbox(1.6, 0.7, 0.9, 1), M2.timber, 2.6, 0.35, 1.5, CABIN);
  // cabin door ajar
  const door = add(tbox(0.1, 1.9, 0.9, 1), M2.timber, 3.45, 0.95, 0.6, CABIN); door.rotation.y = 0.5;
}

// ---------------- hold (set C) ----------------
{
  const W = 7.6, D = 9.0, H = 3.0;
  add(tbox(W, 0.12, D, 1.4), M2.timber, 0, 0.06, 0, HOLD, { cast: false });
  for (const [w, h, d, x, y, z] of [[0.2, H, D, -W / 2, H / 2, 0], [0.2, H, D, W / 2, H / 2, 0], [W, H, 0.2, 0, H / 2, -D / 2], [W, H, 0.2, 0, H / 2, D / 2]]) add(tbox(w, h, d, 1.6), M2.timber, x, y, z, HOLD, { cast: false });
  for (const z of [-3, 0, 3]) add(tbox(W - 0.4, 0.22, 0.24, 1.4), M2.timber, 0, 2.2, z, HOLD, { cast: false });   // deck beams
  // barrels: three rows, laid upright, filling the hold
  const rb = P.rng(77);
  for (let row = 0; row < 4; row++) for (let i = 0; i < 5; i++) {
    const x = -2.9 + i * 1.45, z = -3.6 + row * 1.8 + (rb() - 0.5) * 0.2, h = 0.95 + rb() * 0.15;
    const b = add(new THREE.CylinderGeometry(0.56, 0.56, h, 14), M2.barrel, x, h / 2, z, HOLD);
    for (const k of [-0.32, 0.32]) { const hoop = add(new THREE.TorusGeometry(0.575, 0.035, 6, 16), M2.iron, x, h / 2 + k * h, z, HOLD); hoop.rotation.x = Math.PI / 2; }
    const top = add(new THREE.CylinderGeometry(0.52, 0.52, 0.04, 14), M2.barrelTop, x, h + 0.02, z, HOLD, { cast: false });
  }
  // a hanging lantern
  const lg = new THREE.Group(); lg.position.set(0.6, 2.2, 1.2); HOLD.add(lg);
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), M2.iron, 0, 0.3, 0, lg);
  add(new THREE.BoxGeometry(0.2, 0.26, 0.2), M2.glass, 0, 0.02, 0, lg, { cast: false });
  add(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 8), M2.iron, 0, 0.16, 0, lg);
  // crates and a coil of rope
  add(tbox(1.0, 0.8, 0.9, 1), M2.deck, -2.6, 0.4, 3.6, HOLD);
  add(tbox(0.8, 0.6, 0.7, 1), M2.deck, -2.7, 1.1, 3.5, HOLD);
  const coil = add(new THREE.TorusGeometry(0.42, 0.11, 8, 16), M2.rope, 2.2, 0.14, 3.7, HOLD); coil.rotation.x = Math.PI / 2;
}

// ---------- cards ----------
const CW = 1200, CH = 2000, CM = 2.25; // canvas px, card height in metres (design 600x1000 -> 2.25 m)
const cardGeo = new THREE.PlaneGeometry(CM * 0.6, CM); cardGeo.translate(0, CM / 2 - CM * 0.025, 0);
const blobTex = P.tex(P.radial('20,14,30', 0.6));
class Card {
  constructor(scale = 1) {
    [this.c, this.g] = (() => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return [c, c.getContext('2d')]; })();
    this.t = new THREE.CanvasTexture(this.c); this.t.colorSpace = THREE.SRGBColorSpace; this.t.anisotropy = 4;
    this.mat = new THREE.MeshBasicMaterial({ map: this.t, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide, fog: true });
    this.mesh = new THREE.Mesh(cardGeo, this.mat); this.mesh.userData.nd = cardNd(this.t); this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.t, alphaTest: 0.5 });
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: true }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.userData.ndSkip = true; this.blob.renderOrder = 1;
    scene.add(this.mesh); scene.add(this.blob); this.key = ''; this.mesh.visible = this.blob.visible = false;
  }
  draw(key, fn) {
    if (key === this.key) return; this.key = key;
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CW, CH); g.setTransform(CW / 600, 0, 0, CH / 1000, 0, 0);
    const p = new T.Pen(g); fn(p); this.t.needsUpdate = true;
  }
}
const cards = []; const getCard = (i) => cards[i] || (cards[i] = new Card());

// ---------- render targets & post ----------
const rtColor = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const rtNd = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const rtInk = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsGeo = new THREE.PlaneGeometry(2, 2);
const fs = (mat) => { const s = new THREE.Scene(); s.add(new THREE.Mesh(fsGeo, mat)); return s; };
const inkU = { col: { value: rtColor.texture }, nd: { value: rtNd.texture }, res: { value: new THREE.Vector2(W, H) }, px: { value: 1.6 }, fogCol: { value: new THREE.Color() },
  sat: { value: 1.08 }, lift: { value: new THREE.Color(0, 0, 0) }, gain: { value: new THREE.Color(1, 1, 1) }, vig: { value: 0.22 }, flash: { value: 0 } };
const inkScene = fs(new THREE.ShaderMaterial({ uniforms: inkU, vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `uniform sampler2D col, nd; uniform vec2 res; uniform float px, sat, vig, flash; uniform vec3 fogCol, lift, gain; varying vec2 vUv;
  float edgeAt(vec2 uv, float r){
    vec4 c = texture2D(nd, uv); if (dot(c.rgb,c.rgb) < .01) return 0.; float d = c.a; vec3 n = c.rgb*2.-1.;
    float e = 0.; float rr = r * clamp(7./d, .62, 1.25);
    for (int i=0;i<16;i++){ float a = float(i)*.785398 + (i>7 ? .39 : 0.); float k = i>7 ? .5 : 1.;
      vec2 o = vec2(cos(a), sin(a))*rr*k/res; vec4 s = texture2D(nd, uv+o);
      float ds = s.a; bool card = dot(s.rgb,s.rgb) < .01;
      if (card && ds > 0.) continue;            // character cards: never outlined by the world ink
      if (card) ds = 1e4;                        // sky
      vec3 ns = s.rgb*2.-1.;
      e = max(e, smoothstep(.006, .02, (ds - d)/d));                           // depth jump, near side only
      if (!card && abs(ds-d)/d < .06) e = max(e, smoothstep(.88, .72, dot(n, ns)) * .9); // crease
    }
    return e * (1. - smoothstep(30., 130., d)); // far detail: no ink, or the sea's far edge draws a bar across the horizon
  }
  void main(){
    vec3 c = texture2D(col, vUv).rgb;
    float e = edgeAt(vUv, px);
    c = mix(c, vec3(.012,.01,.014), e);
    if (flash < -0.5) c = vec3(e);
    float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, sat);
    c = c*gain + lift;
    vec2 q = vUv-.5; c *= 1. - vig*dot(q*vec2(1.,.75), q*vec2(1.,.75))*2.2;
    c = mix(c, vec3(1.), flash);
    gl_FragColor = vec4(c,1.); }` }));
const dofU = { src: { value: rtInk.texture }, nd: { value: rtNd.texture }, res: { value: new THREE.Vector2(W, H) }, focus: { value: 5 }, cinf: { value: 0 }, near: { value: 1 } };
const dofScene = fs(new THREE.ShaderMaterial({ uniforms: dofU, vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `uniform sampler2D src, nd; uniform vec2 res; uniform float focus, cinf, near; varying vec2 vUv;
  float coc(vec2 uv){ float d = texture2D(nd, uv).a; if (d <= 0.) d = 2000.; float k = 1. - focus/d; return k > 0. ? cinf*k : min(-k*cinf*near, cinf*1.4); }
  void main(){
    float c0 = coc(vUv);
    if (cinf < .5 || c0 < .6) { gl_FragColor = linearToOutputTexel(vec4(texture2D(src, vUv).rgb, 1.)); return; }
    vec3 acc = vec3(0.); float wsum = 0.;
    for (int i=0;i<48;i++){ float fi = float(i); float r = sqrt((fi+.5)/48.); float a = fi*2.39996;
      vec2 o = vec2(cos(a), sin(a))*r*c0/res; float cs = coc(vUv+o);
      float w = smoothstep(r*c0-1.5, r*c0+.5, cs + .5);
      acc += texture2D(src, vUv+o).rgb*w; wsum += w; }
    gl_FragColor = linearToOutputTexel(vec4(acc/max(wsum,1e-3), 1.)); }` }));
// final copy with sRGB handled by the renderer output (we render to screen with linear->sRGB in the shader chunk)
dofScene.children[0].material.toneMapped = false;

// ---------- per-frame state ----------
const tmpV = new THREE.Vector3();
function applyLight(L, f) {
  hemi.color.set(L.sky); hemi.groundColor.set(L.ground); hemi.intensity = L.hemi;
  sun.color.set(L.sun); sun.intensity = L.sunI;
  scene.fog.color.set(L.fog); scene.fog.near = L.fogNear; scene.fog.far = L.fogFar;
  skyU.top.value.set(L.skyTop); skyU.hor.value.set(L.skyHor); skyU.sunCol.value.set(L.sunDisc || '#000'); skyU.sunSize.value = L.sunSize || 0;
  inkU.sat.value = L.sat; inkU.gain.value.set(L.gain || '#ffffff'); inkU.lift.value.set(L.lift || '#000000');
  seaU.deep.value.set(L.waterDeep);
  seaU.mid.value.set(L.waterShal);
  seaU.crest.value.set(L.glint);
  seaU.foam.value.set(L.glint && L.light === 'night' ? '#8fa8c0' : '#eef7fa');
}
function placeSun(L, focus) {
  // sun direction from azimuth/elevation in world space
  const az = rx(L.az), el = rx(L.el); tmpV.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  skyU.sunDir.value.copy(tmpV);
  sun.position.copy(focus).addScaledVector(tmpV, 80); sun.target.position.copy(focus);
  const ext = L.shadowExt || 30, sc = sun.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 200; sc.updateProjectionMatrix();
}

function worldState(W_, f) {
  const S = shotAt(f), t = f / 30;
  SEA.visible = S.set === 'sea';
  CABIN.visible = S.set === 'cabin';
  HOLD.visible = S.set === 'hold';
  seaU.t.value = t;
  // the ship rolls gently; the rescuer rolls the other way
  if (SEA.visible) {
    ship.rotation.z = Math.sin(t * 0.62) * 0.014 + Math.sin(t * 1.31 + 1) * 0.006;
    ship.position.y = Math.sin(t * 0.72) * 0.06 - 0.04;
    dg.rotation.z = Math.sin(t * 0.55 + 2.1) * 0.02;
    dg.position.y = Math.sin(t * 0.61 + 0.7) * 0.09 - 0.05;
    const rb = dg.userData.boat;
    rb.position.y = 0.35 + Math.sin(t * 1.7) * 0.07;
    rb.rotation.z = Math.sin(t * 1.3) * 0.05;
    openBoat.visible = S.id === 'boat';   // only in the beat she belongs to
    lostOar.visible = S.id === 'lost';    // the last thing left on the water
    lostOar.position.y = 0.05 + Math.sin(t * 0.9) * 0.03;
    lostOar.rotation.z = Math.sin(t * 0.75 + 0.5) * 0.05;
    openBoat.position.x = 8.6 + (S.id === 'boat' ? (f - 731) * 0.004 : 0);
    openBoat.position.z = 13.2;
    openBoat.position.y = Math.sin(t * 1.05 + 0.4) * 0.14 - 0.05;
    openBoat.rotation.z = Math.sin(t * 0.85) * 0.05;
    openBoat.rotation.x = Math.sin(t * 0.63 + 1) * 0.03;
    // sails breathe a little
    sails.forEach((m, i) => { m.rotation.x = Math.sin(t * 0.9 + i) * 0.012; });
    // the lifeboat leaves its davits in the "only the lifeboat was missing" beat
    const gone = W_.boatGone ?? 0;
    lifeboat.visible = gone < 0.99;
    lifeboat.position.y = DK + 1.1 - gone * 2.4;
    lifeboat.position.z = 3.9 + gone * 1.2;
    lifeboat.rotation.z = gone * 0.5;
  }
}

function drawActors(list, cam, OFF = [0, 0, 0]) {
  cards.forEach((c) => { c.mesh.visible = c.blob.visible = false; });
  list.forEach((a, i) => {
    const c = getCard(i);
    c.draw(a.key, a.draw);
    c.mesh.visible = true; c.mesh.position.set(a.x + OFF[0], a.y + OFF[1], a.z + OFF[2]);
    const s = a.s || 1; c.mesh.scale.set(s * (a.flip ? -1 : 1), s, s);
    c.mesh.rotation.set(0, Math.atan2(cam.position.x - a.x - OFF[0], cam.position.z - a.z - OFF[2]) + (a.yaw || 0), a.roll || 0);
    c.mat.color.set(a.tint || '#ffffff'); c.mat.opacity = a.alpha ?? 1;
    c.mesh.castShadow = a.shadow !== false;
    c.mesh.renderOrder = a.order || 2;
    if (a.blob !== false) { c.blob.visible = true; c.blob.position.set(a.x + OFF[0], (a.ground ?? a.y) + 0.02, a.z + OFF[2]); c.blob.scale.set(0.95 * s, 0.6 * s, 1); }
  });
}

const helmetState = (h) => {
  helmet.visible = !!h; if (!h) return;
  helmet.position.set(h.x, h.y, h.z); helmet.rotation.set(h.rx || 0, h.ry || 0, h.rz || 0); helmet.scale.setScalar(h.s || 0.17);
};

const swapForNd = (on) => {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (on) {
      o.userData.mat0 = o.material;
      if (o.userData.ndSkip) { o.userData.vis0 = o.visible; o.visible = false; return; }
      if (o === sky || o.userData.sky) { o.userData.vis0 = o.visible; o.visible = false; return; }
      o.material = o.userData.nd || ndMat;
    } else {
      o.material = o.userData.mat0; if (o.userData.vis0 !== undefined) { o.visible = o.userData.vis0; delete o.userData.vis0; }
    }
  });
};

window.renderFrame = (f) => {
  const S = shotAt(f), L = lightFor(S, f), C = camAt(f);
  const OFF = SET_OFF[S.set] || [0, 0, 0];
  C.pos = [C.pos[0] + OFF[0], C.pos[1] + OFF[1], C.pos[2] + OFF[2]];
  C.look = [C.look[0] + OFF[0], C.look[1] + OFF[1], C.look[2] + OFF[2]];
  applyLight(L, f);
  camera.position.set(...C.pos); camera.up.set(0, 1, 0); camera.lookAt(...C.look); camera.rotateZ(rx(C.roll || 0));
  camera.fov = C.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const W_ = worldAt(f); worldState(W_, f);
  placeSun(L, new THREE.Vector3(...(C.shadowAt || C.look)));
  drawActors([...actorsAt(f, T), ...fxAt(f, T)], camera, OFF);
  sky.position.copy(camera.position);
  // pass A: colour
  renderer.setRenderTarget(rtColor); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
  // pass B: normal + depth
  const fog = scene.fog; scene.fog = null; const sm = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false; renderer.shadowMap.autoUpdate = false;
  swapForNd(true); renderer.setRenderTarget(rtNd); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera); swapForNd(false);
  scene.fog = fog; renderer.shadowMap.enabled = sm; renderer.shadowMap.autoUpdate = true;
  if (window.DEBUG_ND) { const dm = new THREE.MeshBasicMaterial({ map: rtNd.texture }); const ds = fs(dm); renderer.setRenderTarget(null); renderer.render(ds, fsCam); return true; }
  // ink + grade
  const D = dofAt(f);
  inkU.px.value = 2.5; inkU.flash.value = window.DEBUG_E ? -1 : (C.flash || 0); inkU.vig.value = L.vig ?? 0.22;
  renderer.setRenderTarget(rtInk); renderer.render(inkScene, fsCam);
  // lens
  dofU.focus.value = D.focus; dofU.cinf.value = D.cinf; dofU.near.value = D.near ?? 1;
  renderer.setRenderTarget(null); renderer.render(dofScene, fsCam);
  return true;
};
window.TOTAL = TOTAL;
window.ready = true;
