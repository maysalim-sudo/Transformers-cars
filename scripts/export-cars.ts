/**
 * Exports the code-built cars to GLB, as the starting point for the Blender models.
 * Run: npx vite-node --config vitest.config.ts scripts/export-cars.ts
 * Writes blender/source/<class>.glb in metres (MODEL_UNITS_PER_METRE), y up, nose to −x, left side to +z,
 * and the procedural textures to blender/textures/*.png with their tiling in textures.json.
 * The GLBs carry no images: Node has no canvas to encode them, so build_cars.py puts the PNGs back by
 * material name.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { crc32, deflateSync } from "node:zlib";
import type * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { carModels, modelIds } from "../src/car/models";
import { buildCar, MODEL_UNITS_PER_METRE } from "../src/car/three/buildCar";
import { textureImages } from "../src/car/three/textures";

// GLTFExporter reads its output through FileReader, which Node does not have
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onload: (() => void) | null = null;
  onloadend: (() => void) | null = null;
  private done() {
    this.onload?.();
    this.onloadend?.();
  }
  readAsArrayBuffer(b: Blob) {
    b.arrayBuffer().then((r) => ((this.result = r), this.done()));
  }
  readAsDataURL(b: Blob) {
    b.arrayBuffer().then((r) => ((this.result = `data:${b.type};base64,${Buffer.from(r).toString("base64")}`), this.done()));
  }
}
(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader;

/** a minimal RGBA PNG */
function png(size: number, rgba: Uint8Array) {
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])) >>> 0, 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // no filter
    Buffer.from(rgba.buffer, rgba.byteOffset + y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const texDir = path.resolve(__dirname, "../blender/textures");
mkdirSync(texDir, { recursive: true });
const tiling: Record<string, { tile: number; repeat: [number, number]; color: boolean }> = {};
for (const img of textureImages()) {
  writeFileSync(path.join(texDir, `${img.name}.png`), png(img.size, img.data));
  tiling[img.name] = { tile: img.tile, repeat: img.repeat, color: img.color };
}
writeFileSync(path.join(texDir, "textures.json"), JSON.stringify(tiling, null, 2));
console.log("textures", Object.keys(tiling).join(", "));

const MAPS = ["map", "normalMap", "clearcoatNormalMap", "bumpMap", "emissiveMap"] as const;

const out = path.resolve(__dirname, "../blender/source");
for (const id of modelIds) {
  const car = buildCar(carModels[id], { paint: carModels[id].paint, wheel: "split", tint: "none" });
  car.group.name = `car_${id}`;
  car.group.scale.multiplyScalar(1 / MODEL_UNITS_PER_METRE);
  car.group.position.multiplyScalar(1 / MODEL_UNITS_PER_METRE);
  // name every mesh under a part after the part, so Blender's outliner reads like the registry
  for (const [partId, roots] of car.parts) {
    roots.forEach((root, i) => {
      root.name = partId;
      if (roots.length > 1) root.userData.side = i === 0 ? "left" : "right";
      let n = 0;
      root.traverse((o) => {
        if (o !== root) o.name = `${partId}_${(o as { material?: { name: string } }).material?.name ?? "group"}_${n++}`;
      });
    });
  }
  // images are re-attached in Blender from blender/textures by material name
  car.group.traverse((o) => {
    const mat = (o as THREE.Mesh).material as (THREE.Material & Record<string, unknown>) | undefined;
    if (!mat) return;
    for (const k of MAPS) if (k in mat) mat[k] = null;
    // userData.source points at the textured source material, which the exporter would inline as extras
    mat.userData = {};
  });
  const glb = (await new GLTFExporter().parseAsync(car.group, { binary: true })) as ArrayBuffer;
  writeFileSync(path.join(out, `${id}.glb`), Buffer.from(glb));
  console.log(id, (glb.byteLength / 1024).toFixed(0), "KB");
  car.dispose();
}
