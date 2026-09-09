import * as T from 'three';
import type { Period, Region } from '../types';
import { heightAt, noise, riverZ } from './terrain';
import { ModelKit, makeTree } from './models';
import { AssetLibrary, instanceModel } from './assets';

export function buildHabitat(
  p: Period,
  r: Region,
  kit: ModelKit,
  assets: AssetLibrary,
) {
  const root = new T.Group(),
    obstacles: { x: number; z: number; radius: number }[] = [];
  const height = (x: number, z: number) => heightAt(x, z, p.biome, r);
  const terrain = new T.PlaneGeometry(270, 230, 150, 110)
    .rotateX(-Math.PI / 2)
    .translate(65, 0, -30);
  const pos = terrain.attributes.position;
  const colors: number[] = [],
    base = new T.Color(p.land),
    path = new T.Color(
      p.biome === 'ice'
        ? '#d9e1dd'
        : p.biome === 'volcanic'
          ? '#45413d'
          : p.biome === 'ocean'
            ? '#b7ab88'
            : '#96906a',
    );
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      y = height(x, z);
    pos.setY(i, y);
    const trail = Math.exp(-Math.pow((z - Math.sin(x * 0.08) * 1.5) / 2.1, 2));
    const riverbank = Math.max(0, 1 - Math.abs(z - riverZ(x)) / 9);
    const c = base.clone().lerp(path, Math.max(trail * 0.6, riverbank * 0.6));
    if (r.id === 'interior') c.lerp(new T.Color('#ac9060'), 0.25);
    if (r.id === 'north' || r.id === 'south')
      c.lerp(new T.Color('#b9c4c0'), 0.12);
    c.multiplyScalar(0.9 + noise(i) * 0.18);
    colors.push(c.r, c.g, c.b);
  }
  terrain.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const ground = new T.Mesh(
    terrain,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  );
  ground.receiveShadow = true;
  root.add(ground);
  // Distant geology stays outside the compact playable corridor.
  const ridge = new T.PlaneGeometry(380, 130, 80, 32)
    .rotateX(-Math.PI / 2)
    .translate(65, 0, -120);
  const ridgePos = ridge.attributes.position;
  for (let i = 0; i < ridgePos.count; i++) {
    const x = ridgePos.getX(i),
      z = ridgePos.getZ(i);
    const envelope = Math.sin(
      Math.max(0, Math.min(1, (-z - 55) / 130)) * Math.PI,
    );
    ridgePos.setY(
      i,
      -1 +
        envelope *
          (12 +
            Math.sin(x * 0.042) * 8 +
            Math.sin(x * 0.11) * 3 +
            noise(i) * 2),
    );
  }
  ridge.computeVertexNormals();
  root.add(
    new T.Mesh(
      ridge,
      kit.material(
        p.biome === 'ice'
          ? '#d3dede'
          : p.biome === 'volcanic'
            ? '#564338'
            : '#536e65',
      ),
    ),
  );
  const waterGeometry = new T.PlaneGeometry(
    270,
    p.biome === 'ocean' ? 78 : 7,
    90,
    8,
  ).rotateX(-Math.PI / 2);
  const waterLevel = p.biome === 'ocean' ? -0.25 : -1.6;
  const wp = waterGeometry.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i) + 65;
    wp.setXYZ(
      i,
      x,
      waterLevel,
      wp.getZ(i) + riverZ(x) - (p.biome === 'ocean' ? 29 : 0),
    );
  }
  const water = new T.Mesh(
    waterGeometry,
    new T.MeshStandardMaterial({
      color:
        p.biome === 'volcanic'
          ? '#bd4c19'
          : p.biome === 'ice'
            ? '#88acb7'
            : '#427e7b',
      roughness: 0.24,
      metalness: 0.35,
      emissive: p.biome === 'volcanic' ? '#e86417' : '#163b3b',
      emissiveIntensity: p.biome === 'volcanic' ? 1.5 : 0.17,
      transparent: p.biome !== 'volcanic',
      opacity: p.biome === 'ocean' ? 0.64 : 0.88,
    }),
  );
  const waterTime = { value: 0 };
  water.material.onBeforeCompile = (shader) => {
    shader.uniforms.waterTime = waterTime;
    shader.vertexShader =
      'varying vec2 vWater;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvWater = (modelMatrix * vec4(transformed, 1.0)).xz;',
      );
    shader.fragmentShader =
      'uniform float waterTime; varying vec2 vWater;\n' +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nfloat ripple = sin(vWater.x * 3.0 + sin(vWater.y * 0.7 + waterTime * 0.7) * 2.0 + waterTime) * sin(vWater.y * 9.0 + waterTime * 0.4); diffuseColor.rgb += smoothstep(0.88, 1.0, ripple) * 0.18;',
      );
  };
  waterGeometry.computeVertexNormals();
  root.add(water);
  const barren = ['volcanic', 'ocean', 'ash'].includes(p.biome);
  const treeKind =
    p.biome === 'savanna'
      ? 'acacia'
      : p.biome === 'modern' || p.id === 'eocene'
        ? 'broadleaf'
        : p.biome === 'ash'
          ? 'dead'
          : 'conifer';
  const density = barren
    ? p.biome === 'ash'
      ? 35
      : 0
    : p.biome === 'ice'
      ? 35
      : p.biome === 'desert' || p.biome === 'savanna'
        ? 65
        : r.id === 'tropics'
          ? 310
          : 225;
  const matrix = (
    x: number,
    y: number,
    z: number,
    scale: number,
    angle: number,
  ) =>
    new T.Matrix4().compose(
      new T.Vector3(x, y, z),
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), angle),
      new T.Vector3(scale, scale * (0.9 + noise(x) * 0.3), scale),
    );
  function vegetation(kind: string, count: number) {
    const transforms: T.Matrix4[] = [];
    for (let i = 0; i < count; i++) {
      const x = noise(i + 401) * 220 - 35;
      const z =
        kind === 'fern' ? noise(i + 702) * 60 - 39 : -29 - noise(i + 501) * 70;
      if (
        (kind === 'fern' && Math.abs(z) < 4.5) ||
        Math.abs(z - riverZ(x)) < 6 ||
        (p.biome === 'ocean' && z < -12)
      )
        continue;
      const scale =
        kind === 'fern' ? 0.45 + noise(i) * 0.7 : 0.65 + noise(i + 901) * 0.8;
      transforms.push(matrix(x, height(x, z), z, scale, noise(i) * 6.28));
    }
    // Sparse near trees frame the path, but never cover the camera lane.
    if (kind !== 'fern')
      for (let i = 0; i < Math.min(14, count / 4); i++) {
        const x = 5 + i * 9.3,
          z = -7 - noise(i + 80) * 3;
        transforms.push(matrix(x, height(x, z), z, 0.85 + noise(i) * 0.3, i));
        obstacles.push({ x, z, radius: 0.45 });
      }
    const model = makeTree(kind, kit),
      batch = instanceModel(model, transforms);
    root.add(batch);
    void assets.replaceInstances(`vegetation/${kind}`, root, batch, transforms);
  }
  if (density) vegetation(treeKind, density);
  if (!barren && p.biome !== 'ice')
    vegetation('fern', p.biome === 'desert' ? 35 : 270);
  // Pebbles and boulders are a single instanced draw, with matching collisions.
  const rockModel = new T.Mesh(
    new T.DodecahedronGeometry(1, 0),
    kit.material(p.biome === 'ice' ? '#9fadaa' : '#727565'),
  );
  const rocks: T.Matrix4[] = [];
  for (let i = 0; i < 135; i++) {
    const x = noise(i + 1300) * 190 - 20,
      z = noise(i + 1600) * 70 - 40;
    if (Math.abs(z) < 2.4 || Math.abs(z - riverZ(x)) < 4) continue;
    const scale = 0.25 + noise(i + 600) * 1.2;
    const m = matrix(x, height(x, z) + scale * 0.22, z, scale, i);
    m.scale(new T.Vector3(1.3, 0.65, 0.9));
    rocks.push(m);
    if (z > -11 && z < 15) obstacles.push({ x, z, radius: scale * 0.9 });
  }
  const rockBatch = instanceModel(rockModel, rocks);
  root.add(rockBatch);
  void assets.replaceInstances('terrain/river-boulder', root, rockBatch, rocks);
  // Instanced grass: no alpha textures, no per-blade simulation.
  if (!barren) {
    const grass = new T.ConeGeometry(0.13, 0.65, 3).translate(0, 0.3, 0);
    const grassMaterial = kit.material(
      p.biome === 'ice'
        ? '#adb49a'
        : p.biome === 'savanna' || p.biome === 'desert'
          ? '#a4a166'
          : '#667d47',
    );
    const matrices: T.Matrix4[] = [];
    for (let i = 0; i < 2400; i++) {
      const x = noise(i + 2500) * 165 - 10,
        z = noise(i + 5500) * 44 - 27;
      if (Math.abs(z) < 2 || Math.abs(z - riverZ(x)) < 5) continue;
      matrices.push(matrix(x, height(x, z), z, 0.35 + noise(i) * 1.3, i));
    }
    const batch = instanceModel(new T.Mesh(grass, grassMaterial), matrices);
    batch.children.forEach((m) => {
      m.castShadow = false;
    });
    root.add(batch);
  }
  if (p.biome === 'volcanic') {
    const volcano = new T.Mesh(
      new T.ConeGeometry(22, 37, 18, 1, true).translate(0, 18, 0),
      kit.material('#493b34'),
    );
    volcano.position.set(45, 0, -85);
    root.add(volcano);
    const crater = new T.Mesh(
      new T.TorusGeometry(2.1, 0.65, 8, 24),
      new T.MeshBasicMaterial({ color: '#f7a34a' }),
    );
    crater.rotation.x = Math.PI / 2;
    crater.position.set(45, 35, -85);
    root.add(crater);
  }
  if (p.biome === 'modern' && p.mya < 0.012) {
    const buildings = [];
    for (let i = 0; i < 18; i++) {
      const h = p.mya > 0.001 ? 2 + noise(i) * 2 : 3 + noise(i) * 12;
      buildings.push(
        new T.BoxGeometry(2, h, 3).translate(80 + i * 3.3, h / 2 + 2, -76),
      );
    }
    root.add(kit.part('#5c7370', buildings));
  }
  const particlePositions = new Float32Array(120 * 3);
  for (let i = 0; i < 120; i++) {
    particlePositions[i * 3] = noise(i + 12) * 170;
    particlePositions[i * 3 + 1] = noise(i + 99) * 24;
    particlePositions[i * 3 + 2] = noise(i + 45) * 65 - 40;
  }
  const particleGeo = new T.BufferGeometry();
  particleGeo.setAttribute(
    'position',
    new T.BufferAttribute(particlePositions, 3),
  );
  const particles = new T.Points(
    particleGeo,
    new T.PointsMaterial({
      color: p.biome === 'volcanic' ? '#ffb36b' : '#eee8cd',
      size: p.biome === 'ice' ? 0.09 : 0.045,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  root.add(particles);
  const environmentHost = new T.Group();
  root.add(environmentHost);
  // Environment exports are additive landmarks, preserving the walkable terrain contract.
  const empty = new T.Group();
  environmentHost.add(empty);
  void assets.replace(`environments/${p.id}`, environmentHost, empty);
  return {
    root,
    obstacles,
    height,
    update(t: number, reduced: boolean) {
      if (reduced) return;
      waterTime.value = t;
      for (let i = 0; i < wp.count; i++)
        wp.setY(
          i,
          waterLevel +
            Math.sin(wp.getX(i) * 0.7 + t * 1.2) * 0.055 +
            Math.cos(wp.getZ(i) * 1.2 + t) * 0.035,
        );
      wp.needsUpdate = true;
      particles.position.y =
        p.biome === 'ice' || p.biome === 'ash'
          ? -((t * 0.7) % 12)
          : Math.sin(t * 0.2) * 0.5;
    },
  };
}
