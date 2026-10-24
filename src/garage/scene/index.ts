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
import { createFrameProbe } from "./probe";
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
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.4, 0.95);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let world: World | null = null;
  let car: RiggedCar | null = null;
  let effects: Effects | null = null;
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
    renderer.compile(scene, camera);
  })();

  const probe = createFrameProbe();
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
      if (!world || !car || !effects) return;
      const now = performance.now();
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
      lastFrame = now;
      car.group.position.x = s.carX;
      car.group.rotation.y = s.tableTurn;
      car.apply(s);
      world.apply(s, { carX: s.carX, carLength: car.length });
      effects.apply(s, car, dt);
      renderer.toneMappingExposure = EXPOSURE * (1 - s.transition * 0.95);
      camera.position.set(...s.camera.pos);
      camera.lookAt(look.set(...s.camera.look));
    },
    render() {
      if (!car) return;
      composer.render();
      if (probe.frame(performance.now()) === "slow") slow.forEach((cb) => cb());
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
      car?.dispose();
      world?.dispose();
      env.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
