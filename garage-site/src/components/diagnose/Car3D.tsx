"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { type CarModelId, carModels } from "@/car/models";
import type { Livery, WheelStyle } from "@/car/palette";
import { getPart } from "@/car/registry";
import { type BuiltCar, buildCar } from "@/car/three/buildCar";
import { loadHdCar } from "@/car/three/hdCar";
import type { ViewId } from "@/car/views";
import { type Locale, pick } from "@/i18n/config";
import type { Strings } from "@/i18n/strings";

type Props = {
  model: CarModelId;
  view: ViewId;
  selected: ReadonlySet<string>;
  onToggle: (partId: string) => void;
  paint: string;
  tint: string;
  wheel: WheelStyle["id"];
  livery?: Livery["id"];
  locale: Locale;
  t: Strings;
  /** WebGL failed: the parent falls back to the drawings */
  onUnavailable: () => void;
};

const TARGET = new THREE.Vector3(0, 150, 0);
/** half the car length and height plus a margin, in model units */
const HALF_LEN = 580;
const HALF_H = 300;
/** camera direction per view (the car's left side faces +z, its nose −x) */
const VIEW_DIR: Record<ViewId, THREE.Vector3> = {
  front: new THREE.Vector3(-1, 0.18, 0.12),
  rear: new THREE.Vector3(1, 0.18, -0.12),
  left: new THREE.Vector3(0.05, 0.16, 1),
  right: new THREE.Vector3(-0.05, 0.16, -1),
  top: new THREE.Vector3(0.001, 1, 0.04),
  underside: new THREE.Vector3(0.001, -1, 0.04),
};
const HOME = new THREE.Vector3(-0.75, 0.32, 0.9);

/** Shadow under the car: a soft radial gradient, visible from above only. */
function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, "rgba(0,0,0,0.75)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/**
 * Real-time 3D inspection: orbit freely (including underneath), tap parts, explode the car.
 * Renders on demand only — the loop stops as soon as nothing moves or the canvas is off screen.
 */
export default function Car3D({ model, view, selected, onToggle, paint, tint, wheel, livery = "none", locale, t, onUnavailable }: Props) {
  const p = t.diagnose.parts;
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    render: () => void;
    flyTo: (dir: THREE.Vector3) => void;
    /** dolly towards (k < 1) or away from (k > 1) the car, within the controls' limits */
    zoom: (k: number) => void;
    setCar: (car: BuiltCar) => void;
    car: BuiltCar | null;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [sep, setSep] = useState(0);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const hoverRef = useRef<string | null>(null);
  const selectedRef = useRef(selected);
  const toggleRef = useRef(onToggle);
  const stateRef = useRef({ sep, paint, tint, livery });
  /** the class whose Blender model is showing; wheel-style changes leave it alone */
  const hdShown = useRef<CarModelId | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
    toggleRef.current = onToggle;
    stateRef.current = { sep, paint, tint, livery };
  });

  // ---- scene, renderer, controls (once) ----
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55; // studio reflections without turning the paint into chrome
    scene.add(new THREE.HemisphereLight("#dfe6ef", "#0a0b0d", 0.35));
    const key = new THREE.DirectionalLight("#ffffff", 1.6);
    key.position.set(-600, 1400, 900);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#f0b04e", 1.2); // amber brand back-light
    rim.position.set(900, 500, -1200);
    scene.add(rim);
    const under = new THREE.DirectionalLight("#9aa4b4", 0.7); // so the underside reads when flipped
    under.position.set(200, -1400, 300);
    scene.add(under);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1500, 700),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.5;
    scene.add(shadow);

    const camera = new THREE.PerspectiveCamera(30, 1, 10, 14000);
    camera.position.copy(HOME.clone().normalize().multiplyScalar(1800).add(TARGET));
    /** half the current car's length plus a margin; longer classes push the camera back */
    let halfLen = HALF_LEN;
    /** distance at which the whole car fits this canvas (portrait phones need to stand further back) */
    const fitDistance = () => {
      const v = THREE.MathUtils.degToRad(camera.fov) / 2;
      const h = Math.atan(Math.tan(v) * camera.aspect);
      // wide canvases see the car three-quarter on, nose towards the camera: keep more margin
      const margin = camera.aspect >= 1 ? 1.55 : 1.05;
      return Math.max(halfLen / Math.tan(h), HALF_H / Math.tan(v)) * margin;
    };
    let framedByUser = false;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(TARGET);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.minPolarAngle = 0.02;
    controls.maxPolarAngle = Math.PI - 0.02; // all the way round: look underneath
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.6;

    let car: BuiltCar | null = null;
    let raf = 0;
    let visible = true;
    let tween: { from: THREE.Vector3; to: THREE.Vector3; t0: number } | null = null;

    let inFrame = false;
    const frame = (now: number) => {
      raf = 0;
      // controls.update() fires "change" → render(); without this guard every frame would queue two
      inFrame = true;
      if (tween) {
        const k = Math.min(1, (now - tween.t0) / 700);
        const e = 1 - Math.pow(1 - k, 3);
        camera.position.copy(tween.from).lerp(tween.to, e);
        // keep the arc at a steady distance
        camera.position.sub(TARGET).setLength(THREE.MathUtils.lerp(tween.from.distanceTo(TARGET), tween.to.distanceTo(TARGET), e)).add(TARGET);
        if (k >= 1) tween = null;
      }
      const moving = controls.update();
      renderer.render(scene, camera);
      inFrame = false;
      if (visible && (moving || tween || controls.autoRotate)) raf = requestAnimationFrame(frame);
    };
    const render = () => {
      if (!raf && !inFrame && visible) raf = requestAnimationFrame(frame);
    };
    controls.addEventListener("change", render);
    controls.addEventListener("start", () => {
      controls.autoRotate = false; // the visitor took over
      framedByUser = true;
      tween = null;
    });

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      const fit = fitDistance();
      controls.minDistance = fit * 0.45;
      controls.maxDistance = fit * 2.2;
      if (!framedByUser) camera.position.sub(TARGET).setLength(fit).add(TARGET);
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) render();
    });
    io.observe(el);

    // page scroll wins over zoom unless ctrl (trackpad pinch) is held
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) e.stopPropagation();
    };
    el.addEventListener("wheel", onWheel, { capture: true });

    // ---- picking ----
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: { x: number; y: number } | null = null;
    const pickAt = (cx: number, cy: number) => {
      if (!car) return null;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      // only the nearest surface counts: never pick through the body to a part behind it
      const [hit] = ray.intersectObject(car.group, true);
      const id = hit?.object.userData.partId as string | undefined;
      return id && getPart(id).selectable ? id : null;
    };
    const paintHighlight = (id: string | null, prev: string | null) => {
      if (!car) return;
      if (prev && prev !== id) car.setHighlight(prev, selectedRef.current.has(prev) ? "selected" : "none");
      if (id) car.setHighlight(id, selectedRef.current.has(id) ? "selected" : "hover");
      render();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.buttons) return;
      const id = pickAt(e.clientX, e.clientY);
      const prev = hoverRef.current;
      if (id !== prev) {
        hoverRef.current = id;
        paintHighlight(id, prev);
      }
      const r = el.getBoundingClientRect();
      setHover(id ? { id, x: e.clientX - r.left, y: e.clientY - r.top } : null);
      el.style.cursor = id ? "pointer" : "grab";
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      down = null;
      const id = pickAt(e.clientX, e.clientY);
      if (id) toggleRef.current(id);
    };
    const onLeave = () => {
      const prev = hoverRef.current;
      hoverRef.current = null;
      paintHighlight(null, prev);
      setHover(null);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", onLeave);

    api.current = {
      render,
      car: null,
      flyTo: (dir) => {
        controls.autoRotate = false;
        tween = {
          from: camera.position.clone(),
          to: dir.clone().normalize().multiplyScalar(framedByUser ? camera.position.distanceTo(TARGET) : fitDistance()).add(TARGET),
          t0: performance.now(),
        };
        render();
      },
      zoom: (k) => {
        controls.autoRotate = false;
        framedByUser = true;
        const from = tween ? tween.to.clone() : camera.position.clone();
        const dist = THREE.MathUtils.clamp(from.distanceTo(TARGET) * k, controls.minDistance, controls.maxDistance);
        tween = { from: camera.position.clone(), to: from.sub(TARGET).setLength(dist).add(TARGET), t0: performance.now() };
        render();
      },
      setCar: (next) => {
        if (car) {
          scene.remove(car.group);
          car.dispose();
        }
        car = next;
        api.current!.car = next;
        scene.add(next.group);
        const size = new THREE.Box3().setFromObject(next.group).getSize(new THREE.Vector3());
        halfLen = Math.max(HALF_LEN, size.x / 2 + 30);
        if (!framedByUser) camera.position.sub(TARGET).setLength(fitDistance()).add(TARGET);
        render();
      },
    };
    setReady(true);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("wheel", onWheel, { capture: true });
      controls.dispose();
      car?.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, [onUnavailable]);

  // ---- the car: the code-built one at once, then the Blender model for the class when it has loaded ----
  useEffect(() => {
    if (!ready || !api.current) return;
    if (hdShown.current === model) return; // only the wheel style changed, and the Blender model has its own wheels
    hdShown.current = null;
    let live = true;
    const show = (car: BuiltCar) => {
      const s = stateRef.current;
      api.current!.setCar(car);
      car.setFinish({ paint: s.paint, tint: s.tint, livery: s.livery });
      car.setExplode(s.sep);
      for (const id of selectedRef.current) car.setHighlight(id, "selected");
    };
    show(buildCar(carModels[model], { paint, tint, wheel, livery }));
    loadHdCar(model, { paint, tint })
      .then((car) => {
        if (!live || !api.current) return car.dispose();
        show(car);
        hdShown.current = model;
      })
      .catch(() => {}); // no Blender model for this class: the code-built car stays
    return () => {
      live = false;
    };
    // paint, tint and explode are applied by their own effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, model, wheel]);

  useEffect(() => {
    api.current?.car?.setFinish({ paint, tint, livery });
    api.current?.render();
  }, [paint, tint, livery, ready]);

  useEffect(() => {
    api.current?.car?.setExplode(sep);
    api.current?.render();
  }, [sep, ready]);

  // selection from either the 3D view, the 2D view or the parts list
  useEffect(() => {
    const car = api.current?.car;
    if (!car) return;
    for (const id of car.parts.keys()) {
      if (id === hoverRef.current) continue;
      car.setHighlight(id, selected.has(id) ? "selected" : "none");
    }
    api.current?.render();
  }, [selected, ready, model, wheel]);

  // view tabs fly the camera
  const firstView = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    api.current?.flyTo(VIEW_DIR[view]);
  }, [view, ready]);

  return (
    <div className="relative h-[min(72vh,760px)] min-h-[420px] w-full select-none overflow-hidden rounded-2xl">
      <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" aria-label={p.hint3d} role="img" />
      {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-mist">{p.loading3d}</p>}

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-full border border-line-strong bg-ink-950/90 px-3 py-1.5 text-xs text-snow shadow-lg backdrop-blur"
          style={{ left: hover.x, top: hover.y }}
          role="status"
        >
          <span className="font-medium">{pick(getPart(hover.id).label, locale)}</span>
          <span className="ms-2 text-mist">{selected.has(hover.id) ? p.tapToRemove : p.tapToFlag}</span>
        </div>
      )}

      <div className="absolute end-3 top-3 flex gap-2">
        <button
          type="button"
          onClick={() => api.current?.zoom(1.35)}
          aria-label={p.zoomOut}
          title={p.zoomOut}
          className="grid size-9 place-items-center rounded-full border border-line-strong bg-ink-950/80 text-snow backdrop-blur transition-colors hover:bg-ink-800"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => api.current?.zoom(1 / 1.35)}
          aria-label={p.zoomIn}
          title={p.zoomIn}
          className="grid size-9 place-items-center rounded-full border border-line-strong bg-ink-950/80 text-snow backdrop-blur transition-colors hover:bg-ink-800"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => api.current?.flyTo(HOME)}
          aria-label={p.resetView}
          title={p.resetView}
          className="grid size-9 place-items-center rounded-full border border-line-strong bg-ink-950/80 text-snow backdrop-blur transition-colors hover:bg-ink-800"
        >
          ⟲
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-2 px-4">
        <label className="flex w-full max-w-xs items-center gap-3 rounded-full border border-line bg-ink-950/80 px-4 py-1.5 text-[11px] text-mist backdrop-blur">
          <span className="shrink-0">{p.separation}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={sep}
            onChange={(e) => setSep(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </label>
        <p className="hidden rounded-full bg-ink-950/70 px-3 py-1 text-center text-[11px] text-mist backdrop-blur sm:block">{p.hint3d}</p>
      </div>
    </div>
  );
}
