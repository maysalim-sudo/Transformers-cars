import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { type AnchorId, heroCar } from "../heroCar";
import type { GarageState } from "../timeline";
import { type RiggedCar, rigCar } from "./car";
import { createEffects, type Effects } from "./effects";
import { createGradePass } from "./grade";
import { createGrounding, type Grounding } from "./grounding";
import { createFrameProbe, type FrameProbe } from "./probe";
import { createFloorReflections, type FloorReflections } from "./reflections";
import { loadWorld, type World } from "./world";

export type Garage = {
  ready: Promise<void>;
  apply(s: GarageState): void;
  render(): void;
  project(id: AnchorId): { x: number; y: number; visible: boolean };
  resize(w: number, h: number, portrait: boolean): void;
  onSlow(cb: () => void): void;
  onLost(cb: () => void): void;
  dispose(): void;
};

const EXPOSURE = 0.72;
/** the site background matches the Blender world (deep night blue) */
const NIGHT = new THREE.Color().setRGB(0.006, 0.009, 0.02);

export function createGarage(canvas: HTMLCanvasElement, opts: { phone: boolean; reduced?: boolean }): Garage {
  const { phone, reduced = false } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !phone, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, phone ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  renderer.shadowMap.enabled = !phone;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = NIGHT;
  // a little haze: far walls recede and the light reads as air, not a void
  scene.fog = new THREE.FogExp2(new THREE.Color().setRGB(0.012, 0.016, 0.028), 0.016);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  camera.layers.enable(1); // the light shafts (the floor-reflection camera sees layer 0 only)

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.08, 0.98);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = createGradePass(reduced);
  composer.addPass(grade.pass);

  let world: World | null = null;
  let car: RiggedCar | null = null;
  let effects: Effects | null = null;
  let grounding: Grounding | null = null;
  let reflections: FloorReflections | null = null;
  let size = { w: 1, h: 1 };
  let disposed = false;
  const slow: (() => void)[] = [];
  const lost: (() => void)[] = [];

  const loader = new GLTFLoader();
  const ready = (async () => {
    const [w, carGltf] = await Promise.all([loadWorld(loader, scene, phone), loader.loadAsync(heroCar.url)]);
    if (disposed) return w.dispose();
    world = w;
    car = rigCar(carGltf.scene);
    car.group.traverse((o) => ((o as THREE.Mesh).isMesh && ((o.castShadow = true), (o.receiveShadow = true))));
    scene.add(car.group);
    effects = createEffects(scene, car, reduced);
    grounding = createGrounding(scene, car, phone);
    // real floor reflections cost a second scene render: desktop only
    if (!phone) {
      reflections = createFloorReflections(scene, w.root);
      reflections.resize(size.w, size.h);
    }
    renderer.compile(scene, camera);
  })();

  const probe = createFrameProbe();
  // the floor reflections go first: a device that cannot hold ~35 fps with them drops them, and only
  // then does the main probe judge it (so a mid-range laptop keeps the live scene, without mirrors)
  let extrasProbe: FrameProbe | null = createFrameProbe({ slowMs: 28, probeMs: 1000 });
  let mainProbe: FrameProbe | null = null;
  let lastFrame = 0;

  const onContextLost = (e: Event) => {
    e.preventDefault();
    lost.forEach((cb) => cb());
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  const look = new THREE.Vector3();
  const v = new THREE.Vector3();

  return {
    ready,
    apply(s) {
      if (!world || !car || !effects || !grounding) return;
      const now = performance.now();
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
      lastFrame = now;
      car.group.position.x = s.carX;
      car.group.rotation.y = s.tableTurn;
      car.apply(s);
      world.apply(s, { carX: s.carX, carLength: car.length });
      effects.apply(s, car, dt);
      grounding.apply(s);
      renderer.toneMappingExposure = EXPOSURE * (1 - s.transition * 0.95);
      camera.position.set(...s.camera.pos);
      camera.lookAt(look.set(...s.camera.look));
    },
    render() {
      if (!car) return;
      grade.tick(performance.now() / 1000);
      composer.render();
      const now = performance.now();
      if (extrasProbe) {
        const verdict = extrasProbe.frame(now);
        if (verdict) {
          extrasProbe = null;
          if (verdict === "slow" && reflections) {
            reflections.dispose();
            reflections = null;
          }
          mainProbe = probe;
        }
      } else if (mainProbe?.frame(now) === "slow") slow.forEach((cb) => cb());
    },
    project(id) {
      if (!car) return { x: 0, y: 0, visible: false };
      car.anchorWorld(id, v);
      v.project(camera);
      const visible = v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
      return { x: ((v.x + 1) / 2) * size.w, y: ((1 - v.y) / 2) * size.h, visible };
    },
    resize(w, h, portrait) {
      size = { w, h };
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      grade.resize(w, h);
      reflections?.resize(w, h);
      bloom.resolution.set(phone ? w / 2 : w, phone ? h / 2 : h);
      camera.aspect = w / h;
      camera.fov = portrait ? 52 : 36;
      camera.updateProjectionMatrix();
    },
    onSlow: (cb) => void slow.push(cb),
    onLost: (cb) => void lost.push(cb),
    dispose() {
      disposed = true;
      canvas.removeEventListener("webglcontextlost", onContextLost);
      effects?.dispose();
      grounding?.dispose();
      reflections?.dispose();
      car?.dispose();
      world?.dispose();
      env.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
