import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

function leather(color, extras = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: extras.roughness ?? 0.42,
    metalness: extras.metalness ?? 0.04,
    clearcoat: extras.clearcoat ?? 0.28,
    clearcoatRoughness: 0.35,
    sheen: 0.35,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.2),
    ...extras,
  });
}

function rubber(color, extras = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: extras.roughness ?? 0.82,
    metalness: 0.02,
    ...extras,
  });
}

function glass(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.08,
    metalness: 0.05,
    transmission: 0.72,
    thickness: 0.45,
    ior: 1.4,
    transparent: true,
    opacity: 0.92,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
}

function mesh(geometry, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function swooshShape() {
  const s = new THREE.Shape();
  s.moveTo(0.0, 0.02);
  s.bezierCurveTo(0.18, 0.2, 0.55, 0.32, 1.08, 0.14);
  s.bezierCurveTo(0.78, 0.16, 0.42, 0.06, 0.12, -0.05);
  s.bezierCurveTo(0.28, 0.02, 0.16, 0.06, 0.0, 0.02);
  return s;
}

function addSwooshes(group, palette, scale = 1, y = 0.42, z = 0.41) {
  const mat = leather(palette.swoosh, { roughness: 0.32, clearcoat: 0.45 });
  const geo = new THREE.ExtrudeGeometry(swooshShape(), {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  geo.center();
  const left = mesh(geo, mat, { x: 0.08, y, z, ry: Math.PI, rx: -0.08 });
  left.scale.set(scale, scale * 0.85, 1);
  const right = mesh(geo.clone(), mat, { x: 0.08, y, z: -z, ry: 0, rx: 0.08 });
  right.scale.set(scale, scale * 0.85, 1);
  group.add(left, right);
}

function addLaces(group, palette, count, startX, y, width) {
  const laceMat = leather(palette.lace, { roughness: 0.55, clearcoat: 0.1 });
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: "#c5c1b7",
    metalness: 0.85,
    roughness: 0.22,
  });
  for (let i = 0; i < count; i += 1) {
    const x = startX + i * 0.16;
    const drop = i * 0.012;
    group.add(mesh(new THREE.CapsuleGeometry(0.018, width, 4, 8), laceMat, {
      x,
      y: y - drop,
      z: 0,
      rx: Math.PI / 2,
    }));
    group.add(mesh(new THREE.TorusGeometry(0.028, 0.007, 8, 12), eyeMat, {
      x,
      y: y - 0.04 - drop,
      z: width / 2 + 0.01,
      rx: Math.PI / 2,
    }));
    group.add(mesh(new THREE.TorusGeometry(0.028, 0.007, 8, 12), eyeMat, {
      x,
      y: y - 0.04 - drop,
      z: -(width / 2 + 0.01),
      rx: Math.PI / 2,
    }));
  }
}

function addWaffle(group, palette, y) {
  const nub = rubber(palette.outsole, { roughness: 0.9 });
  for (let ix = -4; ix <= 5; ix += 1) {
    for (let iz = -2; iz <= 2; iz += 1) {
      const geo = new THREE.BoxGeometry(0.1, 0.035, 0.1);
      group.add(mesh(geo, nub, {
        x: ix * 0.18,
        y,
        z: iz * 0.16,
        cast: false,
      }));
    }
  }
}

function silhouetteDims(kind) {
  switch (kind) {
    case "jordan":
      return { soleH: 0.16, midH: 0.18, upperH: 0.42, collarH: 0.38, length: 2.55, width: 0.92, high: true };
    case "force":
      return { soleH: 0.14, midH: 0.22, upperH: 0.36, collarH: 0.16, length: 2.6, width: 0.98, high: false, chunky: true };
    case "dunk":
      return { soleH: 0.13, midH: 0.16, upperH: 0.34, collarH: 0.22, length: 2.5, width: 0.94, high: false };
    case "max90":
      return { soleH: 0.12, midH: 0.2, upperH: 0.34, collarH: 0.18, length: 2.62, width: 0.96, high: false, air: "small" };
    case "max1":
      return { soleH: 0.12, midH: 0.2, upperH: 0.33, collarH: 0.16, length: 2.58, width: 0.94, high: false, air: "large" };
    case "blazer":
      return { soleH: 0.1, midH: 0.12, upperH: 0.4, collarH: 0.34, length: 2.52, width: 0.9, high: true, thin: true };
    default:
      return { soleH: 0.14, midH: 0.18, upperH: 0.36, collarH: 0.2, length: 2.55, width: 0.94, high: false };
  }
}

export function buildSneaker(shoe, colorway) {
  const palette = colorway.palette;
  const d = silhouetteDims(shoe.silhouette);
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.name = shoe.id;
  group.add(inner);

  const upperMat = leather(palette.upper);
  const overlayMat = leather(palette.overlay, { roughness: 0.38 });
  const quarterMat = leather(palette.quarter);
  const midMat = rubber(palette.midsole, { roughness: 0.55 });
  const outMat = rubber(palette.outsole);
  const collarMat = leather(palette.collar, { roughness: 0.5 });
  const tongueMat = leather(palette.tongue, { roughness: 0.48 });
  const toeMat = leather(palette.toe);
  const liningMat = leather(palette.lining, { roughness: 0.6 });

  const outsole = mesh(new RoundedBoxGeometry(d.length, d.soleH, d.width, 5, 0.08), outMat, {
    y: d.soleH / 2,
  });
  outsole.scale.set(1, 1, 1);
  inner.add(outsole);

  const mid = mesh(new RoundedBoxGeometry(d.length - 0.06, d.midH, d.width - 0.04, 5, 0.1), midMat, {
    y: d.soleH + d.midH / 2,
  });
  inner.add(mid);

  if (d.thin) {
    const glue = mesh(new RoundedBoxGeometry(d.length - 0.02, 0.035, d.width + 0.02, 3, 0.04), midMat, {
      y: d.soleH + d.midH + 0.01,
    });
    inner.add(glue);
  }

  const deckY = d.soleH + d.midH;

  if (d.air) {
    const airW = d.air === "large" ? 0.42 : 0.3;
    const airH = d.air === "large" ? 0.2 : 0.15;
    const air = mesh(new THREE.SphereGeometry(0.2, 24, 16), glass(palette.air || "#7DD3FC"), {
      x: -0.82,
      y: deckY - 0.02,
      z: 0,
    });
    air.scale.set(airW / 0.2, airH / 0.2, (d.width - 0.18) / 0.4);
    inner.add(air);
    const windowFrame = mesh(
      new RoundedBoxGeometry(airW + 0.08, airH + 0.04, d.width - 0.08, 2, 0.03),
      midMat,
      { x: -0.82, y: deckY - 0.02, z: 0 },
    );
    inner.add(windowFrame);
  }

  const upper = mesh(new RoundedBoxGeometry(d.length - 0.42, d.upperH, d.width - 0.16, 4, 0.1), upperMat, {
    x: -0.02,
    y: deckY + d.upperH / 2,
  });
  inner.add(upper);

  const toe = mesh(new RoundedBoxGeometry(0.62, d.upperH * 0.78, d.width - 0.1, 5, 0.14), toeMat, {
    x: 0.88,
    y: deckY + d.upperH * 0.38,
  });
  inner.add(toe);

  if (shoe.silhouette === "force") {
    const punchMat = leather(palette.toe, { roughness: 0.5 });
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        inner.add(mesh(new THREE.CircleGeometry(0.028, 12), punchMat, {
          x: 0.72 + c * 0.08,
          y: deckY + 0.18 + r * 0.07,
          z: 0.42,
          cast: false,
        }));
        inner.add(mesh(new THREE.CircleGeometry(0.028, 12), punchMat, {
          x: 0.72 + c * 0.08,
          y: deckY + 0.18 + r * 0.07,
          z: -0.42,
          rx: Math.PI,
          cast: false,
        }));
      }
    }
    const pivot = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 24), outMat, {
      x: 0.72,
      y: 0.02,
      rx: 0,
      cast: false,
    });
    inner.add(pivot);
  }

  const quarter = mesh(new RoundedBoxGeometry(0.95, d.upperH * 0.92, d.width - 0.08, 4, 0.08), quarterMat, {
    x: -0.55,
    y: deckY + d.upperH * 0.46,
  });
  inner.add(quarter);

  const mud = mesh(new RoundedBoxGeometry(d.length - 0.2, 0.12, d.width - 0.02, 3, 0.06), overlayMat, {
    y: deckY + 0.04,
  });
  inner.add(mud);

  const collarY = deckY + d.upperH + (d.high ? 0.02 : -0.02);
  const collar = mesh(new RoundedBoxGeometry(0.95, d.collarH, d.width - 0.12, 4, 0.14), collarMat, {
    x: -0.58,
    y: collarY + d.collarH / 2 - 0.08,
  });
  inner.add(collar);

  const opening = mesh(new RoundedBoxGeometry(0.72, 0.08, d.width - 0.28, 3, 0.04), liningMat, {
    x: -0.42,
    y: collarY + d.collarH * 0.45,
    cast: false,
  });
  inner.add(opening);

  const tongueH = d.high ? 0.72 : 0.52;
  const tongue = mesh(new RoundedBoxGeometry(0.95, 0.08, 0.42, 3, 0.04), tongueMat, {
    x: 0.12,
    y: deckY + tongueH * 0.55,
    rx: -0.72,
  });
  inner.add(tongue);

  const heelTab = mesh(new RoundedBoxGeometry(0.12, 0.22, 0.28, 2, 0.03), overlayMat, {
    x: -1.12,
    y: collarY + 0.12,
  });
  inner.add(heelTab);

  addSwooshes(inner, palette, shoe.silhouette === "blazer" ? 1.05 : 0.92, deckY + d.upperH * 0.42, d.width * 0.46);
  addLaces(inner, palette, d.high ? 6 : 5, -0.18, deckY + d.upperH * 0.78, 0.34);

  if (shoe.silhouette === "max90" || shoe.silhouette === "max1") {
    addWaffle(inner, palette, 0.02);
  }

  if (shoe.silhouette === "jordan") {
    const wing = mesh(new RoundedBoxGeometry(0.28, 0.34, 0.04, 2, 0.02), overlayMat, {
      x: -0.72,
      y: collarY + 0.18,
      z: d.width * 0.42,
      rz: 0.35,
    });
    const wing2 = wing.clone();
    wing2.position.z = -d.width * 0.42;
    inner.add(wing, wing2);
  }

  inner.scale.setScalar(0.72);
  inner.position.set(0.04, 0.02, 0);
  group.rotation.set(-0.28, 0.18, 0.02);
  group.userData.floatY = 0;
  return group;
}

export function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => mat.dispose());
    }
  });
}
