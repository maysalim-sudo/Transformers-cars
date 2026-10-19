"use client";

import type { ComponentType, ReactNode } from "react";
import type { SideGeometry } from "../models/sideGeometry";
import { bounds, pathToPolygons } from "../three/path";
import { useArt } from "./context";
import { BrakeDisc, Caliper, Glass, Panel, Spring, Wheel } from "./primitives";

/** Wheel-well liner: the dark opening behind each wheel. */
function liner(g: SideGeometry, cx: number) {
  const r = 98 * g.wheel.scale;
  const h = Math.sqrt(Math.max(0, r * r - (368 - g.wheel.cy) ** 2));
  return `M${cx - h + 6} 368 A${r} ${r} 0 0 1 ${cx + h - 6} 368 Z`;
}

/** Scales sedan-sized wheel hardware around its centre for bigger (SUV) wheels. */
function AtWheel({ cx, children }: { cx: number; children: ReactNode }) {
  const { geo } = useArt();
  const s = geo.wheel.scale;
  const cy = geo.wheel.cy;
  return s === 1 ? <>{children}</> : <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>{children}</g>;
}

function Handle({ at }: { at: [number, number, number] }) {
  const [x, y, w] = at;
  return (
    <>
      <rect x={x} y={y} width={w} height="5" rx="2.5" fill="#07080a" />
      <path d={`M${x + 1} ${y} L${x + w - 1} ${y}`} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
    </>
  );
}

/**
 * Arch treatment, drawn inside each panel's own clip: black cladding bands and sill (SUV), or the
 * outer edge of body-coloured widebody flares, as a lit lip over a soft shadow (muscle saloon).
 */
function Cladding() {
  const { geo } = useArt();
  if (!geo.cladding && !geo.flares) return null;
  // a band just outside the arch opening, down to the sill, around each wheel centre
  const { cy, scale } = geo.wheel;
  const arcAt = (r: number) => {
    const dx = Math.sqrt(r * r - (376 - cy) ** 2);
    return (cx: number) => `M${cx - dx} 376 A${r} ${r} 0 1 1 ${cx + dx} 376`;
  };
  if (geo.flares) {
    const edge = arcAt(88 * scale + 32);
    return (
      <g fill="none">
        {[geo.wheel.front, geo.wheel.rear].map((cx) => (
          <g key={cx}>
            <path d={edge(cx)} stroke="rgba(0,0,0,0.35)" strokeWidth="6" transform="translate(0 3)" />
            <path d={edge(cx)} stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" />
          </g>
        ))}
      </g>
    );
  }
  const arc = arcAt(88 * scale + 18);
  return (
    <g>
      <path d={arc(geo.wheel.front)} stroke="#0a0b0d" strokeWidth="16" />
      <path d={arc(geo.wheel.rear)} stroke="#0a0b0d" strokeWidth="16" />
      <path d={`M0 ${cy + 16} L1200 ${cy + 16}`} stroke="#0a0b0d" strokeWidth="18" />
    </g>
  );
}

/** Racing-stripe livery in side view: a band along the flank below the waist, inside each panel's clip. */
function SideStripe() {
  const { geo, livery } = useArt();
  if (!livery) return null;
  const belt = bounds(pathToPolygons(geo.dlo)[0]).maxY;
  return <rect x="0" y={belt + 30} width="1200" height="14" fill={livery} />;
}

/** The twin top stripes seen edge-on: a band along the top of the hood, roof and boot. */
function TopStripe() {
  const { geo, livery } = useArt();
  if (!livery) return null;
  return <path d={geo.sil} fill="none" stroke={livery} strokeWidth="7" />;
}

/** Tuned side skirt along the sill, drawn inside each door's own clip. */
function SideSkirt() {
  const { geo, variant } = useArt();
  if (variant !== "tuned") return null;
  return <path d={`M${geo.wheel.front + 90} 352 L${geo.wheel.rear - 90} 350`} stroke="#050607" strokeWidth="6" />;
}

function BodyShell() {
  const { geo, url } = useArt();
  return (
    <g>
      <path d={geo.sil} fill="#0b0d10" />
      <path d={liner(geo, geo.wheel.front)} fill="#040506" />
      <path d={liner(geo, geo.wheel.rear)} fill="#040506" />
      {/* body-in-white structure, visible once panels lift away */}
      <g fill="none" stroke="rgba(213,217,224,0.13)" strokeWidth="1.2" clipPath={url("sil")}>
        {geo.structure.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path d={geo.sil} fill="none" stroke="rgba(213,217,224,0.08)" strokeWidth="1" />
      {geo.cage && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={geo.cage} stroke="#15171b" strokeWidth="9" />
          <path d={geo.cage} stroke="rgba(213,217,224,0.22)" strokeWidth="2" transform="translate(-1 -2)" />
        </g>
      )}
      {geo.spare && (
        <g>
          <rect x={geo.spare[0] - 26} y={geo.spare[1] - geo.spare[2]} width="52" height={geo.spare[2] * 2} rx="22" fill="#101114" />
          {Array.from({ length: 9 }, (_, i) => geo.spare![1] - geo.spare![2] + 16 + i * ((geo.spare![2] * 2 - 32) / 8)).map((y) => (
            <path key={y} d={`M${geo.spare![0] - 22} ${y} L${geo.spare![0] + 22} ${y}`} stroke="#1d2024" strokeWidth="3" />
          ))}
          <rect x={geo.spare[0] - 26} y={geo.spare[1] - geo.spare[2]} width="52" height={geo.spare[2] * 2} rx="22" fill="none" stroke="rgba(213,217,224,0.16)" />
        </g>
      )}
      {geo.lightBar && (
        <g>
          <rect x={geo.lightBar[0]} y={geo.lightBar[1] - 11} width={geo.lightBar[2]} height="9" rx="2" fill="#1b1e23" stroke="rgba(213,217,224,0.35)" strokeWidth="1" />
          <rect x={geo.lightBar[0] - 1} y={geo.lightBar[1] - 10} width="4" height="7" rx="1" fill="#eef4ff" />
        </g>
      )}
    </g>
  );
}

function Roof() {
  const { geo } = useArt();
  return (
    <Panel id="roof" d={geo.panels.roof} creases={[]}>
      <TopStripe />
      {geo.roofRail && <path d={geo.roofRail} stroke="#0a0b0d" strokeWidth="5" strokeLinecap="round" />}
    </Panel>
  );
}

function Hood() {
  const { geo } = useArt();
  return (
    <Panel id="hood" d={geo.panels.hood} creases={[]}>
      <TopStripe />
    </Panel>
  );
}

function Trunk() {
  const { geo, variant } = useArt();
  return (
    <Panel id="trunk" d={geo.panels.trunk} creases={[]}>
      <TopStripe />
      {variant === "tuned" && geo.ducktail && <path d={geo.ducktail} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />}
    </Panel>
  );
}

function BumperFront() {
  const { geo, variant } = useArt();
  return (
    <g>
      <Panel id="bumper_front" d={geo.panels.bumper_front} creases={[]}>
        <path d={geo.intake} fill="#050607" />
        <path d={geo.intakeHi} stroke="rgba(213,217,224,0.18)" strokeWidth="1" />
        <SideStripe />
        <Cladding />
      </Panel>
      {variant === "tuned" && <path d={geo.splitter} fill="none" stroke="#050607" strokeWidth="5" strokeLinecap="round" />}
    </g>
  );
}

function BumperRear() {
  const { geo } = useArt();
  return (
    <Panel id="bumper_rear" d={geo.panels.bumper_rear} creases={[]}>
      <path d={geo.rearHi} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <path d={geo.reflector} stroke="#7b1a22" strokeWidth="2.5" strokeLinecap="round" />
      <SideStripe />
      <Cladding />
    </Panel>
  );
}

function FenderFront() {
  const { geo, variant } = useArt();
  return (
    <Panel id="fender_front_left" d={geo.panels.fender_front}>
      {variant === "tuned" && geo.vent && (
        <>
          <path d={geo.vent} fill="#050607" />
          <path d={geo.vent} fill="none" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="0.8" />
        </>
      )}
      <SideStripe />
      <Cladding />
    </Panel>
  );
}

function FenderRear() {
  const { geo } = useArt();
  return (
    <Panel id="fender_rear_left" d={geo.panels.fender_rear}>
      <SideStripe />
      <Cladding />
    </Panel>
  );
}

function DoorFront() {
  const { geo } = useArt();
  return (
    <Panel id="door_front_left" d={geo.panels.door_front}>
      <Handle at={geo.handles.front} />
      <SideSkirt />
      <SideStripe />
      <Cladding />
    </Panel>
  );
}

function DoorRear() {
  const { geo } = useArt();
  if (!geo.panels.door_rear) return null;
  return (
    <Panel id="door_rear_left" d={geo.panels.door_rear}>
      {geo.handles.rear && <Handle at={geo.handles.rear} />}
      <SideSkirt />
      <SideStripe />
      <Cladding />
    </Panel>
  );
}

function Windshield() {
  const { geo } = useArt();
  return <Glass d={geo.panels.windshield} />;
}

function RearWindow() {
  const { geo } = useArt();
  return <Glass d={geo.panels.rear_window} />;
}

function SideWindows() {
  const { geo } = useArt();
  return (
    <Glass d={geo.dlo} clip="" trim={geo.dloTrim}>
      {geo.pillars.map((d) => (
        <path key={d} d={d} fill="#06070a" />
      ))}
      <path d={geo.beltline} stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1" />
    </Glass>
  );
}

function Mirror() {
  const { geo, url } = useArt();
  const m = geo.mirror;
  return (
    <g>
      <path d={m.stem} stroke="#0b0d10" strokeWidth="6" />
      <path d={m.body} fill={url("paint")} />
      <path d={m.hi} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <path d={m.lo} fill="none" stroke="#050607" strokeWidth="1.5" />
    </g>
  );
}

function Headlight() {
  const { geo, url } = useArt();
  const h = geo.headlight;
  return (
    <g>
      <path d={h.lens} fill="#0b0e12" stroke="#000" strokeWidth="1" />
      <path d={h.led} pathLength={1} className="led" fill="none" stroke="#eef4ff" strokeWidth="2.2" strokeLinecap="round" filter={url("glow")} />
      <circle cx={h.dot[0]} cy={h.dot[1]} r="4" fill="#1a1f26" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
    </g>
  );
}

function Taillight() {
  const { geo, url } = useArt();
  return (
    <g>
      <path d={geo.taillight.lens} fill="#2a070b" />
      <path d={geo.taillight.led} pathLength={1} className="led led-tail" fill="none" stroke="#ff3347" strokeWidth="2" strokeLinecap="round" filter={url("glow")} />
    </g>
  );
}

function Diffuser() {
  const { geo, variant } = useArt();
  const d = geo.diffuser;
  return (
    <g>
      <path d={d.body} fill="#08090b" />
      {d.fins.map((x) => (
        <path key={x} d={`M${x} 358 L${x + 4} 380`} stroke="#1f2227" strokeWidth="2" />
      ))}
      <ellipse cx={d.tip[0]} cy={d.tip[1]} rx="8" ry="5" fill="#16181b" stroke="#6d737b" strokeWidth="1.5" />
      {variant === "tuned" && <ellipse cx={d.tip[0] - 18} cy={d.tip[1]} rx="8" ry="5" fill="#16181b" stroke="#6d737b" strokeWidth="1.5" />}
    </g>
  );
}

type Axle = "front" | "rear";

function makeSpring(axle: Axle) {
  return function SpringArt() {
    const { geo } = useArt();
    const cx = geo.wheel[axle];
    return (
      <AtWheel cx={cx}>
        <Spring cx={cx} top={geo.wheel.cy - 94} bottom={geo.wheel.cy - 30} />
      </AtWheel>
    );
  };
}
function makeDisc(axle: Axle) {
  return function DiscArt() {
    const { geo } = useArt();
    const cx = geo.wheel[axle];
    return (
      <AtWheel cx={cx}>
        <BrakeDisc cx={cx} cy={geo.wheel.cy} />
      </AtWheel>
    );
  };
}
function makeCaliper(axle: Axle) {
  return function CaliperArt() {
    const { geo } = useArt();
    const cx = geo.wheel[axle];
    return (
      <AtWheel cx={cx}>
        <Caliper cx={cx} cy={geo.wheel.cy} />
      </AtWheel>
    );
  };
}
function makeWheel(axle: Axle, dim = false) {
  return function WheelArt() {
    const { geo } = useArt();
    const cx = geo.wheel[axle];
    return (
      <AtWheel cx={cx}>
        <Wheel cx={cx} cy={geo.wheel.cy} dim={dim} />
      </AtWheel>
    );
  };
}

function Engine() {
  const art = useArt();
  return (
    <g>
      {/* block */}
      <path d="M190 262 L430 248 L436 336 L200 340 Z" fill={art.url("block")} stroke="#000" />
      {/* cam covers / engine cover */}
      <path d="M206 250 L418 236 L424 262 L210 274 Z" fill={art.url("accent")} opacity="0.85" />
      {Array.from({ length: 9 }, (_, i) => 228 + i * 21).map((x) => (
        <path key={x} d={`M${x} ${251 - (x - 206) * 0.066} L${x + 2} ${271 - (x - 206) * 0.066}`} stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
      ))}
      {/* intake runners */}
      {[236, 268, 300, 332, 364, 396].map((x) => (
        <rect key={x} x={x} y="276" width="18" height="30" rx="5" fill="#22262c" stroke="#3b4047" />
      ))}
      {/* front accessory drive */}
      <circle cx="184" cy="306" r="24" fill="#1c1f23" stroke={art.url("metal")} strokeWidth="3" />
      <circle cx="184" cy="306" r="8" fill={art.url("metal")} />
      <circle cx="214" cy="334" r="12" fill="#1c1f23" stroke="#5c626b" strokeWidth="2" />
      <path d="M170 286 L200 324 M198 288 L226 324" stroke="#0a0b0d" strokeWidth="3" />
      {/* oil pan */}
      <path d="M214 340 L420 336 L410 356 L230 358 Z" fill="#17191d" stroke="#3b4047" />
    </g>
  );
}

function Transmission() {
  const art = useArt();
  return (
    <g>
      <path d="M436 296 L560 304 L620 318 L620 344 L560 350 L436 346 Z" fill={art.url("block")} stroke="#000" />
      {[470, 500, 530].map((x) => (
        <path key={x} d={`M${x} 302 L${x} 348`} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      ))}
      <rect x="620" y="326" width="262" height="8" rx="4" fill={art.url("metal")} />
      <circle cx="915" cy="330" r="26" fill={art.url("block")} stroke="#000" />
      <circle cx="915" cy="330" r="10" fill={art.url("metal")} />
    </g>
  );
}

function Exhaust() {
  const art = useArt();
  return (
    <g>
      <path d="M430 352 C520 360 620 362 700 362 L1050 360" fill="none" stroke="#3b4047" strokeWidth="7" strokeLinecap="round" />
      <path d="M430 352 C520 360 620 362 700 362 L1050 360" fill="none" stroke={art.url("metal")} strokeWidth="3" />
      <rect x="660" y="350" width="80" height="22" rx="10" fill={art.url("block")} stroke="#5c626b" />
      <rect x="960" y="346" width="96" height="28" rx="12" fill={art.url("block")} stroke="#5c626b" />
      <ellipse cx="1072" cy="364" rx="9" ry="7" fill="#0f1012" stroke={art.url("metal")} strokeWidth="2.5" />
    </g>
  );
}

function ChassisFloor() {
  return (
    <g>
      <path d="M204 348 L1010 344 L1004 366 L214 368 Z" fill="#0f1114" stroke="rgba(213,217,224,0.18)" />
      {Array.from({ length: 14 }, (_, i) => 260 + i * 52).map((x) => (
        <path key={x} d={`M${x} 349 L${x + 3} 366`} stroke="rgba(213,217,224,0.07)" strokeWidth="1" />
      ))}
      <path d="M228 338 L392 332 L396 362 L232 364 Z" fill="none" stroke="rgba(213,217,224,0.2)" />
      <path d="M836 332 L1000 328 L1000 358 L840 362 Z" fill="none" stroke="rgba(213,217,224,0.2)" />
    </g>
  );
}

/** Side-view drawing for each part id. Parts without an entry are not visible from this side. */
export const sideArt: Record<string, ComponentType> = {
  chassis_floor: ChassisFloor,
  engine: Engine,
  transmission: Transmission,
  exhaust: Exhaust,
  body_shell: BodyShell,
  spring_front: makeSpring("front"),
  spring_rear: makeSpring("rear"),
  brake_disc_front: makeDisc("front"),
  caliper_front: makeCaliper("front"),
  brake_disc_rear: makeDisc("rear"),
  caliper_rear: makeCaliper("rear"),
  roof: Roof,
  hood: Hood,
  trunk: Trunk,
  bumper_front: BumperFront,
  bumper_rear: BumperRear,
  fender_front_left: FenderFront,
  fender_rear_left: FenderRear,
  door_front_left: DoorFront,
  door_rear_left: DoorRear,
  mirror_left: Mirror,
  diffuser: Diffuser,
  windshield: Windshield,
  rear_window: RearWindow,
  side_windows_left: SideWindows,
  headlight_left: Headlight,
  taillight_left: Taillight,
  wheel_front_left: makeWheel("front"),
  wheel_rear_left: makeWheel("rear"),
  wheel_front_right: makeWheel("front", true),
  wheel_rear_right: makeWheel("rear", true),
};

/** Parts drawn on the far side; they sit behind the body and only show in 3D. */
export const farSideParts = new Set(["wheel_front_right", "wheel_rear_right"]);
