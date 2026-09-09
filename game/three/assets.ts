import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

type ModelEntry = {
  src: string;
  scale?: number;
  offsetY?: number;
  rotationY?: number;
  clips?: Record<string, string>;
};
type Manifest = { version: number; models: Record<string, ModelEntry> };
let manifest: Promise<Manifest> | undefined;
function readManifest(): Promise<Manifest> {
  return (manifest ??= fetch('/assets/manifest.json')
    .then((r) => {
      if (!r.ok) throw new Error('No asset index');
      return r.json();
    })
    .then(
      (v: unknown): Manifest =>
        v &&
        typeof v === 'object' &&
        'version' in v &&
        v.version === 1 &&
        'models' in v &&
        v.models &&
        typeof v.models === 'object'
          ? (v as Manifest)
          : { version: 1, models: {} },
    )
    .catch((): Manifest => ({ version: 1, models: {} })));
}
export function disposeObjects(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  root.traverse((obj) => {
    if (obj instanceof T.Mesh || obj instanceof T.Points) {
      geometries.add(obj.geometry);
      for (const mat of Array.isArray(obj.material)
        ? obj.material
        : [obj.material]) {
        materials.add(mat);
        for (const value of Object.values(mat))
          if (value instanceof T.Texture) textures.add(value);
      }
    }
    if (obj instanceof T.InstancedMesh) obj.dispose();
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => {
    t.dispose();
    if (typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap)
      t.image.close();
  });
}
/** Scene-scoped cache: missing/broken files retain geometry; late loads never attach to a departed era. */
export class AssetLibrary {
  loadedCount = 0;
  failedCount = 0;
  private loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  private cache = new Map<
    string,
    Promise<{ gltf: GLTF; entry: ModelEntry } | null>
  >();
  private templates = new T.Group();
  private alive = true;
  private animations: {
    mixer: T.AnimationMixer;
    clips: Map<string, T.AnimationAction>;
    current: string;
    mode: () => string;
  }[] = [];
  async load(id: string) {
    if (!this.cache.has(id))
      this.cache.set(
        id,
        (async () => {
          const entry = (await readManifest()).models[id];
          if (!entry?.src || !this.alive) return null;
          try {
            const gltf = await this.loader.loadAsync(entry.src);
            if (!this.alive) {
              disposeObjects(gltf.scene);
              return null;
            }
            let meshCount = 0;
            gltf.scene.traverse((obj) => {
              if (
                obj instanceof T.Mesh &&
                obj.geometry.getAttribute('position')?.count
              )
                meshCount++;
            });
            if (!meshCount) {
              disposeObjects(gltf.scene);
              this.failedCount++;
              return null;
            }
            this.templates.add(gltf.scene);
            return { gltf, entry };
          } catch {
            this.failedCount++;
            return null;
          }
        })(),
      );
    return this.cache.get(id)!;
  }
  async replace(
    id: string,
    host: T.Group,
    fallback: T.Object3D,
    mode: () => string = () => 'idle',
  ) {
    const asset = await this.load(id);
    if (!asset || !this.alive) return;
    const model = clone(asset.gltf.scene);
    const { entry } = asset;
    model.scale.multiplyScalar(entry.scale ?? 1);
    model.position.y += entry.offsetY ?? 0;
    model.rotation.y += entry.rotationY ?? 0;
    model.traverse((obj) => {
      if (obj instanceof T.Mesh) {
        obj.castShadow = obj.receiveShadow = true;
      }
    });
    fallback.visible = false;
    host.add(model);
    this.loadedCount++;
    if (asset.gltf.animations.length) {
      const mixer = new T.AnimationMixer(model),
        clips = new Map<string, T.AnimationAction>();
      for (const clip of asset.gltf.animations)
        clips.set(clip.name.toLowerCase(), mixer.clipAction(clip));
      for (const [key, name] of Object.entries(entry.clips ?? {})) {
        const action = clips.get(name.toLowerCase());
        if (action) clips.set(key, action);
      }
      this.animations.push({ mixer, clips, current: '', mode });
    }
  }
  async replaceInstances(
    id: string,
    host: T.Group,
    fallback: T.Group,
    transforms: T.Matrix4[],
  ) {
    const asset = await this.load(id);
    if (!asset || !this.alive || asset.gltf.animations.length) return;
    const model = asset.gltf.scene;
    model.updateMatrixWorld(true);
    const correction = new T.Matrix4().compose(
      new T.Vector3(0, asset.entry.offsetY ?? 0, 0),
      new T.Quaternion().setFromAxisAngle(
        new T.Vector3(0, 1, 0),
        asset.entry.rotationY ?? 0,
      ),
      new T.Vector3().setScalar(asset.entry.scale ?? 1),
    );
    const replacement = instanceModel(
      model,
      transforms.map((m) => m.clone().multiply(correction)),
    );
    if (replacement.children.length) {
      fallback.visible = false;
      host.add(replacement);
      this.loadedCount++;
    }
  }
  update(dt: number) {
    for (const a of this.animations) {
      const requested = a.mode();
      const mode = a.clips.has(requested)
        ? requested
        : a.clips.has('idle')
          ? 'idle'
          : a.clips.keys().next().value!;
      if (mode !== a.current) {
        const next = a.clips.get(mode)!;
        next.reset().fadeIn(0.25).play();
        a.clips.get(a.current)?.fadeOut(0.25);
        a.current = mode;
      }
      a.mixer.update(dt);
    }
  }
  dispose() {
    this.alive = false;
    this.animations.forEach((a) => {
      a.mixer.stopAllAction();
      a.mixer.uncacheRoot(a.mixer.getRoot());
    });
    this.animations.length = 0;
    disposeObjects(this.templates);
    this.cache.clear();
  }
}
export function instanceModel(model: T.Object3D, transforms: T.Matrix4[]) {
  const group = new T.Group();
  model.updateMatrixWorld(true);
  model.traverse((obj) => {
    if (!(obj instanceof T.Mesh) || obj instanceof T.SkinnedMesh) return;
    const mesh = new T.InstancedMesh(
      obj.geometry,
      obj.material,
      transforms.length,
    );
    transforms.forEach((matrix, i) =>
      mesh.setMatrixAt(i, matrix.clone().multiply(obj.matrixWorld)),
    );
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  });
  return group;
}
