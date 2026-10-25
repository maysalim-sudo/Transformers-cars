// Camera poses for the fallback stills, straight from the live timeline, so the stills match the scene.
// usage: npx vite-node scripts/still-poses.ts   → art/garage-stills/poses.json (read by blender/garage/render_stills.py)
import { mkdirSync, writeFileSync } from "node:fs";
import { stateAt } from "../src/garage/timeline";

type Still = { name: string; aspect: "16x9" | "9x16"; p: number; rtl?: boolean };
const STILLS: Still[] = [
  { name: "arrival", aspect: "16x9", p: 0 },
  // right-to-left pages put the headline on the right, so their arrival picture shifts the other way
  { name: "arrival_rtl", aspect: "16x9", p: 0, rtl: true },
  { name: "arrival", aspect: "9x16", p: 0 },
  { name: "paint", aspect: "16x9", p: 0.675 },
  { name: "paint", aspect: "9x16", p: 0.675 },
  { name: "reveal", aspect: "16x9", p: 1 },
  { name: "reveal", aspect: "9x16", p: 1 },
];

const poses = STILLS.map(({ name, aspect, p, rtl }) => {
  const s = stateAt(p, { portrait: aspect === "9x16", rtl });
  return { name, aspect, p, carX: s.carX, ...s.camera, paintSweep: s.paintSweep, tableTurn: s.tableTurn };
});
mkdirSync("art/garage-stills", { recursive: true });
writeFileSync("art/garage-stills/poses.json", JSON.stringify(poses, null, 2) + "\n");
console.log(`wrote ${poses.length} poses to art/garage-stills/poses.json`);
