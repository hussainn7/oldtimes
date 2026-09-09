import * as T from 'three';
import {
  mat,
  mesh,
  taper,
  ellipsoid,
  group,
  writeGlb,
  writeSidecar,
  countTris,
  mergeParts,
  tintGeometry,
  matVertex,
} from './lib.mjs';

const out = 'public/assets/terrain/river-boulder.glb';
const rockMat = matVertex('#727565', 0.95);

const root = group('river-boulder');
// base unit radius ~1m; runtime scales instances
const chunks = [
  new T.DodecahedronGeometry(0.85, 1).scale(1.15, 0.72, 0.95),
  new T.DodecahedronGeometry(0.45, 1)
    .scale(1.1, 0.8, 0.9)
    .translate(0.45, 0.15, 0.2),
  new T.DodecahedronGeometry(0.38, 0)
    .scale(1.2, 0.7, 1)
    .translate(-0.4, 0.05, -0.25),
  new T.TetrahedronGeometry(0.35, 0).scale(1.4, 0.8, 1.1).translate(0.1, 0.35, -0.4),
];
root.add(
  mesh(
    tintGeometry(mergeParts(chunks), '#727565', 0.14),
    rockMat,
    'boulder',
  ),
);
// sit on ground
root.children[0].geometry.computeBoundingBox();
const bb = root.children[0].geometry.boundingBox;
root.children[0].geometry.translate(0, -bb.min.y, 0);

await writeGlb(root, out);
writeSidecar(out, {
  scale: 1,
  offsetY: 0,
  rotationY: 0,
  triangles: countTris(root),
  textureSize: 0,
});
console.log('tris ~', countTris(root));
