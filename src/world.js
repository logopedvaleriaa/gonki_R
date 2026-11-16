import * as THREE from "three";
import { createCircuitWorld } from "./circuit-world.js";
let circuit = null;
const host = document.querySelector("#world");
let renderer,
  scene,
  camera,
  mode = "home",
  car,
  road,
  decor,
  stopRoot,
  trackObjects = [],
  rivals = [],
  path = [],
  target = 0,
  onFrame = () => {},
  last = 0;
const palette = ["#edb445", "#da7852", "#7caa72", "#987eb9", "#e1b74c"];
function mat(c) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
}
function box(w, h, d, c, x = 0, y = 0, z = 0, group = scene) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  group.add(o);
  return o;
}
function cylinder(r, h, c, x, y, z, group = scene) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat(c));
  o.position.set(x, y, z);
  o.castShadow = true;
  group.add(o);
  return o;
}
export function makeCar(color = "#eeb542", type = 0) {
  const g = new THREE.Group();
  // Bevelled chassis gives the procedural car a soft, toy-like silhouette.
  const shape = new THREE.Shape();
  shape.moveTo(-0.6, -0.2);
  shape.lineTo(0.6, -0.2);
  shape.quadraticCurveTo(0.75, -0.2, 0.75, -0.05);
  shape.lineTo(0.75, 0.1);
  shape.quadraticCurveTo(0.75, 0.25, 0.6, 0.25);
  shape.lineTo(-0.6, 0.25);
  shape.quadraticCurveTo(-0.75, 0.25, -0.75, 0.1);
  shape.lineTo(-0.75, -0.05);
  shape.quadraticCurveTo(-0.75, -0.2, -0.6, -0.2);
  const chassis = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 2.4,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.1,
      curveSegments: 5,
    }),
    mat(color),
  );
  chassis.position.set(0, 0.65, -1.2);
  chassis.castShadow = true;
  g.add(chassis);
  box(1.22, 0.5, 1.2, color, 0, 1.08, -0.12, g);
  box(1.24, 0.34, 0.55, "#a5d9d4", 0, 1.15, 0.29, g);
  box(1.25, 0.32, 0.06, "#a5d9d4", 0, 1.15, -0.75, g);
  for (const x of [-0.8, 0.8])
    for (const z of [-0.8, 0.8]) {
      const wheel = cylinder(0.36, 0.22, "#253d39", x, 0.42, z, g);
      wheel.rotation.z = Math.PI / 2;
      const hub = cylinder(0.18, 0.24, "#eee3b9", x, 0.42, z, g);
      hub.rotation.z = Math.PI / 2;
    }
  for (const x of [-0.47, 0.47]) {
    box(0.3, 0.18, 0.06, "#fff4b6", x, 0.7, 1.32, g);
    box(0.23, 0.12, 0.06, "#e86f54", x, 0.7, -1.32, g);
  }
  box(0.32, 0.07, 2.63, "#fff0cb", 0, 0.91, 0, g);
  if (type === 1) box(1.55, 0.16, 0.3, "#304f43", 0, 1.25, -1.15, g);
  if (type === 2) box(1.4, 0.22, 0.75, color, 0, 1.4, -0.3, g);
  if (type === 3) box(1.5, 0.18, 0.3, "#fff0cb", 0, 1.25, -1.05, g);
  return g;
}
function tree(x, z, theme) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  box(0.3, 1.3, 0.3, "#997957", 0, 0.65, 0, g);
  if (theme === 1) {
    box(0.3, 2.5, 0.3, "#699369", 0, 1.5, 0, g);
    box(1.4, 0.25, 0.3, "#699369", 0, 1.8, 0, g);
  } else {
    const o = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 2.1, 7),
      mat(theme === 3 ? "#b59cc7" : "#739768"),
    );
    o.position.y = 2;
    g.add(o);
  }
  decor.add(g);
}
function label(text, x, z) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#244c3d";
  ctx.font = "bold 65px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 65);
  const texture = new THREE.CanvasTexture(c);
  const m = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), m);
  o.rotation.x = -Math.PI / 2;
  o.position.set(x, 0.28, z);
  road.add(o);
}
function arch(x, z, c) {
  const first = decor.children.length;
  box(0.3, 3, 0.35, c, x - 2, 1.5, z, decor);
  box(0.3, 3, 0.35, c, x + 2, 1.5, z, decor);
  box(4.3, 0.65, 0.4, c, x, 3, z, decor);
  for (let i = 0; i < 8; i++)
    box(
      0.48,
      0.3,
      0.05,
      i % 2 ? "#fff3d3" : "#294c40",
      x - 1.7 + i * 0.48,
      3,
      z + 0.23,
      decor,
    );
  for (let i = first; i < decor.children.length; i++)
    decor.children[i].userData.trackArch = true;
}
export function init() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#eaf0dc");
    scene.fog = new THREE.Fog("#eaf0dc", 45, 95);
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
    scene.add(new THREE.HemisphereLight("#fff8df", "#769d83", 2.8));
    const light = new THREE.DirectionalLight("#fff3db", 3.3);
    light.position.set(-12, 25, 15);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.left = -35;
    light.shadow.camera.right = 35;
    light.shadow.camera.top = 35;
    light.shadow.camera.bottom = -35;
    scene.add(light);
    road = new THREE.Group();
    decor = new THREE.Group();
    stopRoot = new THREE.Group();
    scene.add(road, decor, stopRoot);
    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(loop);
  } catch (e) {
    host.innerHTML = "<p>Для объёмной сцены включите WebGL в браузере.</p>";
    console.error(e);
  }
}
function resize() {
  if (!renderer) return;
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
function clearGroup(g) {
  while (g.children.length) {
    const o = g.children[0];
    g.remove(o);
    o.traverse((n) => {
      n.geometry?.dispose();
      if (n.material) {
        n.material.map?.dispose();
        n.material.dispose?.();
      }
    });
  }
}
export function setWorld(
  next,
  color = "#ecae36",
  type = 0,
  position = 0,
  theme = 0,
  style = {},
) {
  if (!renderer) return;
  if (circuit) {
    circuit.dispose();
    circuit = null;
  }
  if (!scene.background?.isColor) scene.background = new THREE.Color("#eaf0dc");
  camera.near=.1;camera.far=180;
  camera.fov = 38;
  camera.updateProjectionMatrix();
  mode = next;
  rivalsCleanup();
  clearGroup(stopRoot);
  clearGroup(road);
  clearGroup(decor);
  if (car) {
    scene.remove(car);
    car.traverse((n) => {
      n.geometry?.dispose();
      n.material?.dispose?.();
    });
  }
  car = makeCar(color, type);
  scene.add(car);
  if (style.spoiler) box(1.7, 0.15, 0.4, "#254c40", 0, 1.4, -1.13, car);
  if (style.sticker) box(0.5, 0.08, 0.5, "#fff5c7", 0, 1.43, 0, car);
  if (style.wheels)
    car.children
      .filter((n) => n.geometry?.type === "CylinderGeometry")
      .forEach((n) => n.material.color.set(style.wheels));
  trackObjects = [];
  rivals = [];
  const bg = theme === 1 ? "#f3e7c8" : theme === 3 ? "#576380" : "#eaf0dc";
  scene.background.set(bg);
  scene.fog.color.set(bg);
  scene.fog.near = 45;
  scene.fog.far = 95;
  box(
    170,
    0.3,
    170,
    theme === 1 ? "#e7d29f" : theme === 3 ? "#586578" : "#ccdcad",
    0,
    -0.3,
    0,
    decor,
  );
  if (next === "race") {
    camera.position.set(0, 9, -13);
    camera.lookAt(0, 0, 9);
    car.position.set(0, 0, 0);
    box(8, 0.12, 140, "#48645a", 0, 0, 48, road);
    for (let z = -15; z < 110; z += 4) {
      box(0.12, 0.02, 1.6, "#fcf0c9", -1.35, 0.09, z, road);
      box(0.12, 0.02, 1.6, "#fcf0c9", 1.35, 0.09, z, road);
    }
    for (let z = -10; z < 110; z += 7) {
      tree(-7, z, theme);
      tree(7, z + 3, theme);
      box(0.25, 0.35, 3, "#e9c16f", -4.3, 0.2, z, decor);
      box(0.25, 0.35, 3, "#fff3d5", 4.3, 0.2, z, decor);
    }
    arch(0, 100, palette[theme]);
    // A tunnel, a footbridge and terraced stands frame the final straight.
    box(0.6, 4, 5, "#789688", -4.4, 2, 44, decor);
    box(0.6, 4, 5, "#789688", 4.4, 2, 44, decor);
    box(9.4, 0.7, 5, "#789688", 0, 4.2, 44, decor);
    box(13, 0.4, 2, "#dfb971", 0, 3.8, 65, decor);
    for (const side of [-1, 1]) {
      box(0.5, 3.8, 2, "#eee2bd", side * 5.5, 1.9, 65, decor);
      for (let step = 0; step < 3; step++) {
        box(
          1,
          0.5 + step * 0.6,
          12,
          palette[theme],
          side * (6 + step),
          0.25 + step * 0.3,
          86,
          decor,
        );
      }
    }
    for (let i = 0; i < 20; i++) {
      const kind =
        i % 5 === 0
          ? "boost"
          : i % 3 === 0
            ? "fuel"
            : i % 4 === 0
              ? "cone"
              : "coin";
      let o;
      if (kind === "coin") {
        o = cylinder(0.35, 0.13, "#ffc94d", 0, 0.6, 0, road);
        o.rotation.x = Math.PI / 2;
      } else if (kind === "cone") {
        o = makeRoadItem("cone");
        road.add(o);
      } else
        o = box(
          kind === "boost" ? 2 : 0.55,
          kind === "boost" ? 0.04 : 0.75,
          0.65,
          kind === "fuel" ? "#bce56f" : "#6fc9b9",
          0,
          0.4,
          0,
          road,
        );
      if (kind === "fuel") {
        box(0.18, 0.14, 0.16, "#344939", 0.15, 0.43, 0.05, o);
        box(0.4, 0.1, 0.16, "#74a345", -0.05, 0.53, 0, o);
      }
      if (kind === "boost") {
        box(0.12, 0.07, 0.5, "#efffe9", -0.5, 0.08, 0, o);
        box(0.12, 0.07, 0.5, "#efffe9", 0.5, 0.08, 0, o);
      }
      o.userData = { kind, index: i };
      o.position.x = [-2.6, 0, 2.6][i % 3];
      o.position.z = 10 + i * 5;
      o.position.y = kind === "boost" ? 0.12 : kind === "cone" ? 0 : 0.55;
      trackObjects.push(o);
    }
    for (let i = 0; i < 2; i++) {
      let rival = makeCar(i ? "#8ca4d7" : "#dd7e65", i);
      rival.position.set(i ? 2.4 : -2.4, 0, 4 + i * 5);
      scene.add(rival);
      rivals.push(rival);
    }
  } else {
    path = Array.from({ length: 30 }, (_, i) => {
      const t = i / 29;
      return new THREE.Vector3(
        Math.sin(t * Math.PI * 3.2) * 7,
        0,
        (t - 0.5) * 42,
      );
    });
    for (let i = 0; i < 29; i++) {
      let a = path[i],
        b = path[i + 1];
      const length = a.distanceTo(b);
      const strip = box(
        3.5,
        0.18,
        length + 0.12,
        "#68816c",
        (a.x + b.x) / 2,
        0,
        (a.z + b.z) / 2,
        road,
      );
      strip.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    }
    for (let i = 0; i < 30; i++) {
      const p = path[i];
      cylinder(
        1.15,
        0.18,
        i === position
          ? "#f5bc4a"
          : i % 6 === 5
            ? palette[Math.floor(i / 6)]
            : "#f4edcf",
        p.x,
        0.16,
        p.z,
        road,
      );
      label(i % 6 === 5 ? "⚑" : String(i + 1), p.x, p.z);
      if (i % 6 === 5) arch(p.x, p.z, palette[Math.floor(i / 6)]);
      if (i % 6 === 2) {
        const p2 = p.clone().add(new THREE.Vector3(4, 0, 0));
        const b = box(4, 0.12, 1.3, "#acb68f", p.x + 2, 0.08, p.z, road);
        cylinder(0.65, 0.15, "#f3ca70", p2.x, 0.2, p2.z, road);
        const end = path[Math.min(29, i + 2)],
          len = p2.distanceTo(end);
        const join = box(
          1.4,
          0.12,
          len,
          "#acb68f",
          (p2.x + end.x) / 2,
          0.08,
          (p2.z + end.z) / 2,
          road,
        );
        join.rotation.y = Math.atan2(end.x - p2.x, end.z - p2.z);
      }
    }
    for (let i = 0; i < 45; i++) {
      const x = Math.sin(i * 7.4) * 18,
        z = Math.cos(i * 3.8) * 25;
      if (Math.abs(x) > 9) tree(x, z, Math.floor(i / 10) % 5);
    }
    for (let i = 0; i < 8; i++) {
      const x = (i % 2 ? 1 : -1) * (12 + (i % 3)),
        z = -17 + i * 5;
      box(
        3,
        1.7 + (i % 3),
        3,
        ["#dbaa7b", "#e8d8ad", "#9bbba4"][i % 3],
        x,
        0.85 + (i % 3) / 2,
        z,
        decor,
      );
      box(3.3, 0.25, 3.3, "#537b64", x, 1.8 + (i % 3), z, decor);
    }
    car.position.copy(path[position]);
    car.position.y = 0.35;
    target = position;
    camera.position.set(
      next === "home" ? 30 : 28,
      next === "home" ? 32 : 39,
      next === "home" ? 33 : 34,
    );
    camera.lookAt(next === "home" ? -7 : 0, 0, 0);
    box(4, 1.2, 3, "#6f9986", -8, 0.7, 2, decor);
    box(4.5, 0.3, 3.4, "#edc27c", -8, 1.5, 2, decor);
    box(2.5, 0.95, 0.1, "#304f46", -8, 0.6, 3.55, decor);
    if (next === "home") {
      car.scale.setScalar(2.1);
      car.position.set(2, 0.3, 3);
      car.rotation.y = -0.6;
    }
  }
}
export function moveTo(p) {
  target = p;
}
export function frame(fn) {
  onFrame = fn;
}
export function raceVisual(x, progress, rivalProgress = []) {
  if (!car || (mode !== "race" && mode !== "adventure")) return;
  car.position.x = x;
  car.rotation.z = -x * 0.025;
  for (const o of trackObjects)
    o.position.z = 10 + o.userData.index * 5 - (progress % 100);
  for (const stripe of road.children) {
    if (stripe.geometry?.parameters?.width === 0.12) {
      if (stripe.userData.origin === undefined)
        stripe.userData.origin = stripe.position.z;
      stripe.position.z =
        ((((stripe.userData.origin - progress) % 124) + 124) % 124) - 15;
    }
  }
  for (let i = 0; i < rivals.length; i++) {
    rivals[i].position.z =
      rivalProgress[i] === undefined
        ? 4 + i * 4
        : (rivalProgress[i] - progress) * 0.8 + 3;
    rivals[i].position.x =
      (i ? 2.4 : -2.4) + Math.sin(progress * 0.08 + i) * 0.25;
  }
  if (mode === "race")
    for (const o of decor.children) {
      if (o.geometry?.parameters?.width === 170) continue;
      if (o.userData.originZ === undefined) o.userData.originZ = o.position.z;
      if (o.userData.trackArch) {
        o.position.z = o.userData.originZ - progress;
        o.visible = o.position.z > -12;
      } else
        o.position.z =
          ((((o.userData.originZ - progress) % 120) + 120) % 120) - 12;
    }
  return trackObjects;
}
function makeRoadItem(kind) {
  const g = new THREE.Group();
  if (kind === "coin") {
    const coin = cylinder(0.43, 0.14, "#f6bd36", 0, 0.85, 0, g);
    coin.rotation.x = Math.PI / 2;
    const center = cylinder(0.29, 0.16, "#ffe39a", 0, 0.85, 0, g);
    center.rotation.x = Math.PI / 2;
    box(0.08, 0.38, 0.19, "#b78320", 0, 0.85, 0, g);
  }
  if (kind === "cone") {
    box(0.95, 0.12, 0.95, "#d96b37", 0, 0.1, 0, g);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.1, 16),
      mat("#f0803a"),
    );
    cone.position.y = 0.68;
    g.add(cone);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.26, 0.24, 16),
      mat("#fff8e7"),
    );
    band.position.y = 0.69;
    g.add(band);
  }
  if (kind === "chest") {
    box(1.15, 0.7, 0.8, "#d99b39", 0, 0.5, 0, g);
    box(1.2, 0.24, 0.85, "#f3c75a", 0, 0.98, 0, g);
    box(0.17, 0.85, 0.86, "#6a5840", -0.32, 0.65, 0, g);
    box(0.17, 0.85, 0.86, "#6a5840", 0.32, 0.65, 0, g);
    box(0.24, 0.24, 0.1, "#ffe6a0", 0, 0.65, -0.45, g);
  }
  return g;
}
export function configureRace(variant) {
  if (variant === "fuel") return;
  trackObjects = trackObjects.map((o) => {
    if (o.userData.kind !== "fuel") return o;
    const coin = makeRoadItem("coin");
    coin.userData = { ...o.userData, kind: "coin" };
    coin.position.copy(o.position);
    coin.position.y = 0;
    road.remove(o);
    o.traverse((n) => {
      n.geometry?.dispose();
      n.material?.dispose?.();
    });
    road.add(coin);
    return coin;
  });
}
export function prepareAdventure(stops, items = []) {
  if (!renderer) return;
  mode = "adventure";
  rivalsCleanup();
  for (const o of decor.children) if (o.userData.trackArch) o.visible = false;
  for (const o of trackObjects) {
    road.remove(o);
    o.traverse((n) => {
      n.geometry?.dispose();
      n.material?.dispose?.();
    });
  }
  trackObjects = [];
  for (const stop of stops.filter((s) => s.game !== "chest")) {
    const g = new THREE.Group();
    g.userData.stop = stop;
    g.position.x = stop.x;
    cylinder(
      stop.checkpoint !== null ? 3.8 : 1.15,
      0.12,
      stop.checkpoint !== null ? "#edbd55" : "#74bde1",
      0,
      0.18,
      0,
      g,
    );
    if (stop.checkpoint !== null) {
      box(0.2, 3, 0.2, "#e9c06a", -3.8, 1.5, 0, g);
      box(0.2, 3, 0.2, "#e9c06a", 3.8, 1.5, 0, g);
      box(7.8, 0.35, 0.25, "#e9c06a", 0, 3, 0, g);
    } else {
      box(0.12, 2.5, 0.12, "#3b8dbb", 0, 1.3, 0, g);
      box(1, 0.6, 0.12, "#269cda", 0.5, 2, 0, g);
    }
    box(0.12, 2.7, 0.12, "#357ba4", -1.25, 1.5, 0, g);
    box(0.9, 0.55, 0.12, "#289edc", -0.82, 2.6, 0, g);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fffdf3";
    ctx.beginPath();
    ctx.roundRect(5, 5, 502, 246, 26);
    ctx.fill();
    ctx.fillStyle = "#25513e";
    ctx.textAlign = "center";
    ctx.font = "bold 27px Arial";
    ctx.fillText(
      stop.checkpoint !== null ? "ДЕТАЛЬ КУБКА" : "ОСТАНОВКА " + stop.index,
      256,
      48,
    );
    ctx.font = "bold 39px Arial";
    const words = stop.title.split(" ");
    if (stop.title.length > 15) {
      const mid = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(" "), 256, 115);
      ctx.fillText(words.slice(mid).join(" "), 256, 163);
    } else ctx.fillText(stop.title, 256, 137);
    ctx.font = "24px Arial";
    ctx.fillText(
      stop.checkpoint !== null
        ? "Обязательный пит-стоп"
        : "Подъезжай к указателю",
      256,
      220,
    );
    const sign = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c),
        depthTest: true,
      }),
    );
    sign.scale.set(
      stop.checkpoint !== null ? 6 : 4.4,
      stop.checkpoint !== null ? 3 : 2.2,
      1,
    );
    sign.position.set(0, 3.1, 0);
    g.add(sign);
    stopRoot.add(g);
  }
  for (const item of items) {
    const g = makeRoadItem(item.kind);
    g.userData.item = item;
    g.position.x = item.x;
    stopRoot.add(g);
  }
}
export function adventureVisual(x, distance, completed = [], collected = []) {
  raceVisual(x, distance);
  const nearest = stopRoot.children
    .filter(
      (g) =>
        g.userData.stop &&
        !completed.includes(g.userData.stop.id) &&
        g.userData.stop.distance >= distance - 5,
    )
    .sort((a, b) => a.userData.stop.distance - b.userData.stop.distance)[0];
  for (const g of stopRoot.children) {
    const stop = g.userData.stop || g.userData.item;
    g.position.z = stop.distance - distance;
    g.visible =
      g.position.z > -6 &&
      g.position.z < 95 &&
      !completed.includes(stop.id) &&
      !collected.includes(stop.id) &&
      (!g.userData.stop || g === nearest);
  }
  for (const o of decor.children) {
    if (o.geometry?.parameters?.width === 170) continue;
    if (o.userData.originZ === undefined) o.userData.originZ = o.position.z;
    o.position.z = ((((o.userData.originZ - distance) % 120) + 120) % 120) - 12;
  }
}
export function rivalsCleanup() {
  for (const r of rivals) {
    scene.remove(r);
    r.traverse((n) => {
      n.geometry?.dispose();
      n.material?.dispose?.();
    });
  }
  rivals = [];
}
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
  last = now;
  if (mode === "map" && car && path[target]) {
    car.position.lerp(path[target].clone().setY(0.35), Math.min(dt * 5, 1));
    if (target < 29) {
      let d = path[target + 1].clone().sub(path[target]);
      car.rotation.y = Math.atan2(d.x, d.z);
    }
  }
  if (mode === "home" && car)
    car.position.y = 0.4 + Math.sin(now * 0.0015) * 0.12;
  onFrame(dt, now);
  renderer.render(scene, camera);
}

let mazeMarkers = [],
  mazeCoins = [];
export function prepareLabyrinth(layout) {
  if (!renderer) return;
  mode = "labyrinth";
  rivalsCleanup();
  clearGroup(road);
  clearGroup(decor);
  clearGroup(stopRoot);
  scene.background.set("#dcebd6");
  scene.fog.near = 100;
  scene.fog.far = 180;
  const unit = 3.6;
  box(
    layout.size * unit,
    0.3,
    layout.size * unit,
    "#a8c494",
    ((layout.size - 1) * unit) / 2,
    -0.3,
    ((layout.size - 1) * unit) / 2,
    decor,
  );
  layout.grid.forEach((row, y) =>
    row.forEach((open, x) => {
      if (open) {
        box(unit, 0.12, unit, "#617c73", x * unit, 0, y * unit, road);
        box(0.12, 0.025, 0.55, "#ecdfb9", x * unit, 0.08, y * unit, road);
      } else {
        box(
          unit - 0.12,
          1.15,
          unit - 0.12,
          "#82a879",
          x * unit,
          0.55,
          y * unit,
          decor,
        );
        box(
          unit - 0.25,
          0.18,
          unit - 0.25,
          "#a1bf87",
          x * unit,
          1.18,
          y * unit,
          decor,
        );
      }
    }),
  );
  for (const [x, y] of layout.mud) {
    box(3.25, 0.03, 3.25, "#ac8960", x * unit, 0.09, y * unit, road);
    for (let i = 0; i < 3; i++)
      box(
        0.25,
        0.035,
        2.6,
        "#765f4d",
        x * unit - 0.8 + i * 0.8,
        0.12,
        y * unit,
        road,
      );
  }
  const sign = (label, x, y, color, subtitle = "") => {
    const g = new THREE.Group();
    g.position.set(x * unit, 0, y * unit);
    cylinder(0.75, 0.1, color, 0, 0.16, 0, g);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fffdf5";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = color;
    ctx.font = "bold 34px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, 256, subtitle ? 56 : 78);
    if (subtitle) {
      ctx.font = "26px Arial";
      ctx.fillText(subtitle, 256, 101);
    }
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c),
        depthTest: false,
      }),
    );
    sprite.scale.set(5, 1.25, 1);
    sprite.position.y = 2.2;
    g.add(sprite);
    stopRoot.add(g);
    return g;
  };
  mazeMarkers = layout.stations.map((s) => ({
    s,
    g: sign(
      s.title,
      s.x,
      s.y,
      s.checkpoint !== null ? "#986522" : "#257b9d",
      s.checkpoint !== null
        ? "ДЛЯ КУБКА"
        : s.game === "garage"
          ? "УКРАШЕНИЯ"
          : "БОНУС +20",
    ),
  }));
  sign("ФИНИШ", ...layout.finish, "#246246");
  mazeCoins = layout.coins.map((c) => {
    const g = makeRoadItem("coin");
    g.position.set(c.x * unit, 0, c.y * unit);
    stopRoot.add(g);
    return { c, g };
  });
}
export function labyrinthVisual(x, y, dx, dy, completed = [], collected = []) {
  if (!renderer || !car) return;
  car.position.set(x * 3.6, 0.12, y * 3.6);
  car.rotation.set(0, Math.atan2(dx, dy), 0);
  car.scale.setScalar(0.8);
  // North stays at the top of both the world and the navigation map.
  const narrow = camera.aspect < 0.8;
  camera.position.set(x * 3.6, narrow ? 32 : 22, y * 3.6 + (narrow ? 24 : 17));
  camera.lookAt(x * 3.6, 0, y * 3.6 - 2);
  for (const { s, g } of mazeMarkers) g.visible = !completed.includes(s.id);
  for (const { c, g } of mazeCoins) g.visible = !collected.includes(c.id);
}

export function prepareCircuit(color, type, style = {}) {
  if (!renderer) return 900;
  rivalsCleanup();
  clearGroup(road);
  clearGroup(decor);
  clearGroup(stopRoot);
  if (car) {
    scene.remove(car);
    car.traverse((n) => {
      n.geometry?.dispose();
      n.material?.dispose?.();
    });
    car = null;
  }
  if (circuit) circuit.dispose();
  mode = "circuit";
  circuit = createCircuitWorld(scene, camera, renderer, color, type, style);
  return circuit.length;
}
export function circuitVisual(distance, lateral, rivals, speed, dt, handling, guests = []) {
  circuit?.update(distance, lateral, rivals, speed, dt, handling, guests);
}

export function circuitSpeedLimit(distance) {
  return circuit?.speedLimit(distance) || 42;
}

export function circuitCurvature(distance) {
  return circuit?.curvatureAt(distance) || 0;
}

export function circuitActivity(index,distance){circuit?.activity(index,distance)}

export function circuitCover(now){circuit?.cover(now)}

export function circuitFreeLap(enabled){circuit?.freeLap(enabled)}
