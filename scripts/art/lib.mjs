import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

globalThis.FileReader = class FileReader {
  result = null;
  onloadend = null;
  onerror = null;
  readAsArrayBuffer(blob) {
    Promise.resolve(blob.arrayBuffer())
      .then((ab) => {
        this.result = ab;
        this.onloadend?.({ target: this });
      })
      .catch((e) => this.onerror?.(e));
  }
  readAsDataURL(blob) {
    Promise.resolve(blob.arrayBuffer())
      .then((ab) => {
        this.result =
          'data:application/octet-stream;base64,' +
          Buffer.from(ab).toString('base64');
        this.onloadend?.({ target: this });
      })
      .catch((e) => this.onerror?.(e));
  }
};

export function mat(hex, roughness = 0.88, metalness = 0) {
  return new T.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
  });
}

export function paintMap(size, paint) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const c = paint(x / size, y / size, x, y);
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
  const tex = new T.DataTexture(data, size, size);
  tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function noise2(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export function mesh(geo, material, name) {
  const m = new T.Mesh(geo, material);
  if (name) m.name = name;
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function taper(points, radii, radial = 8) {
  const vertices = [];
  const indices = [];
  const uvs = [];
  points.forEach((p, i) => {
    const prev = new T.Vector3(
      ...(points[Math.max(0, i - 1)]),
    );
    const next = new T.Vector3(
      ...(points[Math.min(points.length - 1, i + 1)]),
    );
    const tangent = next.sub(prev).normalize();
    const side = new T.Vector3(0, 0, 1).cross(tangent).normalize();
    if (side.lengthSq() < 0.01) side.set(1, 0, 0);
    const up = tangent.clone().cross(side).normalize();
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const v = side
        .clone()
        .multiplyScalar(Math.cos(a))
        .addScaledVector(up, Math.sin(a))
        .multiplyScalar(radii[i]);
      vertices.push(p[0] + v.x, p[1] + v.y, p[2] + v.z);
      uvs.push(j / radial, i / (points.length - 1));
      if (i && j < radial) {
        const k = i * (radial + 1) + j;
        indices.push(k, k + 1, k - radial - 1, k + 1, k - radial, k - radial - 1);
      }
    }
  });
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function ellipsoid(x, y, z, sx, sy, sz, w = 10, h = 8) {
  return new T.SphereGeometry(1, w, h).scale(sx, sy, sz).translate(x, y, z);
}

export function group(name) {
  const g = new T.Group();
  g.name = name;
  return g;
}

export function breathe(name, amp = 0.03, dur = 4) {
  return new T.VectorKeyframeTrack(
    `${name}.scale`,
    [0, dur / 2, dur],
    [1, 1, 1, 1, 1 + amp, 1, 1, 1, 1],
  );
}

function axisVec(axis) {
  if (axis === 'x') return new T.Vector3(1, 0, 0);
  if (axis === 'y') return new T.Vector3(0, 1, 0);
  return new T.Vector3(0, 0, 1);
}

export function sway(path, axis, amp, dur, phase = 0) {
  const times = [0, dur / 4, dur / 2, (3 * dur) / 4, dur];
  const values = [];
  const ax = axisVec(axis);
  for (const t of times) {
    const q = new T.Quaternion().setFromAxisAngle(
      ax,
      Math.sin((t / dur) * Math.PI * 2 + phase) * amp,
    );
    values.push(q.x, q.y, q.z, q.w);
  }
  return new T.QuaternionKeyframeTrack(`${path}.quaternion`, times, values);
}

export function gait(path, amp, dur, phase) {
  return sway(path, 'z', amp, dur, phase);
}

export async function writeGlb(root, outPath, animations = []) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  const scene = new T.Scene();
  scene.add(root);
  const exporter = new GLTFExporter();
  const ab = await exporter.parseAsync(scene, {
    binary: true,
    animations,
  });
  writeFileSync(outPath, Buffer.from(ab));
  console.log(
    `wrote ${path.relative(process.cwd(), outPath)} (${(ab.byteLength / 1024).toFixed(1)} KB)`,
  );
}

export function writeSidecar(outPath, meta) {
  const side = outPath.replace(/\.glb$/i, '.asset.json');
  writeFileSync(side, JSON.stringify(meta, null, 2) + '\n');
}

export function countTris(root) {
  let n = 0;
  root.traverse((o) => {
    if (o.isMesh && o.geometry.index) n += o.geometry.index.count / 3;
    else if (o.isMesh)
      n += o.geometry.getAttribute('position').count / 3;
  });
  return Math.round(n);
}

export function mergeParts(geos) {
  const m = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return m;
}

/** Soft per-vertex shading without canvas/PNG export. */
export function tintGeometry(geo, baseHex, variance = 0.08) {
  const base = new T.Color(baseHex);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const n = noise2(pos.getX(i) * 0.7, pos.getY(i) * 0.55 + pos.getZ(i));
    const c = base.clone().offsetHSL(0, 0, (n - 0.5) * variance);
    // slightly lighter underside
    if (pos.getY(i) < 0) c.offsetHSL(0.02, -0.05, 0.06);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  return geo;
}

export function matVertex(hex, roughness = 0.88) {
  return new T.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness: 0,
    vertexColors: true,
  });
}
