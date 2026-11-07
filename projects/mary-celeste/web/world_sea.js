// ---------- world ----------
// Sets: A the open Atlantic (Mary Celeste), B the captain's cabin, C the hold, D New York harbour.
// Each set is its own group, parked far from the others and switched on per shot in worldState().
const SEA = new THREE.Group(); scene.add(SEA);
const CABIN = new THREE.Group(); CABIN.position.set(420, 0, 0); scene.add(CABIN);
const HOLD = new THREE.Group(); HOLD.position.set(820, 0, 0); scene.add(HOLD);
const HARB = new THREE.Group(); HARB.position.set(0, 0, -520); scene.add(HARB);

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
      vec2 p = vW.xz*0.06;
      float swell = noise(p + vec2(t*0.06, -t*0.035)) * 0.6 + noise(p*2.7 + 11. + vec2(-t*0.1, t*0.05)) * 0.4;
      float ripple = noise(vW.xz*0.5 + vec2(t*0.35, -t*0.2));
      vec3 c = mix(deep, mid, smoothstep(0.25, 0.85, swell));
      c = mix(c, crest, smoothstep(0.72, 0.96, swell) * 0.65);
      // long glints on the swell faces
      float glint = smoothstep(0.62, 0.72, ripple) * smoothstep(0.45, 0.9, swell);
      c = mix(c, foam, glint * 0.5);
      // distance: haze toward the horizon so the water meets the sky
      c = mix(c, vec3(0.66,0.76,0.84), smoothstep(120., 780., camD) * 0.85);
      gl_FragColor = vec4(c,1.);
      #include <fog_fragment>
    }`,
});
const sea = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600, 1, 1), seaMat);
sea.rotation.x = -Math.PI / 2; sea.userData.nd = waterNd; sea.receiveShadow = false; SEA.add(sea);

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
    const sh = new THREE.Shape();
    sh.moveTo(edge[0][0], DK); edge.forEach(([x, w]) => sh.lineTo(x, DK + 1.05 - Math.abs(x) * 0.012));
    [...edge].reverse().forEach(([x, w]) => sh.lineTo(x, DK));
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false });
    const m = add(g, M2.paint, 0, 0, sgn * 0.2, ship);
    m.position.z = 0; m.scale.z = 1; m.rotation.y = 0;
    m.position.set(0, 0, sgn > 0 ? edge[Math.floor(edge.length / 2)][1] - 0.15 : -(edge[Math.floor(edge.length / 2)][1] - 0.15));
    m.userData.bulwark = sgn;
    // taper the wall to follow the hull: approximate by scaling z per segment via a custom mesh
    ship.remove(m);
    // build as a ribbon of quads along the edge instead (so it hugs the curve)
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
for (const s of [-1, 1]) {   // davits
  const d = add(new THREE.TorusGeometry(0.55, 0.07, 6, 12, Math.PI * 0.62), M2.iron, 6.0, DK + 1.05, s * 4.3, ship);
  d.rotation.set(0, Math.PI / 2, 0);
}
// the ship's own boat hanging out over the water on the far side, for a later be-attentioned shot: not needed
// stern name board
{ const g = new THREE.Group(); g.position.set(-15.3, DK - 0.6, 0); ship.add(g);
  const board = add(tbox(0.12, 0.9, 2.4, 1), M2.paint, 0, 0, 0, g);
  add(tbox(0.14, 0.14, 2.1, 1), M2.brass2, 0.03, 0.3, 0, g); add(tbox(0.14, 0.14, 2.1, 1), M2.brass2, 0.03, -0.3, 0, g);
}

// ---------------- the Dei Gratia (rescuer) ----------------
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
  // her rowboat, coming across
  const rb = new THREE.Group(); rb.position.set(2.0, 0.35, -12.0); dg.add(rb);
  add(loftHull([{ x: -1.8, w: 0.3, yd: 0.55, yb: 0.3 }, { x: -1.0, w: 0.62, yd: 0.6, yb: 0.1 }, { x: 0.6, w: 0.66, yd: 0.6, yb: 0.08 }, { x: 1.8, w: 0.34, yd: 0.56, yb: 0.3 }], 10), M2.sailDim, 0, 0, 0, rb);
  for (const x of [-1.0, 0.5]) add(tbox(1.0, 0.07, 1.2, 1), M2.rope, x, 0.48, 0, rb);
  for (const s of [-1, 1]) { const o = add(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), M2.rope, 0, 0.55, s * 0.75, rb); o.rotation.z = Math.PI / 2 + s * 0.25; o.rotation.x = s * 0.2; }
  dg.userData.boat = rb;
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

// ---------------- harbour (set D): New York, a month earlier ----------------
{
  // pier
  add(tbox(26, 0.5, 5.2, 1), M2.deck, 0, 1.6, 7.4, HARB);
  for (let i = 0; i < 12; i++) { const p = add(new THREE.CylinderGeometry(0.22, 0.26, 2.4, 8), M2.timber, -12 + i * 2.4, 0.6, 9.6, HARB); }
  // warehouses along the quay
  const r = P.rng(92);
  for (let i = 0; i < 7; i++) {
    const w = 5 + r() * 4, h = 5 + r() * 4, d = 6 + r() * 4, x = -22 + i * 8.5, z = 16 + r() * 4;
    add(tbox(w, h, d, 2.4), i % 2 ? M.plaster : M2.timber, x, h / 2 + 1.4, z, HARB);
    const rf = add(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.4, 2.0, 4), M.roof, x, h + 2.4, z, HARB); rf.rotation.y = Math.PI / 4; rf.scale.set(w / Math.hypot(w, d) * 1.41, 1, d / Math.hypot(w, d) * 1.41);
    for (let k = 0; k < 2; k++) add(box(0.8, 0.9, 0.08), M.window, x - w * 0.25 + k * w * 0.4, h * 0.72 + 1.4, z - d / 2 - 0.05, HARB, { cast: false });
  }
  // the fort on the point, with a flag
  const fg = new THREE.Group(); fg.position.set(-30, 0, -14); HARB.add(fg);
  add(tbox(14, 4.2, 14, 3), M.stone, 0, 3.6, 0, fg);
  for (let i = 0; i < 5; i++) add(tbox(1.4, 0.7, 1.4, 1.6), M.stone, -6 + i * 3, 6.1, 6.4, fg);
  add(new THREE.CylinderGeometry(0.12, 0.12, 9, 6), M.rope, 0, 9, 0, fg);
  const flag = add(new THREE.PlaneGeometry(2.2, 1.3, 6, 3), new THREE.MeshToonMaterial({ gradientMap: grad, color: '#c0392b', side: THREE.DoubleSide }), 1.1, 13.0, 0, fg, { cast: false });
  flag.userData.flag = true; flag.userData.base = flag.geometry.attributes.position.array.slice();
  // a couple of other hulls at anchor
  for (const [x, z, s] of [[16, 30, 0.8], [-14, 40, 0.9], [30, 52, 0.7]]) {
    const st = [{ x: -8, w: 1.8, yd: 3.0, yb: 1.2 }, { x: -4, w: 2.4, yd: 3.0, yb: 0.3 }, { x: 4, w: 2.2, yd: 3.0, yb: 0.4 }, { x: 8, w: 0.8, yd: 3.0, yb: 1.8 }];
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); HARB.add(g);
    add(loftHull(st), M2.hull, 0, 0, 0, g);
    add(new THREE.CylinderGeometry(0.12, 0.2, 12, 6), M2.rope, 0, 9, 0, g);
  }
}
// the same ship at the pier for the harbour flashback (a second, static copy)
const harbourShip = new THREE.Group(); harbourShip.position.set(4, 0, 4.0); HARB.add(harbourShip);
{
  add(loftHull(stations), M2.hull, 0, 0, 0, harbourShip);
  const g = new THREE.ExtrudeGeometry(deckShape(stations, 0.97), { depth: 0.22, bevelEnabled: false });
  g.rotateX(Math.PI / 2); g.translate(0, DK, 0); add(g, M2.deck, 0, 0, 0, harbourShip, { cast: false });
  add(new THREE.CylinderGeometry(0.16, 0.24, 19.5, 8), M2.rope, -2.2, DK + 9.7, 0, harbourShip);
  add(new THREE.CylinderGeometry(0.16, 0.24, 17.5, 8), M2.rope, 9.4, DK + 8.7, 0, harbourShip);
  add(tbox(4.2, 1.0, 2.6, 1.2), M2.deck, -4.6, DK + 0.5, 0, harbourShip);
  add(tbox(4.6, 0.22, 3.0, 1.2), M2.ochre, -4.6, DK + 1.1, 0, harbourShip);
}
