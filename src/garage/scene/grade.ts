/**
 * The last pass: the look of a graded film frame. Runs after tone mapping, on the display image.
 * Cool shadows, warm highlights, a vignette and fine animated grain (static under reduced motion).
 */
import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

const GradeShader = {
  name: "GradeShader",
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    time: { value: 0 },
    grain: { value: 0.045 },
    vignette: { value: 0.5 },
    aspect: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time, grain, vignette, aspect;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // split tone: night blue into the shadows, a little amber into the highlights
      c += vec3(-0.012, 0.0, 0.03) * (1.0 - smoothstep(0.0, 0.45, l));
      c += vec3(0.03, 0.012, -0.02) * smoothstep(0.55, 1.0, l);
      // gentle S-curve for contrast
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.22);
      // vignette, round on any screen shape
      vec2 d = (vUv - 0.5) * vec2(aspect, 1.0) / max(aspect, 1.0);
      c *= 1.0 - vignette * smoothstep(0.25, 0.85, length(d) * 1.35);
      // film grain, strongest in the mid-tones
      float n = hash(vUv * vec2(1931.0, 1543.0) + fract(time) * 97.0) - 0.5;
      c += n * grain * (1.0 - abs(l - 0.5) * 1.2);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export function createGradePass(reduced: boolean) {
  const pass = new ShaderPass(GradeShader);
  return {
    pass,
    tick(seconds: number) {
      if (!reduced) pass.uniforms.time.value = seconds * 24; // grain changes per film frame
    },
    resize(w: number, h: number) {
      pass.uniforms.aspect.value = w / h;
    },
  };
}
