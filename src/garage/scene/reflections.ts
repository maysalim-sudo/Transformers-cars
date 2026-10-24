/**
 * Real reflections in the floors (desktop only: it draws the scene a second time, at reduced size).
 * A three.js Reflector renders the scene mirrored in the floor plane; it draws nothing itself. The floor
 * materials sample that image, blurred by their own roughness (so the epoxy's wear breaks it up) and
 * weighted by angle (strong at grazing views, faint looking straight down), as on a real glossy floor.
 */
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import layout from "../layout.json";

/** how much mirror each floor material gets */
const STRENGTH: Record<string, number> = { floor_epoxy: 0.7, floor_show: 1.4, turntable_metal: 1.2 };

export type FloorReflections = { resize(w: number, h: number): void; dispose(): void };

export function createFloorReflections(scene: THREE.Scene, root: THREE.Object3D, scale = 0.5): FloorReflections {
  // covers the building's floors only (the street outside stays matte)
  const x0 = layout.show - 14;
  const x1 = layout.door;
  const geometry = new THREE.PlaneGeometry(x1 - x0, 24);
  const reflector = new Reflector(geometry, { textureWidth: 512, textureHeight: 512, clipBias: 0.003, multisample: 4 });
  reflector.rotateX(-Math.PI / 2);
  reflector.position.set((x0 + x1) / 2, 0, 0);
  // invisible, but still drawn first each frame, so its image is ready before the floors sample it
  const own = reflector.material as THREE.ShaderMaterial;
  own.colorWrite = false;
  own.depthWrite = false;
  reflector.renderOrder = -1;
  scene.add(reflector);

  const target = reflector.getRenderTarget();
  const reflectMatrix = new THREE.Matrix4();
  const toLocal = new THREE.Matrix4();
  const textureMatrix = own.uniforms.textureMatrix.value as THREE.Matrix4;
  const render = reflector.onBeforeRender.bind(reflector);
  reflector.onBeforeRender = (...args) => {
    render(...args);
    // the Reflector's matrix maps its own local space; the floors need world space
    reflectMatrix.copy(textureMatrix).multiply(toLocal.copy(reflector.matrixWorld).invert());
  };

  const patched: THREE.Material[] = [];
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!m || !(m.name in STRENGTH) || patched.includes(m)) return;
    const strength = STRENGTH[m.name];
    m.onBeforeCompile = (shader) => {
      shader.uniforms.tReflect = { value: target.texture };
      shader.uniforms.reflectMatrix = { value: reflectMatrix };
      shader.uniforms.reflectStrength = { value: strength };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform mat4 reflectMatrix;\nvarying vec4 vReflectUv;")
        .replace("#include <fog_vertex>", "#include <fog_vertex>\nvReflectUv = reflectMatrix * (modelMatrix * vec4(transformed, 1.0));");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform sampler2D tReflect;\nuniform float reflectStrength;\nvarying vec4 vReflectUv;")
        .replace(
          "#include <opaque_fragment>",
          /* glsl */ `
          {
            // the surface normal ripples the reflection a little; roughness widens the blur
            vec2 ruv = vReflectUv.xy / vReflectUv.w + normal.xy * 0.012;
            float spread = 0.001 + roughnessFactor * 0.012;
            vec3 refl = vec3(0.0);
            for (int i = 0; i < 8; i++) {
              float a = float(i) * 2.39996;
              float r = sqrt(float(i) + 0.5) / sqrt(8.0);
              vec3 t = texture2D(tReflect, ruv + vec2(cos(a), sin(a)) * r * spread).rgb;
              // a NaN or infinite texel (half-float overflow) would turn black under bloom and spread
              if (any(isnan(t)) || any(isinf(t))) t = vec3(0.0);
              refl += min(t, vec3(16.0));
            }
            refl /= 8.0;
            float facing = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
            float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
            outgoingLight += refl * reflectStrength * mix(0.06, 1.0, fresnel) * (1.0 - roughnessFactor * 0.85);
          }
          #include <opaque_fragment>`,
        );
    };
    m.customProgramCacheKey = () => `floor-reflect-${m.name}`;
    m.needsUpdate = true;
    patched.push(m);
  });

  return {
    resize(w, h) {
      target.setSize(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)));
    },
    dispose() {
      reflector.removeFromParent();
      reflector.dispose();
      geometry.dispose();
      for (const m of patched) {
        m.onBeforeCompile = () => {};
        m.needsUpdate = true;
      }
    },
  };
}
