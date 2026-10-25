/**
 * `?debug` on the page: a small readout of what the garage hero decided on this device (mode, start tier and
 * drops, frame rate, GPU, load time), so a test on a real phone can be read off the screen. Absent otherwise.
 */
export type DebugHud = { set(key: string, value: string): void; frame(now: number): void; remove(): void };

export function createDebugHud(search: string): DebugHud | null {
  if (!new URLSearchParams(search).has("debug")) return null;
  const el = document.createElement("pre");
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed", left: "8px", top: "72px", zIndex: "9999", margin: "0", padding: "8px 10px", maxWidth: "calc(100vw - 16px)",
    font: "11px/1.45 ui-monospace, monospace", color: "#e8f0ff", background: "rgba(0,0,0,.72)", borderRadius: "8px",
    whiteSpace: "pre-wrap", pointerEvents: "none",
  });
  document.body.appendChild(el);
  const lines = new Map<string, string>();
  const t0 = performance.now();
  let frames = 0;
  let since = 0;
  const draw = () => (el.textContent = [...lines].map(([k, v]) => `${k}: ${v}`).join("\n"));
  return {
    set(key, value) {
      lines.set(key, `${value}  (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
      draw();
    },
    frame(now) {
      frames++;
      if (!since) since = now;
      if (now - since < 1000) return;
      lines.set("fps", String(Math.round((frames * 1000) / (now - since))));
      frames = 0;
      since = now;
      draw();
    },
    remove: () => el.remove(),
  };
}
