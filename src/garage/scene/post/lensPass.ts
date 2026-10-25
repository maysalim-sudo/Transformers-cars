/**
 * The lens: camera motion blur and depth of field in one full-screen pass, straight after the scene render,
 * reading the depth that render kept (the composer's targets carry a DepthTexture), so neither effect draws
 * the scene again.
 * - Motion blur: each pixel's world point, seen through last frame's camera, gives its screen velocity;
 *   samples along it, scaled by the shutter (blurStrength). A point inside the car's box rode with the car, so
 *   it is carried back by the car's own move (lens.ts previousPoint): the car tracked by the camera stays
 *   sharp and the garage streaks past.
 * - Depth of field: a circle of confusion from the pixel's distance against the focus distance; a spiral
 *   gather whose taps only count where their own blur reaches back (so a sharp subject does not bleed).
 */
import * as THREE from "three";
import { FullScreenQuad, Pass } from "three/examples/jsm/postprocessing/Pass.js";

const TAPS = 16;
/** the largest blur circle, as a fraction of the frame height */
const MAX_COC = 0.014;
/** the longest motion streak, in uv */
const MAX_STREAK = 0.035;

const shader = {
  uniforms: {
    tColor: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    near: { value: 0.1 },
    far: { value: 200 },
    projInv: { value: new THREE.Matrix4() },
    viewInv: { value: new THREE.Matrix4() },
    prevViewProj: { value: new THREE.Matrix4() },
    carInv: { value: new THREE.Matrix4() },
    carPrev: { value: new THREE.Matrix4() },
    carCenter: { value: new THREE.Vector3() },
    carHalf: { value: new THREE.Vector3() },
    shutter: { value: 0 },
    focus: { value: 5 },
    aperture: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tColor;
    uniform sampler2D tDepth;
    uniform float near, far, shutter, focus, aperture;
    uniform mat4 projInv, viewInv, prevViewProj, carInv, carPrev;
    uniform vec3 carCenter, carHalf;
    uniform vec2 resolution;
    varying vec2 vUv;
    const int TAPS = ${TAPS};
    const float GOLDEN = 2.39996323;

    float distanceAt(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, near, far); }
    // blur circle radius in pixels
    float cocAt(float z) { return min(aperture * abs(z - focus) / max(z, 0.1), ${MAX_COC.toFixed(4)} * resolution.y); }

    void main() {
      float d = texture2D(tDepth, vUv).x;
      float z = -perspectiveDepthToViewZ(d, near, far);
      vec2 velocity = vec2(0.0);
      if (shutter > 0.0 && d < 1.0) {
        vec4 v = projInv * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
        vec4 world = viewInv * vec4(v.xyz / v.w, 1.0);
        // a point on the car moved with it (see lens.ts previousPoint)
        vec3 local = (carInv * world).xyz - carCenter;
        if (all(lessThanEqual(abs(local), carHalf))) world = carPrev * vec4(local + carCenter, 1.0);
        vec4 prev = prevViewProj * world;
        if (prev.w > 0.0) velocity = (vUv - (prev.xy / prev.w * 0.5 + 0.5)) * shutter;
        float len = length(velocity);
        if (len > ${MAX_STREAK.toFixed(3)}) velocity *= ${MAX_STREAK.toFixed(3)} / len;
      }
      float coc = aperture > 0.0 ? cocAt(z) : 0.0;
      vec3 base = texture2D(tColor, vUv).rgb;
      if (coc < 0.5 && length(velocity * resolution) < 0.5) { gl_FragColor = vec4(base, 1.0); return; }

      vec3 sum = base;
      float weight = 1.0;
      for (int i = 1; i < TAPS; i++) {
        float f = float(i) / float(TAPS - 1);
        float r = sqrt(f) * coc;
        vec2 offset = vec2(cos(float(i) * GOLDEN), sin(float(i) * GOLDEN)) * r / resolution + velocity * (f - 0.5);
        vec2 uv = clamp(vUv + offset, vec2(0.0), vec2(1.0));
        // a tap counts only if its own blur is as wide as its distance from here (sharp things stay sharp)
        float w = aperture > 0.0 ? smoothstep(r * 0.5, r + 0.5, cocAt(distanceAt(uv)) + 0.5) : 1.0;
        vec3 c = texture2D(tColor, uv).rgb;
        if (any(isnan(c)) || any(isinf(c))) continue;
        sum += c * w;
        weight += w;
      }
      gl_FragColor = vec4(sum / weight, 1.0);
    }`,
};

export class LensPass extends Pass {
  readonly uniforms = THREE.UniformsUtils.clone(shader.uniforms);
  private readonly material = new THREE.ShaderMaterial({ ...shader, uniforms: this.uniforms, depthTest: false, depthWrite: false });
  private readonly quad = new FullScreenQuad(this.material);

  setSize(w: number, h: number) {
    this.uniforms.resolution.value.set(w, h);
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    this.uniforms.tColor.value = readBuffer.texture;
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}

/** Drives the lens pass each frame: focus, aperture and the shutter, from the camera and the state. */
export function createLens() {
  const pass = new LensPass();
  const prev = new THREE.Matrix4();
  const prevCar = new THREE.Matrix4();
  let first = true;
  let dof = false;
  let blur = false;
  return {
    pass,
    /** switch each half; with both off the pass is skipped altogether */
    set(on: { dof: boolean; motionBlur: boolean }) {
      dof = on.dof;
      blur = on.motionBlur;
      pass.enabled = dof || blur;
    },
    /**
     * Call after the camera is placed for this frame. `shutter` comes from blurStrength (0 on a jump);
     * `focus` is the distance in metres, `aperture` 0 … 1 from apertureAt; `car` is the car's world matrix.
     */
    update(camera: THREE.PerspectiveCamera, opts: { focus: number; aperture: number; shutter: number; height: number; car: THREE.Matrix4 }) {
      const u = pass.uniforms;
      camera.updateMatrixWorld();
      u.near.value = camera.near;
      u.far.value = camera.far;
      u.projInv.value.copy(camera.projectionMatrixInverse);
      u.viewInv.value.copy(camera.matrixWorld);
      u.focus.value = opts.focus;
      // the blur circle scales with the frame, so the look holds at any size
      u.aperture.value = dof ? opts.aperture * opts.height * 0.016 : 0;
      u.shutter.value = blur && !first ? opts.shutter : 0;
      u.prevViewProj.value.copy(prev);
      prev.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      u.carInv.value.copy(opts.car).invert();
      u.carPrev.value.copy(first ? opts.car : prevCar);
      prevCar.copy(opts.car);
      first = false;
    },
    /** forget last frame (a resize): the next frame is drawn without motion blur */
    reset() {
      first = true;
    },
    /** the car's box in its own space (centre, half-extents), with room for the lift and a margin */
    setCarBox(center: THREE.Vector3, half: THREE.Vector3) {
      pass.uniforms.carCenter.value.copy(center);
      pass.uniforms.carHalf.value.copy(half);
    },
    dispose: () => pass.dispose(),
  };
}
