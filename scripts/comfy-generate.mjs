// Queue garage assets on the local ComfyUI and download the results.
// usage: node scripts/comfy-generate.mjs <art/comfy/prompts.json | audio.json> [--only <id>] [--workflow <name>]
//   Each entry: { id, workflow, prompt, negative?, seeds: number[], width?, height?, seconds?, bpm?, keyscale?, upscale? }.
//   The workflow (art/comfy/workflows/<workflow>.json, API format) is patched through nodes titled
//   PROMPT, NEGATIVE, SEED, SIZE (width/height or seconds). Results land in art/comfy/out/<id>-<seed>.<ext>.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const COMFY = process.env.COMFY_URL ?? "http://127.0.0.1:8188";
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const workflow = args.includes("--workflow") ? args[args.indexOf("--workflow") + 1] : null;
if (!file) throw new Error("usage: node scripts/comfy-generate.mjs <prompts.json> [--only <id>]");
const root = path.dirname(path.dirname(file)) === "art" ? "art/comfy" : path.dirname(file);
const out = path.join(root, "out");
mkdirSync(out, { recursive: true });

const byTitle = (wf, title) => Object.values(wf).find((n) => n._meta?.title === title);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(wf) {
  const res = await fetch(`${COMFY}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: wf }) });
  const { prompt_id, error, node_errors } = await res.json();
  if (!prompt_id) throw new Error(JSON.stringify({ error, node_errors }));
  for (;;) {
    await sleep(1500);
    const h = await (await fetch(`${COMFY}/history/${prompt_id}`)).json();
    const entry = h[prompt_id];
    if (!entry) continue;
    if (entry.status?.status_str === "error") throw new Error(JSON.stringify(entry.status.messages));
    if (entry.status?.completed) return Object.values(entry.outputs).flatMap((o) => [...(o.images ?? []), ...(o.audio ?? [])]);
  }
}

async function download(item, dest) {
  const q = new URLSearchParams({ filename: item.filename, subfolder: item.subfolder ?? "", type: item.type ?? "output" });
  const buf = Buffer.from(await (await fetch(`${COMFY}/view?${q}`)).arrayBuffer());
  writeFileSync(dest, buf);
  return buf;
}

async function upscale(buf, name) {
  const form = new FormData();
  form.append("image", new Blob([buf]), name);
  form.append("overwrite", "true");
  const up = await (await fetch(`${COMFY}/upload/image`, { method: "POST", body: form })).json();
  const wf = JSON.parse(readFileSync(path.join(root, "workflows/upscale_esrgan.json"), "utf8"));
  byTitle(wf, "INPUT").inputs.image = up.name;
  return (await run(wf))[0];
}

const entries = JSON.parse(readFileSync(file, "utf8")).filter((e) => (!only || e.id === only) && (!workflow || e.workflow === workflow));
for (const e of entries) {
  for (const seed of e.seeds) {
    const wf = JSON.parse(readFileSync(path.join(root, `workflows/${e.workflow}.json`), "utf8"));
    byTitle(wf, "PROMPT").inputs[byTitle(wf, "PROMPT").inputs.tags !== undefined ? "tags" : "text"] = e.prompt;
    if (e.negative && byTitle(wf, "NEGATIVE")) byTitle(wf, "NEGATIVE").inputs.text = e.negative;
    const seedNode = byTitle(wf, "SEED").inputs;
    seedNode[seedNode.noise_seed !== undefined ? "noise_seed" : "seed"] = seed;
    const size = byTitle(wf, "SIZE")?.inputs;
    if (size && e.width) Object.assign(size, { width: e.width, height: e.height });
    if (size && e.seconds) size.seconds = e.seconds;
    // Stable Audio also conditions on the clip length
    for (const n of Object.values(wf)) if (e.seconds && n.inputs.seconds_total !== undefined) n.inputs.seconds_total = e.seconds;
    // text-to-audio encoders carry their own seed, length, tempo and key
    const enc = byTitle(wf, "PROMPT").inputs;
    if (enc.seed !== undefined) enc.seed = seed;
    for (const k of ["bpm", "keyscale"]) if (e[k] !== undefined && enc[k] !== undefined) enc[k] = e[k];
    if (e.seconds && enc.duration !== undefined) enc.duration = e.seconds;
    const t0 = Date.now();
    const [item] = await run(wf);
    const ext = path.extname(item.filename);
    const dest = path.join(out, `${e.id}-${seed}${ext}`);
    const buf = await download(item, dest);
    if (e.upscale) await download(await upscale(buf, `${e.id}-${seed}${ext}`), path.join(out, `${e.id}-${seed}-up${ext}`));
    console.log(`${dest} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
}
