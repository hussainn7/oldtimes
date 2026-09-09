import * as T from 'three';
import type { WorldProps } from '../World';
import { ModelKit, makeAnimal, makeExplorer } from './models';
import { AssetLibrary, disposeObjects } from './assets';
import { buildHabitat } from './environment';
import { WORLD_SCALE, riverZ, stepPosition } from './terrain';

export function createExpedition(
  canvas: HTMLCanvasElement,
  label: HTMLDivElement,
  read: () => WorldProps,
  onFailure: () => void,
) {
  const context = canvas.getContext('webgl2', {
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  });
  if (!context) throw new Error('WebGL2 unavailable');
  const renderer = new T.WebGLRenderer({
    canvas,
    context,
    antialias: true,
    alpha: false,
  });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(47, 1, 0.15, 320);
  const hemi = new T.HemisphereLight('#cfdfda', '#424633', 2.1);
  scene.add(hemi);
  const sun = new T.DirectionalLight('#ffe1ac', 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -25,
    right: 25,
    top: 25,
    bottom: -25,
    near: 1,
    far: 100,
  });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.045;
  scene.add(sun, sun.target);
  const sunDisc = new T.Mesh(
    new T.SphereGeometry(3.5, 16, 12),
    new T.MeshBasicMaterial({ color: '#fff0c9', fog: false }),
  );
  sunDisc.position.set(100, 43, -180);
  scene.add(sunDisc);
  // Gradient sky is geometry behind the world; fog carries its horizon into the hills.
  const sky = new T.Mesh(
    new T.SphereGeometry(300, 24, 12),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new T.Color('#557d81') },
        bottom: { value: new T.Color('#c6cbb0') },
      },
      vertexShader:
        'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:
        'uniform vec3 top;uniform vec3 bottom;varying vec3 vDirection;void main(){float h=clamp(normalize(vDirection).y*2.0,0.0,1.0);gl_FragColor=vec4(mix(bottom,top,pow(h,0.65)),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}',
    }),
  );
  scene.add(sky);
  let assets = new AssetLibrary(),
    kit = new ModelKit();
  let habitat: ReturnType<typeof buildHabitat>;
  let player: ReturnType<typeof makeExplorer>,
    playerHost = new T.Group();
  type Animal = {
    species: WorldProps['period']['species'][number];
    model: ReturnType<typeof makeAnimal>;
    host: T.Group;
    x: number;
    z: number;
    homeX: number;
    homeZ: number;
    heading: number;
    pace: number;
    mode: string;
  };
  let animals: Animal[] = [],
    key = '',
    frame = 0,
    last = 0,
    time = 0,
    reportTime = 0;
  let velocityX = 0,
    velocityZ = 0,
    yaw = 0.22,
    pitch = 0.24,
    zoom = 22,
    currentZoom = 22;
  let dragging: number | null = null,
    pointerX = 0,
    pointerY = 0;
  let stopped = false,
    oldWorld = read().worldRef.current;
  const keys = new Set<string>(),
    target = new T.Vector3(),
    desired = new T.Vector3(),
    projected = new T.Vector3();
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1,
    height = 1,
    dpr = Math.min(devicePixelRatio, 1.5),
    samples = 0,
    sampleTime = 0;
  function resize() {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(dpr, width < 700 ? 1.25 : 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  function rebuild() {
    const p = read();
    if (habitat) {
      scene.remove(habitat.root, playerHost);
      disposeObjects(habitat.root);
      disposeObjects(playerHost);
    }
    assets.dispose();
    assets = new AssetLibrary();
    kit = new ModelKit();
    habitat = buildHabitat(p.period, p.region, kit, assets);
    scene.add(habitat.root);
    player = makeExplorer(kit);
    playerHost = new T.Group();
    playerHost.add(player.root);
    scene.add(playerHost);
    void assets.replace('characters/explorer', playerHost, player.root, () =>
      Math.hypot(velocityX, velocityZ) > 0.2
        ? keys.has('shift')
          ? 'run'
          : 'walk'
        : 'idle',
    );
    animals = p.period.species.map((species, i) => {
      const model = makeAnimal(species, kit),
        host = new T.Group();
      host.add(model.root);
      habitat.root.add(host);
      const marine = p.period.biome === 'ocean' || species.behavior === 'swim';
      const homeX = 18 + i * 12,
        homeZ = marine ? riverZ(homeX) - 1 : -4 - (i % 3) * 2;
      const animal: Animal = {
        species,
        model,
        host,
        x: homeX,
        z: homeZ,
        homeX,
        homeZ,
        heading: 0,
        pace: 0,
        mode: 'idle',
      };
      const id = species.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      // Animals face +X; export character +Z. Correct model forward through sidecar rotationY.
      void assets.replace(`animals/${id}`, host, model.root, () => animal.mode);
      return animal;
    });
    const horizon = new T.Color(p.period.sky[1]);
    scene.fog = new T.FogExp2(
      horizon,
      p.period.biome === 'ash'
        ? 0.022
        : p.period.biome === 'swamp'
          ? 0.016
          : 0.008,
    );
    sky.material.uniforms.top.value.set(p.period.sky[0]);
    sky.material.uniforms.bottom.value.copy(horizon);
    hemi.color.set(p.period.biome === 'ice' ? '#d2e8fa' : '#d4e6de');
    sun.color.set(
      p.period.biome === 'volcanic'
        ? '#ff9c54'
        : p.period.biome === 'ice'
          ? '#e2efff'
          : '#ffe1ac',
    );
    sun.intensity = p.period.biome === 'ash' ? 0.7 : 3.1;
    renderer.toneMappingExposure = p.period.biome === 'ash' ? 1.1 : 1.35;
    sunDisc.visible = p.period.biome !== 'ash';
    velocityX = velocityZ = 0;
    keys.clear();
    p.direction.current = p.depth.current = 0;
    reportTime = 0;
    canvas.dataset.period = p.period.id;
    canvas.dataset.biome = p.period.biome;
    canvas.dataset.species = String(animals.length);
  }
  function clear() {
    keys.clear();
    velocityX = velocityZ = 0;
    dragging = null;
    read().direction.current = read().depth.current = 0;
    read().worldRef.current.moving = false;
  }
  function down(e: KeyboardEvent) {
    if (
      (e.target as HTMLElement).closest(
        'input,select,textarea,[role="slider"],[role="dialog"],[contenteditable="true"]',
      )
    )
      return;
    const k = e.key.toLowerCase();
    if (
      [
        'a',
        'd',
        'w',
        's',
        'arrowleft',
        'arrowright',
        'arrowup',
        'arrowdown',
        'shift',
        'r',
      ].includes(k) &&
      read().active
    ) {
      e.preventDefault();
      keys.add(k);
      if (k === 'r') {
        yaw = 0.22;
        pitch = 0.24;
        zoom = 22;
      }
    }
  }
  const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  const pointerDown = (e: PointerEvent) => {
    if (!read().active || e.button !== 0) return;
    dragging = e.pointerId;
    pointerX = e.clientX;
    pointerY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.focus({ preventScroll: true });
  };
  const pointerMove = (e: PointerEvent) => {
    if (dragging !== e.pointerId || !read().active) return;
    yaw -= (e.clientX - pointerX) * 0.005;
    pitch = T.MathUtils.clamp(pitch + (e.clientY - pointerY) * 0.003, 0.2, 0.9);
    pointerX = e.clientX;
    pointerY = e.clientY;
  };
  const pointerUp = () => {
    dragging = null;
  };
  const wheel = (e: WheelEvent) => {
    if (read().active) {
      e.preventDefault();
      zoom = T.MathUtils.clamp(zoom + e.deltaY * 0.014, 12, 32);
    }
  };
  const visibility = () => {
    clear();
    last = 0;
  };
  const contextLost = (e: Event) => {
    e.preventDefault();
    cleanup();
    onFailure();
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('lostpointercapture', pointerUp);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('webglcontextlost', contextLost);
  function draw(now: number) {
    if (stopped) return;
    frame = requestAnimationFrame(draw);
    if (document.hidden) {
      last = now;
      return;
    }
    const rawDt = last ? (now - last) / 1000 : 0.016,
      dt = Math.min(rawDt, 0.05);
    last = now;
    const p = read(),
      s = p.worldRef.current,
      reduced = reducedQuery.matches;
    const nextKey = `${p.period.id}/${p.region.id}`;
    const changed = nextKey !== key || oldWorld !== s;
    if (nextKey !== key) {
      key = nextKey;
      rebuild();
    }
    if (changed) {
      velocityX = velocityZ = 0;
      oldWorld = s;
      keys.clear();
    }
    if (!p.active) {
      velocityX = velocityZ = 0;
      keys.clear();
      p.direction.current = p.depth.current = 0;
    }
    const animate = p.active || !p.showLabels;
    if (animate) time += dt;
    const right = p.active
      ? Number(keys.has('d') || keys.has('arrowright')) -
        Number(keys.has('a') || keys.has('arrowleft')) +
        p.direction.current
      : 0;
    const forward = p.active
      ? Number(keys.has('w') || keys.has('arrowup')) -
        Number(keys.has('s') || keys.has('arrowdown')) +
        p.depth.current
      : 0;
    const length = Math.max(1, Math.hypot(right, forward)),
      speed = keys.has('shift') ? 5.4 : 3.6;
    const dx =
      ((right * Math.cos(yaw) - forward * Math.sin(yaw)) / length) * speed;
    const dz =
      ((-right * Math.sin(yaw) - forward * Math.cos(yaw)) / length) * speed;
    const smoothing = 1 - Math.exp(-dt * (right || forward ? 10 : 16));
    velocityX = T.MathUtils.lerp(velocityX, dx, smoothing);
    velocityZ = T.MathUtils.lerp(velocityZ, dz, smoothing);
    if (Math.hypot(velocityX, velocityZ) < 0.025) velocityX = velocityZ = 0;
    const x = s.x / WORLD_SCALE,
      z = s.z ?? 3;
    const next = stepPosition(
      x,
      z,
      velocityX * dt,
      velocityZ * dt,
      habitat.obstacles,
    );
    s.x = next.x * WORLD_SCALE;
    s.z = next.z;
    const travelled = Math.hypot(next.x - x, next.z - z);
    s.distance += travelled * WORLD_SCALE;
    s.moving = travelled > 0.0001;
    playerHost.position.set(next.x, habitat.height(next.x, next.z), next.z);
    if (s.moving) {
      const heading = Math.atan2(velocityX, velocityZ);
      playerHost.rotation.y +=
        Math.atan2(
          Math.sin(heading - playerHost.rotation.y),
          Math.cos(heading - playerHost.rotation.y),
        ) *
        (1 - Math.exp(-dt * 14));
    }
    player.animate(
      time,
      Math.min(1, Math.hypot(velocityX, velocityZ) / 3.6),
      reduced,
    );
    let nearest: Animal | undefined,
      nearDistance = Infinity;
    for (const [i, a] of animals.entries()) {
      const diffX = next.x - a.x,
        diffZ = next.z - a.z,
        distance = Math.hypot(diffX, diffZ);
      const flying = a.species.behavior === 'fly',
        swimming = p.period.biome === 'ocean' || a.species.behavior === 'swim';
      const flee = a.species.behavior === 'flee' && distance < 7;
      const alert = a.species.behavior === 'hunt' && distance < 8;
      const walking = Math.sin(time * 0.38 + i * 1.7) > -0.35;
      const goalX = flee
        ? a.x - (diffX / Math.max(0.1, distance)) * 5
        : a.homeX + Math.sin(time * 0.13 + i) * 3.5;
      const goalZ = flee
        ? a.z - (diffZ / Math.max(0.1, distance)) * 5
        : a.homeZ + Math.sin(time * 0.17 + i) * 1.4;
      a.pace = flee ? 2 : alert ? 0 : walking || flying || swimming ? 0.55 : 0;
      a.mode = flee
        ? 'flee'
        : alert
          ? 'alert'
          : flying
            ? 'fly'
            : swimming
              ? 'swim'
              : a.pace
                ? 'walk'
                : 'graze';
      if (animate) {
        const gx = goalX - a.x,
          gz = goalZ - a.z,
          gd = Math.max(0.1, Math.hypot(gx, gz));
        a.x = T.MathUtils.clamp(a.x + (gx / gd) * a.pace * dt, 6, 119);
        if (!swimming && !flying) {
          const safe = stepPosition(a.x, a.z, 0, 0, habitat.obstacles);
          a.x = safe.x;
          a.z = safe.z;
        }
        a.z = swimming
          ? a.homeZ + Math.sin(time * 0.17 + i) * 1.4
          : T.MathUtils.clamp(a.z + (gz / gd) * a.pace * dt, -10, 7);
        const heading = alert ? Math.atan2(-diffZ, diffX) : Math.atan2(-gz, gx);
        a.heading +=
          Math.atan2(
            Math.sin(heading - a.heading),
            Math.cos(heading - a.heading),
          ) * Math.min(1, dt * 2.5);
      }
      a.host.position.set(
        a.x,
        flying
          ? 8 + Math.sin(time * 0.6 + i)
          : swimming
            ? (p.period.biome === 'ocean' ? -0.45 : -1.25) +
              Math.sin(time + i) * 0.1
            : habitat.height(a.x, a.z),
        a.z,
      );
      a.host.rotation.y = a.heading;
      a.model.animate(reduced ? 0 : time + i, a.pace);
      if (distance < nearDistance) {
        nearest = a;
        nearDistance = distance;
      }
    }
    s.nearby =
      nearest && nearDistance < (p.period.biome === 'ocean' ? 22 : 9)
        ? nearest.species.name
        : '';
    currentZoom = T.MathUtils.lerp(
      currentZoom,
      zoom * (width < 700 ? 1.65 : 1),
      reduced ? 1 : 1 - Math.exp(-dt * 6),
    );
    target.set(
      next.x + (width < 700 ? 3.5 : 1.5),
      playerHost.position.y + 1.7,
      next.z - 2.4,
    );
    desired.set(
      target.x + Math.sin(yaw) * Math.cos(pitch) * currentZoom,
      target.y + Math.sin(pitch) * currentZoom,
      target.z + Math.cos(yaw) * Math.cos(pitch) * currentZoom,
    );
    desired.y = Math.max(desired.y, habitat.height(desired.x, desired.z) + 2);
    camera.position.lerp(
      desired,
      changed || reduced ? 1 : 1 - Math.exp(-dt * 5),
    );
    camera.lookAt(target);
    sky.position.copy(camera.position);
    sun.position.set(next.x - 18, 35, next.z - 24);
    sun.target.position.set(next.x, 0, next.z - 4);
    habitat.update(time, reduced);
    assets.update(animate ? dt : 0);
    if (s.nearby && p.showLabels && nearest && !changed) {
      projected
        .copy(nearest.host.position)
        .add(
          new T.Vector3(
            0,
            nearest.species.kind === 'sauropod'
              ? 4.4 * nearest.species.size
              : 3.5,
            0,
          ),
        )
        .project(camera);
      const visible =
        projected.z < 1 &&
        Math.abs(projected.x) < 0.88 &&
        projected.y < 0.35 &&
        projected.y > -0.55;
      label.style.display = visible ? 'block' : 'none';
      label.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
      label.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
      label.textContent = `${nearest.species.name} · ${nearest.mode === 'alert' ? 'Alert — keep your distance' : nearest.mode === 'flee' ? 'Retreating' : 'E to observe'}`;
    } else label.style.display = 'none';
    reportTime += dt;
    if (reportTime > 0.25) {
      reportTime = 0;
      if (p.active) p.onExplore(s.distance);
      canvas.dataset.x = s.x.toFixed(2);
      canvas.dataset.z = s.z.toFixed(2);
      canvas.dataset.nearby = s.nearby;
      canvas.dataset.loadedModels = String(assets.loadedCount);
      canvas.dataset.failedModels = String(assets.failedCount);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.triangles = String(renderer.info.render.triangles);
      canvas.dataset.geometries = String(renderer.info.memory.geometries);
    }
    renderer.render(scene, camera);
    // Reduce fill rate only after sustained slow frames; never rebuild gameplay for quality changes.
    if (rawDt < 0.2) {
      samples++;
      sampleTime += rawDt;
    }
    if (samples >= 180) {
      const fps = samples / sampleTime;
      canvas.dataset.fps = fps.toFixed(0);
      if (fps < 42 && dpr > 0.85) {
        dpr = Math.max(0.85, dpr - 0.2);
        resize();
      }
      samples = sampleTime = 0;
    }
  }
  try {
    draw(performance.now());
  } catch (error) {
    cleanup();
    throw error;
  }
  function cleanup() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    clear();
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', clear);
    document.removeEventListener('visibilitychange', visibility);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerUp);
    canvas.removeEventListener('lostpointercapture', pointerUp);
    canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('webglcontextlost', contextLost);
    assets.dispose();
    disposeObjects(scene);
    sun.shadow.dispose();
    renderer.dispose();
  }
  return cleanup;
}
