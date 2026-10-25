import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
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
import { createHandheld } from "./handheld";
import { createLadder, TIER_FEATURES, type Tier } from "./quality";
import { createFloorReflections, type FloorReflections } from "./reflections";
import { loadWorld, type World } from "./world";

export type Garage = {
  ready: Promise<void>;
  apply(s: GarageState): void;
  render(): void;
  project(id: AnchorId): { x: number; y: number; visible: boolean };
  resize(w: number, h: number, portrait: boolean): void;
  onSlow(cb: () => void): void;
  /** the ladder dropped to a lighter tier */
  onTier(cb: (tier: Tier) => void): void;
  onLost(cb: () => void): void;
  /** checks only (scripts/car-brightness.mjs): hide the garage so the car stands alone, to find its outline */
  isolateCar(on: boolean): void;
  dispose(): void;
};

const EXPOSURE = 0.72;
/** the site background matches the Blender world (deep night blue) */
const NIGHT = new THREE.Color().setRGB(0.006, 0.009, 0.02);

/**
 * `tier` is where the quality ladder starts (from the device pre-check); `pinned` holds it there
 * (the `?tier=` check), so it never drops and never falls back to the stills.
 */
export function createGarage(canvas: HTMLCanvasElement, opts: { phone: boolean; reduced?: boolean; tier: Tier; pinned?: boolean }): Garage {
  const { phone, reduced = false, pinned = false } = opts;
  let features = TIER_FEATURES[opts.tier];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !phone, powerPreference: "high-performance" });
  const dpr = () => Math.min(window.devicePixelRatio, phone ? 1.5 : Infinity, features.maxDpr);
  renderer.setPixelRatio(dpr());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  renderer.shadowMap.enabled = !phone && features.shadows;
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
  let size = { w: 1, h: 1, portrait: false };
  let disposed = false;
  const slow: (() => void)[] = [];
  const tierCbs: ((tier: Tier) => void)[] = [];
  const lost: (() => void)[] = [];

  // garage.glb is meshopt-compressed (scripts/compress-glb.sh)
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const ready = (async () => {
    const [w, carGltf] = await Promise.all([loadWorld(loader, scene, phone), loader.loadAsync(heroCar.url)]);
    if (disposed) return w.dispose();
    world = w;
    car = rigCar(carGltf.scene);
    car.group.traverse((o) => ((o as THREE.Mesh).isMesh && ((o.castShadow = true), (o.receiveShadow = true))));
    scene.add(car.group);
    effects = createEffects(scene, car, reduced);
    grounding = createGrounding(scene, car, phone);
    if (!features.shadows) shadowsOff();
    // real floor reflections cost a second scene render: desktop only
    if (!phone && features.reflections) {
      reflections = createFloorReflections(scene, w.root);
      reflections.resize(size.w, size.h);
    }
    renderer.compile(scene, camera);
  })();

  // the heaviest effects go first, one tier per slow second; only on the last tier does the main
  // check judge the scene itself (so a mid-range laptop keeps it live, with fewer effects)
  const ladder = pinned ? null : createLadder(opts.tier);
  let lastFrame = 0;

  function shadowsOff() {
    renderer.shadowMap.enabled = false;
    scene.traverse((o) => {
      const light = o as THREE.SpotLight;
      if (!light.isLight || !light.castShadow) return;
      light.castShadow = false; // changes the lights' state, so the materials recompile without shadows
      light.shadow.map?.dispose();
      light.shadow.map = null;
    });
  }

  function applyTier(tier: Tier) {
    features = TIER_FEATURES[tier];
    if (!features.reflections && reflections) {
      reflections.dispose();
      reflections = null;
    }
    if (!features.shadows && renderer.shadowMap.enabled) shadowsOff();
    if (renderer.getPixelRatio() !== dpr()) {
      renderer.setPixelRatio(dpr());
      composer.setPixelRatio(dpr());
      api.resize(size.w, size.h, size.portrait);
    }
    tierCbs.forEach((cb) => cb(tier));
  }

  const onContextLost = (e: Event) => {
    e.preventDefault();
    lost.forEach((cb) => cb());
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  const look = new THREE.Vector3();
  const handheld = createHandheld(reduced);
  const DEG = Math.PI / 180;
  const v = new THREE.Vector3();

  const api: Garage = {
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
      const sway = handheld.frame(now, s.camera.pos);
      camera.position.set(...s.camera.pos).add(v.set(...sway.offset));
      camera.lookAt(look.set(...s.camera.look));
      camera.rotateY(sway.yaw * DEG);
      camera.rotateX(sway.pitch * DEG);
      // a lens shift: the window onto the full view slides, so the picture moves away from the text
      const offsetX = -s.camera.shift * size.w;
      if (camera.fov !== s.camera.fov || offsetX !== (camera.view?.enabled ? camera.view.offsetX : 0)) {
        camera.fov = s.camera.fov;
        if (offsetX) camera.setViewOffset(size.w, size.h, offsetX, 0, size.w, size.h);
        else camera.clearViewOffset();
        camera.updateProjectionMatrix();
      }
    },
    render() {
      if (!car) return;
      grade.tick(performance.now() / 1000);
      composer.render();
      const verdict = ladder?.frame(performance.now());
      if (verdict === "drop") applyTier(ladder!.tier);
      else if (verdict === "stills") slow.forEach((cb) => cb());
    },
    project(id) {
      if (!car) return { x: 0, y: 0, visible: false };
      car.anchorWorld(id, v);
      v.project(camera);
      const visible = v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
      return { x: ((v.x + 1) / 2) * size.w, y: ((1 - v.y) / 2) * size.h, visible };
    },
    resize(w, h, portrait) {
      size = { w, h, portrait };
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      grade.resize(w, h);
      reflections?.resize(w, h);
      bloom.resolution.set(phone ? w / 2 : w, phone ? h / 2 : h);
      camera.aspect = w / h;
      camera.clearViewOffset(); // set again for the new size on the next frame
      camera.updateProjectionMatrix();
    },
    onSlow: (cb) => void slow.push(cb),
    onTier: (cb) => void tierCbs.push(cb),
    onLost: (cb) => void lost.push(cb),
    isolateCar(on) {
      if (world) world.root.visible = !on;
    },
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
  return api;
}
