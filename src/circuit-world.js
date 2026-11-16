import * as THREE from "three";
import {createWheelRig,spinWheel} from "./wheel-rig.js";
import {kerbGeometry} from "./kerbs.js";
import {guardrailGeometry,GUARDRAIL_OFFSET} from "./guardrail.js";
import {RACE_ACTIVITIES} from "./race-activities.js";

function noiseTexture(grass = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d"),
    d = ctx.createImageData(128, 128);
  let seed = 8172;
  for (let i = 0; i < d.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = (seed / 4294967296 - 0.5) * 30;
    d.data[i] = (grass ? 83 : 66) + n;
    d.data[i + 1] = (grass ? 102 : 69) + n;
    d.data[i + 2] = (grass ? 61 : 72) + n;
    d.data[i + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(grass ? 80 : 5, grass ? 80 : 180);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function physical(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.32,
    metalness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    ...extra,
  });
}
function meshBox(parent, w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function hull(sections, material) {
  const shapeCurve = new THREE.CatmullRomCurve3(
    sections.map(([z, w, base, top]) => new THREE.Vector3(z, w, top)),
    false,
    "centripetal",
  );
  const floorCurve = new THREE.CatmullRomCurve3(
    sections.map(([z, w, base]) => new THREE.Vector3(z, base, 0)),
    false,
    "centripetal",
  );
  const positions = [],
    indices = [],
    count = 12,
    rings = 32;
  for (let j = 0; j <= rings; j++) {
    const t = j / rings,
      p = shapeCurve.getPoint(t),
      base = floorCurve.getPoint(t).y,
      w = p.y,
      h = Math.max(0.04, p.z - base);
    for (const [x, y] of [
      [-0.96, 0.04],
      [-1, 0.2],
      [-1, 0.72],
      [-0.94, 0.93],
      [-0.72, 1],
      [0.72, 1],
      [0.94, 0.93],
      [1, 0.72],
      [1, 0.2],
      [0.96, 0.04],
      [0.72, 0],
      [-0.72, 0],
    ])
      positions.push(x * w, base + y * h, p.x);
  }
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < count; i++) {
      const a = j * count + i,
        b = j * count + ((i + 1) % count),
        c = b + count,
        d = a + count;
      indices.push(a, d, b, b, d, c);
    }
  for (let i = 1; i < count - 1; i++) {
    indices.push(0, i, i + 1);
    const a = rings * count;
    indices.push(a, a + i + 1, a + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export function sportsCar(color = "#d8412b", type = 0, style = {}) {
  const g = new THREE.Group(),
    paint = physical(color, { roughness: 0.24, metalness: 0.22 }),
    black = physical("#12171b", { roughness: 0.65, metalness: 0.1 }),
    metal = physical("#bcc3c6", { roughness: 0.2, metalness: 0.9 }),
    glass = physical("#142b39", { roughness: 0.09, metalness: 0.32 });
  const brakeLights = [];
  g.add(
    hull(
      [
        [-2.2, 0.78, 0.32, 0.6],
        [-1.7, 1, 0.28, 0.76],
        [0.9, 1, 0.28, 0.72],
        [1.85, 0.94, 0.32, 0.55],
        [2.2, 0.79, 0.36, 0.48],
      ],
      paint,
    ),
  );
  g.add(
    hull(
      [
        [-1.4, 0.78, 0.65, 0.72],
        [-0.65, 0.73, 0.68, 1.3],
        [0.35, 0.7, 0.68, 1.3],
        [1.05, 0.74, 0.65, 0.72],
      ],
      glass,
    ),
  );
  meshBox(g, 1.32, 0.05, 0.88, paint, 0, 1.3, -0.2);
  meshBox(g, 0.06, 0.64, 0.06, paint, -0.73, 1, -0.65);
  meshBox(g, 0.06, 0.64, 0.06, paint, 0.73, 1, -0.65);
  meshBox(g, 1.75, 0.18, 0.12, black, 0, 0.4, 2.18);
  meshBox(g, 1.8, 0.12, 0.15, black, 0, 0.32, -2.14);
  for (const x of [-0.65, 0.65]) {
    meshBox(
      g,
      0.46,
      0.075,
      0.08,
      physical("#f0f5ff", { emissive: "#b5d8ff", emissiveIntensity: 1.5 }),
      x,
      0.58,
      2.05,
    );
    const tail = meshBox(
      g,
      0.48,
      0.065,
      0.08,
      physical("#bc1717", { emissive: "#e51818", emissiveIntensity: 1.2 }),
      x,
      0.62,
      -2.2,
    );
    brakeLights.push(tail.material);
    meshBox(g, 0.2, 0.14, 0.35, paint, x * 1.5, 1.04, 0.35);
  }
  const wheels = [];
  for (const x of [-1.01, 1.01])
    for (const z of [-1.37, 1.35]) {
      const pivot=createWheelRig(x,z);
      const wheel=pivot.userData.rotor;
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.43, 0.43, 0.28, 32),
        black,
      );
      tire.rotation.z = Math.PI / 2;
      wheel.add(tire);
      const sidewall = new THREE.Mesh(
        new THREE.TorusGeometry(0.335, 0.095, 10, 40),
        black,
      );
      sidewall.rotation.y = Math.PI / 2;
      wheel.add(sidewall);
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.29, 0.29, 0.31, 24),
        style.wheels ? physical(style.wheels, { metalness: 0.7 }) : metal,
      );
      rim.rotation.z = Math.PI / 2;
      wheel.add(rim);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.34, 16),
        black,
      );
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      for (let i = 0; i < 5; i++) {
        const spoke = meshBox(wheel, 0.325, 0.035, 0.48, black);
        spoke.rotation.x = (i * Math.PI) / 5;
      }
      g.add(pivot);
      const marker = meshBox(
        wheel,
        0.012,
        0.045,
        0.12,
        physical("#d4d6cf", { roughness: 0.7, metalness: 0 }),
        x > 0 ? 0.18 : -0.18,
        0.32,
        0,
      );
      wheels.push(pivot);
    }
  meshBox(g, 1.9, 0.07, 0.36, black, 0, 1.04, -1.92);
  for (const x of [-0.65, 0.65])
    meshBox(g, 0.07, 0.38, 0.12, black, x, 0.86, -1.9);
  if (type % 2 === 1)
    meshBox(g, 0.16, 0.025, 1.2, physical("#f7f7f3"), 0, 0.78, 1.25);
  const numberCanvas = document.createElement("canvas");
  numberCanvas.width = numberCanvas.height = 128;
  const nc = numberCanvas.getContext("2d");
  nc.fillStyle = "#eaece8";
  nc.fillRect(0, 0, 128, 128);
  nc.fillStyle = "#15222c";
  nc.font = "bold 85px Arial";
  nc.textAlign = "center";
  nc.fillText(style.number || "07", 64, 95);
  const nt = new THREE.CanvasTexture(numberCanvas);
  nt.colorSpace = THREE.SRGBColorSpace;
  for (const side of [-1, 1]) {
    const number = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.44),
      new THREE.MeshStandardMaterial({ map: nt, roughness: 0.5 }),
    );
    number.material.polygonOffset=true;number.material.polygonOffsetFactor=-1;number.material.polygonOffsetUnits=-1;
    number.position.set(side * 1.01, 0.53, -0.1);
    number.rotation.y = (side * Math.PI) / 2;
    g.add(number);
  }
  g.userData.wheels = wheels;
  g.userData.brakeLights = brakeLights;
  if (style.spoiler) meshBox(g, 2, 0.08, 0.48, paint, 0, 1.36, -1.92);
  if (style.sticker)
    meshBox(g, 0.26, 0.03, 0.7, physical("#f6f5e9"), 0, 0.82, -1.6);
  return g;
}
function ribbon(curve, offset, width, material, steps = 700, height = 0.02) {
  const p = [],
    uv = [],
    indices = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      c = curve.getPointAt(t === 1 ? 0 : t),
      f = curve.getTangentAt(t === 1 ? 0 : t),
      r = new THREE.Vector3(-f.z, 0, f.x).normalize();
    for (const sign of [-1, 1]) {
      const v = c.clone().addScaledVector(r, offset + (sign * width) / 2);
      p.push(v.x, v.y + height, v.z);
      uv.push(sign === -1 ? 0 : 1, t);
    }
    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  for (let i = 0; i < indices.length; i += 3)
    [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  return m;
}
export function createCircuitWorld(
  scene,
  camera,
  renderer,
  color,
  type,
  style = {},
) {
  const root = new THREE.Group();
  scene.add(root);
  const curve = new THREE.CatmullRomCurve3(
      [
        [0, 0, 0],
        [0, 0, 100],
        [-45, 0, 165],
        [-110, 0, 145],
        [-145, 0, 215],
        [-240, 0, 245],
        [-330, 0, 190],
        [-350, 0, 95],
        [-290, 0, 30],
        [-340, 0, -55],
        [-300, 0, -160],
        [-210, 0, -205],
        [-155, 0, -135],
        [-80, 0, -200],
        [5, 0, -150],
        [65, 0, -80],
        [40, 0, -25],
      ].map((p) => new THREE.Vector3(...p)),
      true,
      "catmullrom",
      0.5,
    ),
    length = curve.getLength();
  const asphalt = noiseTexture(),
    grass = noiseTexture(true),
    surface = new THREE.MeshStandardMaterial({
      map: asphalt,
      roughness: 0.96,
      metalness: 0.03,
    }),
    white = new THREE.MeshStandardMaterial({
      color: "#dddcd3",
      roughness: 0.9,
    }),
    red = new THREE.MeshStandardMaterial({ color: "#ad372f", roughness: 0.9 }),
    steel = new THREE.MeshStandardMaterial({
      color: "#929b9c",
      metalness: 0.7,
      roughness: 0.4,
    });
  asphalt.anisotropy=grass.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  camera.near=.35;camera.far=1000;camera.updateProjectionMatrix();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-90, -0.2, 20);
  ground.receiveShadow = true;
  root.add(ground);
  root.add(ribbon(curve, 0, 12, surface));
  const kerbMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9});
  for(const side of [-1,1]){
    const marking=ribbon(curve,side*5.65,.13,white,1200,.055);marking.material=white.clone();marking.material.polygonOffset=true;marking.material.polygonOffsetFactor=-1;marking.material.polygonOffsetUnits=-1;root.add(marking);
    const curb=new THREE.Mesh(kerbGeometry(curve,side),kerbMaterial);curb.receiveShadow=true;root.add(curb);
  }
  // Continuous curved panels: no long tangent boxes and no loose ends on bends.
  const railMaterial=new THREE.MeshStandardMaterial({color:'#a6afb3',metalness:.65,roughness:.34,side:THREE.DoubleSide});
  for(const side of [-1,1]){
    const rail=new THREE.Mesh(guardrailGeometry(curve,side),railMaterial);rail.castShadow=true;rail.receiveShadow=true;root.add(rail);
    root.add(ribbon(curve,side*GUARDRAIL_OFFSET,.12,steel,Math.ceil(length/1.2),1.035));
    const count=Math.ceil(length/7);
    const posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.13,.94,.13),steel,count),dummy=new THREE.Object3D();
    for(let n=0;n<count;n++){const p=curve.getPointAt(n/count),t=curve.getTangentAt(n/count),right=new THREE.Vector3(-t.z,0,t.x).normalize();p.addScaledVector(right,side*(GUARDRAIL_OFFSET+.12));dummy.position.copy(p);dummy.position.y+=.47;dummy.rotation.y=Math.atan2(t.x,t.z);dummy.updateMatrix();posts.setMatrixAt(n,dummy.matrix)}
    posts.castShadow=true;root.add(posts);
  }
  const rubber = new THREE.MeshStandardMaterial({
    color: "#171b1e",
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    roughness: 1,
  });
  root.add(
    ribbon(curve, -0.95, 0.3, rubber, 700, 0.035),
    ribbon(curve, 0.95, 0.3, rubber, 700, 0.035),
  );
  for (const t of [0.12, 0.36, 0.6, 0.85]) {
    for (let n = 0; n < 3; n++) {
      const at = (t - n * 0.025 + 1) % 1,
        p = curve.getPointAt(at),
        f = curve.getTangentAt(at),
        r = new THREE.Vector3(-f.z, 0, f.x);
      p.addScaledVector(r, 10.5);
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 96;
      const cc = c.getContext("2d");
      cc.fillStyle = "#eef0e9";
      cc.fillRect(0, 0, 128, 96);
      cc.fillStyle = "#1e2a31";
      cc.font = "bold 65px Arial";
      cc.textAlign = "center";
      cc.fillText(String((n + 1) * 50), 64, 73);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 1),
        new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }),
      );
      board.position.copy(p);
      board.position.y += 1.25;
      board.rotation.y = Math.atan2(f.x, f.z) + Math.PI;
      root.add(board);
      meshBox(root, 0.08, 1.2, 0.08, steel, p.x, p.y + 0.6, p.z);
    }
  }
  // Finish gantry and pit facilities, built at life-size proportions.
  const gantry = new THREE.Group();
  gantry.position.copy(curve.getPointAt(0));
  gantry.rotation.y = Math.atan2(
    curve.getTangentAt(0).x,
    curve.getTangentAt(0).z,
  );
  for (const x of [-7, 7]) meshBox(gantry, 0.3, 5, 0.35, steel, x, 2.5, 0);
  meshBox(
    gantry,
    14.5,
    1,
    0.45,
    new THREE.MeshStandardMaterial({ color: "#202c36" }),
    0,
    5,
    0,
  );
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#18252c";
  ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = "#f7f8f3";
  ctx.font = "bold 70px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ГОНОЧНЫЙ КУБОК", 512, 91);
  const banner = new THREE.CanvasTexture(canvas);
  banner.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(13.6, 0.85),
    new THREE.MeshBasicMaterial({ map: banner, side: THREE.DoubleSide }),
  );
  sign.position.set(0, 5, -0.24);
  sign.rotation.y = Math.PI;
  gantry.add(sign);
  root.add(gantry);
  for (let i = 0; i < 12; i++)
    meshBox(
      gantry,
      .9,
      .01,
      1.8,
      i % 2 ? white : new THREE.MeshStandardMaterial({ color: "#1a2024" }),
      -4.95 + i*.9,
      0.065,
      0,
    );
  const building = new THREE.MeshStandardMaterial({ color: "#b8bcbc" }),
    windows = physical("#47606e", { roughness: 0.25, metalness: 0.5 });
  meshBox(root, 10, 4, 40, building, -17, 2, 55);
  meshBox(root, 0.1, 1.8, 36, windows, -11.9, 2.7, 55);
  meshBox(root, 11, 0.35, 42, steel, -17, 4.2, 55);
  for (let z = 38; z < 76; z += 7)
    meshBox(
      root,
      0.2,
      1.8,
      5.4,
      new THREE.MeshStandardMaterial({ color: "#30383b" }),
      -11.8,
      0.9,
      z,
    );
  for (let n = 0; n < 5; n++)
    meshBox(
      root,
      4 + n * 1.4,
      0.6,
      48,
      new THREE.MeshStandardMaterial({ color: n % 2 ? "#8d969b" : "#b9bec1" }),
      20 + n * 0.6,
      1 + n * 0.55,
      56,
    );
  const treeMat = new THREE.MeshStandardMaterial({
      color: "#3d5837",
      roughness: 1,
    }),
    trunkMat = new THREE.MeshStandardMaterial({ color: "#665341" }),
    leaves = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(2.8, 2),
      treeMat,
      560,
    ),
    trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.2, 0.35, 4, 6),
      trunkMat,
      140,
    ),
    dummy = new THREE.Object3D();
  const roadSamples = curve.getSpacedPoints(280);
  for (let i = 0; i < 140; i++) {
    const t = i / 140,
      c = curve.getPointAt(t),
      f = curve.getTangentAt(t),
      r = new THREE.Vector3(-f.z, 0, f.x).normalize();
    const side = i % 2 ? 1 : -1,
      offset = 18 + ((i * 13) % 39),
      p = c.addScaledVector(r, side * offset);
    const clear = roadSamples.every(
      (v) => Math.hypot(v.x - p.x, v.z - p.z) > 13,
    );
    if (!clear) {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      for (let c = 0; c < 4; c++) leaves.setMatrixAt(i * 4 + c, dummy.matrix);
      continue;
    }
    dummy.position.set(p.x, 2, p.z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, i, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 5;
    dummy.scale.set(1 + (i % 3) * 0.3, 1.2, 1);
    dummy.updateMatrix();
    for (let cluster = 0; cluster < 4; cluster++) {
      dummy.position.set(
        p.x + Math.sin(i + cluster * 2.1) * 1.2,
        4.3 + cluster * 0.6,
        p.z + Math.cos(i + cluster * 2.1) * 1.2,
      );
      dummy.scale.set(
        0.7 + ((i + cluster) % 3) * 0.15,
        0.85 + cluster * 0.1,
        0.7 + ((i * 3 + cluster) % 4) * 0.1,
      );
      dummy.updateMatrix();
      leaves.setMatrixAt(i * 4 + cluster, dummy.matrix);
      leaves.setColorAt(
        i * 4 + cluster,
        new THREE.Color().setHSL(
          0.23 + (i % 5) * 0.012,
          0.24,
          0.7 + (cluster % 3) * 0.06,
        ),
      );
    }
  }
  leaves.castShadow = true;
  root.add(leaves, trunks);
  const activitySigns=RACE_ACTIVITIES.map(a=>{
    const t=(a.at*2)%1,p=curve.getPointAt(t),f=curve.getTangentAt(t),right=new THREE.Vector3(-f.z,0,f.x);
    p.addScaledVector(right,8);const g=new THREE.Group();g.position.copy(p);
    meshBox(g,.1,3.6,.1,steel,0,1.8,0);
    const badge=document.createElement('canvas');badge.width=badge.height=256;const bc=badge.getContext('2d');bc.fillStyle='#fff';bc.beginPath();bc.roundRect(0,0,256,256,24);bc.fill();bc.fillStyle='#247ca9';bc.beginPath();bc.roundRect(9,9,238,238,18);bc.fill();
    bc.strokeStyle='#fff';bc.lineWidth=12;bc.beginPath();bc.moveTo(78,198);bc.lineTo(78,55);bc.stroke();bc.fillStyle='#fff';bc.beginPath();bc.moveTo(84,57);bc.lineTo(188,80);bc.lineTo(174,135);bc.lineTo(84,112);bc.closePath();bc.fill();
    const ft=new THREE.CanvasTexture(badge);ft.colorSpace=THREE.SRGBColorSpace;
    const flag=new THREE.Sprite(new THREE.SpriteMaterial({map:ft,depthTest:true}));flag.position.y=3.5;flag.scale.set(1.8,1.8,1);g.add(flag);
    const c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d');const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const name=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:true}));name.position.y=2;name.scale.set(4.4,1.375,1);g.add(name);
    g.userData.drawDistance=distance=>{const value=Math.max(0,Math.ceil(distance/5)*5);if(g.userData.distance===value)return;g.userData.distance=value;ctx.clearRect(0,0,512,160);ctx.fillStyle='#fffdf7';ctx.beginPath();ctx.roundRect(0,0,512,160,12);ctx.fill();ctx.fillStyle='#1c4052';ctx.textAlign='center';ctx.font='bold 36px Arial';ctx.fillText(a.title,256,63);ctx.font='bold 30px Arial';ctx.fillText(value+' м',256,120);tex.needsUpdate=true;};
    g.userData.drawDistance(150);root.add(g);g.visible=false;return g;
  });
  const player = sportsCar(color, type, style),
    opponents = [
      sportsCar("#2874a5", 1, { number: "11" }),
      sportsCar("#dfdfd6", 0, { number: "23" }),
    ];
  const guests = [
    sportsCar('#cf4d47', 2, { number: '58', spoiler: true }),
    sportsCar('#40ad99', 3, { number: '74', spoiler: true }),
  ];
  guests.forEach(o => { o.visible = false; o.name = 'free-lap-guest'; });
  root.add(player, ...opponents, ...guests);
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 32;
  skyCanvas.height = 512;
  const sc = skyCanvas.getContext("2d"),
    grad = sc.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#688dab");
  grad.addColorStop(0.6, "#b4cbd9");
  grad.addColorStop(1, "#e1e4db");
  sc.fillStyle = grad;
  sc.fillRect(0, 0, 32, 512);
  const sky = new THREE.CanvasTexture(skyCanvas);
  sky.colorSpace = THREE.SRGBColorSpace;
  const envCanvas = document.createElement("canvas");
  envCanvas.width = 512;
  envCanvas.height = 256;
  const ec = envCanvas.getContext("2d"),
    eg = ec.createLinearGradient(0, 0, 0, 256);
  eg.addColorStop(0, "#91afc8");
  eg.addColorStop(0.42, "#e4edf1");
  eg.addColorStop(0.5, "#c4caba");
  eg.addColorStop(1, "#45533e");
  ec.fillStyle = eg;
  ec.fillRect(0, 0, 512, 256);
  const sunGlow = ec.createRadialGradient(350, 70, 2, 350, 70, 70);
  sunGlow.addColorStop(0, "#fff9e8");
  sunGlow.addColorStop(1, "#ffffff00");
  ec.fillStyle = sunGlow;
  ec.fillRect(0, 0, 512, 256);
  const environmentSource = new THREE.CanvasTexture(envCanvas);
  environmentSource.colorSpace = THREE.SRGBColorSpace;
  environmentSource.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer),
    environment = generator.fromEquirectangular(environmentSource);
  generator.dispose();
  environmentSource.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;
  scene.background = sky;
  scene.fog = new THREE.Fog("#b9ccd3", 150, 650);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const sun = scene.children.find((n) => n.isDirectionalLight),
    ambient = scene.children.find((n) => n.isHemisphereLight);
  if (ambient) ambient.intensity = 1.6;
  if (sun) {
    sun.intensity = 3;
    sun.color.set("#fff2df");
    sun.shadow.bias=-.00008;sun.shadow.normalBias=.035;
    sun.shadow.camera.near=.5;sun.shadow.camera.far=150;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    sun.shadow.camera.updateProjectionMatrix();
    scene.add(sun.target);
  }
  const place = (object, distance, lateral) => {
    const t = (((distance / length) % 1) + 1) % 1,
      p = curve.getPointAt(t),
      f = curve.getTangentAt(t),
      r = new THREE.Vector3(-f.z, 0, f.x).normalize();
    object.position.copy(p.addScaledVector(r, lateral));
    object.position.y += 0.03;
    object.rotation.y = Math.atan2(f.x, f.z);
    return f;
  };
  const mapCanvas = document.getElementById("gp-track-map"),
    mapCtx = mapCanvas?.getContext("2d");
  const mapPoints = curve.getSpacedPoints(160),
    bounds = new THREE.Box3().setFromPoints(mapPoints),
    extent = bounds.getSize(new THREE.Vector3());
  const mapScale = 122 / Math.max(extent.x, extent.z),
    project = (p) => [
      19 + (p.x - bounds.min.x) * mapScale,
      18 + (p.z - bounds.min.z) * mapScale,
    ];
  const mapDraw = (distance, rivalDistances, guestDistances) => {
    if (!mapCtx) return;
    mapCtx.clearRect(0, 0, 160, 150);
    mapCtx.lineWidth = 3;
    mapCtx.strokeStyle = "#c6d1d7";
    mapCtx.beginPath();
    mapPoints.forEach((p, i) => {
      const [x, y] = project(p);
      if (i) mapCtx.lineTo(x, y);
      else mapCtx.moveTo(x, y);
    });
    mapCtx.stroke();
    const markers = rivalDistances.flatMap((d, i) => opponents[i].visible
      ? [{ distance: d, color: i ? '#fafaf3' : '#7eb7db', radius: 3 }] : []);
    guestDistances.forEach((d, i) => {
      if (guests[i].visible) markers.push({ distance: d, color: i ? '#40ad99' : '#cf4d47', radius: 3 });
    });
    markers.push({ distance, color: '#f3b871', radius: 4.5 });
    markers.forEach(({ distance: d, color, radius }) => {
      const [x, y] = project(curve.getPointAt((((d / length) % 1) + 1) % 1));
      mapCtx.fillStyle = color;
      mapCtx.beginPath();
      mapCtx.arc(x, y, radius, 0, Math.PI * 2);
      mapCtx.fill();
    });
  };
  const curvatureAt = (distance) => {
    const t = (((distance / length) % 1) + 1) % 1,
      a = curve.getTangentAt((t + 0.998) % 1),
      b = curve.getTangentAt((t + 0.002) % 1);
    return Math.atan2(a.x * b.z - a.z * b.x, a.dot(b)) / (length * 0.004);
  };
  const speedLimit = (distance) => {
    const t = (((distance / length) % 1) + 1) % 1,
      a = curve.getTangentAt((t + 0.993) % 1),
      b = curve.getTangentAt((t + 0.007) % 1);
    const curvature = Math.max(0.0001, a.angleTo(b) / (length * 0.014));
    return THREE.MathUtils.clamp(Math.sqrt(14 / curvature), 24, 42);
  };
  let wheelDistances=null;
  let first = true,
    lastLateral = 0,
    lastSpeed = 0,
    roll = 0;
  const update = (
    distance,
    lateral,
    rivalDistances,
    speed,
    dt,
    handling = null,
    guestDistances = [],
  ) => {
    guests.forEach((o, i) => { o.visible = Number.isFinite(guestDistances[i]); });
    mapDraw(distance, rivalDistances, guestDistances);
    const tangent = place(player, distance, lateral);
    if (handling) player.rotation.y -= handling.heading;
    const steering = dt > 0 ? (lateral - lastLateral) / dt : 0;
    roll +=
      (THREE.MathUtils.clamp(steering * 0.012, -0.035, 0.035) - roll) *
      Math.min(1, dt * 7);
    player.rotation.z = roll;
    player.position.y +=
      Math.sin(distance * 1.3) * 0.006 * Math.min(1, speed / 20);
    for (const wheel of player.userData.wheels)
      if (wheel.position.z > 0)
        wheel.rotation.y = handling
          ? -handling.steer
          : THREE.MathUtils.clamp(-steering * 0.07, -0.2, 0.2);
    const deceleration=dt>0?(speed-lastSpeed)/dt:0;
    for (const m of player.userData.brakeLights)
      m.emissiveIntensity += ((deceleration < -2 ? 2.7 : .65)-m.emissiveIntensity)*Math.min(1,dt*10);
    lastSpeed = speed;
    lastLateral = lateral;
    opponents.forEach((o, i) =>
      place(
        o,
        rivalDistances[i],
        (i ? 2.5 : -2.5) + Math.sin(rivalDistances[i] * 0.015 + i) * 0.45,
      ),
    );
    guests.forEach((o, i) => {
      if (o.visible) place(o, guestDistances[i], (i ? 2.5 : -2.5) + Math.sin(guestDistances[i] * .015 + i) * .45);
    });
    const distances=[distance,...rivalDistances];
    if(wheelDistances && dt>0)[player,...opponents].forEach((vehicle,i)=>{
      const travel=distances[i]-wheelDistances[i];
      for(const wheel of vehicle.userData.wheels)spinWheel(wheel,travel);
    });
    wheelDistances=distances;
    for (const [i, guest] of guests.entries()) {
      const previous = guest.userData.distance;
      if (guest.visible && Number.isFinite(previous) && dt > 0)
        for (const wheel of guest.userData.wheels) spinWheel(wheel, guestDistances[i] - previous);
      guest.userData.distance = guest.visible ? guestDistances[i] : undefined;
    }

    const wanted = player.position.clone().addScaledVector(tangent, -9.5);
    wanted.y += 3.6;
    camera.position.lerp(wanted, first ? 1 : 1 - Math.exp(-dt * 7));
    const look = player.position.clone().addScaledVector(tangent, 19);
    look.y += 0.9;
    camera.fov = 48 + Math.min(6, speed * 0.12);
    camera.updateProjectionMatrix();
    camera.lookAt(look);
    first = false;
    if (sun) {
      const direction=new THREE.Vector3(25,-45,15).normalize(),right=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,direction).normalize(),texel=50/sun.shadow.mapSize.x;
      const snapped=right.multiplyScalar(Math.round(player.position.dot(right)/texel)*texel).add(up.multiplyScalar(Math.round(player.position.dot(up)/texel)*texel)).addScaledVector(direction,player.position.dot(direction));
      sun.position.copy(snapped).add(new THREE.Vector3(-25,45,-15));sun.target.position.copy(snapped);
    }
  };
  update(0, 0, [12, 22], 0, 0);
  return {
    root,
    length,
    speedLimit,
    curvatureAt,
    activity(index,distance=150){activitySigns.forEach((g,i)=>{g.visible=i===index&&distance<=150&&distance>=0;if(g.visible)g.userData.drawDistance(distance)});},
    freeLap(enabled){opponents.forEach(o=>o.visible=!enabled);},
    update,
    cover(now=0){
      opponents.forEach(o=>o.visible=false);
      guests.forEach(o=>o.visible=false);
      const forward=place(player,0,0),right=new THREE.Vector3(-forward.z,0,forward.x);
      player.rotation.z=0;
      const small=camera.aspect<.85;
      const motion=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.sin(now*.00012)*.14;
      const eye=player.position.clone().addScaledVector(forward,small?7.8:8.6).addScaledVector(right,small?4:5.2+motion);
      eye.y+=small?2.9:2.5;
      camera.position.copy(eye);
      const look=player.position.clone();look.y+=.65;
      const direction=look.clone().sub(eye).normalize(),screenRight=direction.clone().cross(new THREE.Vector3(0,1,0)).normalize();
      if(!small)look.addScaledVector(screenRight,-2.3);else look.y-=.8;
      camera.fov=small?43:40;camera.updateProjectionMatrix();camera.lookAt(look);
    },
    dispose() {
      scene.remove(root);
      root.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            m.map?.dispose();
            m.dispose();
          }
        }
      });
      sky.dispose();
      scene.environment = null;
      scene.environmentIntensity = 1;
      environment.dispose();
      if (sun) {
        sun.position.set(-12, 25, 15);
        sun.target.position.set(0, 0, 0);
      }
      scene.background = new THREE.Color("#eaf0dc");
      renderer.toneMapping = THREE.NoToneMapping;
      if (ambient) ambient.intensity = 2.8;
    },
  };
}
