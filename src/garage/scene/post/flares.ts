/**
 * Anamorphic lens flares: the brightest points (headlights, LED strips, lamp lenses) streak sideways in a thin
 * blue line, as through a film anamorphic lens. Bright pixels are kept at a quarter size, blurred along x
 * only, twice with a widening spread, and added back over the frame, tinted blue. Runs on the HDR image
 * (before tone mapping), so "bright" means really bright, not just white paint.
 */
import * as THREE from "three";
import { FullScreenQuad, Pass } from "three/examples/jsm/postprocessing/Pass.js";

const THRESHOLD = 2.2;
const STRENGTH = 0.35;
const TINT = new THREE.Color(0.55, 0.72, 1.0);

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const brightMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, threshold: { value: THRESHOLD } },
    vertexShader,
    fragmentShader: /* glsl */ `
      uniform sampler2D tColor;
      uniform float threshold;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tColor, vUv).rgb;
        if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        // soft knee: only what is past the threshold, in proportion
        gl_FragColor = vec4(c * max(0.0, l - threshold) / max(l, 1e-4), 1.0);
      }`,
  });

const streakMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, step: { value: 0 } },
    vertexShader,
    fragmentShader: /* glsl */ `
      uniform sampler2D tColor;
      uniform float step;
      varying vec2 vUv;
      void main() {
        vec3 sum = vec3(0.0);
        float total = 0.0;
        for (int i = -12; i <= 12; i++) {
          float w = exp(-abs(float(i)) * 0.22);
          sum += texture2D(tColor, vUv + vec2(float(i) * step, 0.0)).rgb * w;
          total += w;
        }
        gl_FragColor = vec4(sum / total, 1.0);
      }`,
  });

const addMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, tint: { value: TINT.clone().multiplyScalar(STRENGTH) } },
    vertexShader,
    fragmentShader: /* glsl */ `
      uniform sampler2D tColor;
      uniform vec3 tint;
      varying vec2 vUv;
      void main() { gl_FragColor = vec4(texture2D(tColor, vUv).rgb * tint, 1.0); }`,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });

export class FlarePass extends Pass {
  private readonly bright = brightMaterial();
  private readonly streak = streakMaterial();
  private readonly add = addMaterial();
  private readonly quad = new FullScreenQuad();
  private targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null;
  private size = { w: 1, h: 1 };

  constructor() {
    super();
    this.needsSwap = false; // adds onto the frame in place, as the bloom does
  }

  setSize(w: number, h: number) {
    this.size = { w, h };
    this.targets?.forEach((t) => t.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2)));
  }

  /** frees the quarter-size targets (a tier drop); they come back on the next render if re-enabled */
  release() {
    this.targets?.forEach((t) => t.dispose());
    this.targets = null;
  }

  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    if (!this.targets) {
      const make = () => new THREE.WebGLRenderTarget(Math.max(1, this.size.w >> 2), Math.max(1, this.size.h >> 2), { type: THREE.HalfFloatType });
      this.targets = [make(), make()];
    }
    const [a, b] = this.targets;
    const draw = (material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
      this.quad.material = material;
      renderer.setRenderTarget(target);
      this.quad.render(renderer);
    };
    this.bright.uniforms.tColor.value = readBuffer.texture;
    draw(this.bright, a);
    // two horizontal passes, the second four times wider: a long streak with a bright core
    const texel = 1 / a.width;
    this.streak.uniforms.tColor.value = a.texture;
    this.streak.uniforms.step.value = texel * 1.5;
    draw(this.streak, b);
    this.streak.uniforms.tColor.value = b.texture;
    this.streak.uniforms.step.value = texel * 6;
    draw(this.streak, a);
    this.add.uniforms.tColor.value = a.texture;
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    draw(this.add, this.renderToScreen ? null : readBuffer);
    renderer.autoClear = autoClear;
  }

  dispose() {
    this.release();
    [this.bright, this.streak, this.add].forEach((m) => m.dispose());
    this.quad.dispose();
  }
}
