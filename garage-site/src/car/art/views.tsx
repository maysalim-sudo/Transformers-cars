"use client";

import type { ComponentType, ReactNode } from "react";
import { useArt } from "./context";
import { Glass, Panel } from "./primitives";

/** Extra silhouettes for the non-side views (registered as clip paths in CarDefs). */
export const VIEW_CLIPS = {
  fsil: "M300 402 L288 332 C286 296 292 272 306 258 C340 248 420 242 600 240 C780 242 860 248 894 258 C908 272 914 296 912 332 L900 402 Z M392 244 L452 150 C520 140 680 140 748 150 L808 244 Z",
  rsil: "M296 402 L286 330 C284 294 292 270 310 256 C350 244 430 240 600 238 C770 240 850 244 890 256 C908 270 916 294 914 330 L904 402 Z M404 242 L470 158 C530 148 670 148 730 158 L796 242 Z",
  tsil: "M90 240 C90 150 120 92 170 82 C300 62 420 58 600 58 C800 58 960 62 1060 80 C1100 90 1116 150 1116 240 C1116 330 1100 390 1060 400 C960 418 800 422 600 422 C420 422 300 418 170 398 C120 388 90 330 90 240 Z",
} as const;

const MIRROR_X = "translate(1200 0) scale(-1 1)";
const MIRROR_Y = "translate(0 480) scale(1 -1)";

/** Draws `children` mirrored when `flip` is set. */
function Flip({ flip, axis, children }: { flip: boolean; axis: "x" | "y"; children: ReactNode }) {
  return flip ? <g transform={axis === "x" ? MIRROR_X : MIRROR_Y}>{children}</g> : <>{children}</>;
}

type Side = "left" | "right";

/* ------------------------------------------------------------------ FRONT */
// Seen from the front, the car's left side is on the viewer's right.

function FrontShell() {
  return <path d={VIEW_CLIPS.fsil} fill="#0b0d10" />;
}
function FrontRoof() {
  return <Panel id="f-roof" clip="fsil" creases={[]} d="M452 150 C520 140 680 140 748 150 L742 158 C680 149 520 149 458 158 Z" />;
}
function FrontWindshield() {
  return <Glass clip="fsil" d="M404 240 L458 158 C520 149 680 149 742 158 L796 240 Z" />;
}
function FrontHood() {
  return (
    <Panel
      id="f-hood"
      clip="fsil"
      creases={["M420 248 C460 262 500 270 560 274", "M780 248 C740 262 700 270 640 274"]}
      d="M306 258 C340 248 420 242 600 240 C780 242 860 248 894 258 L878 284 C800 278 700 276 600 276 C500 276 400 278 322 284 Z"
    />
  );
}
function FrontBumper() {
  return (
    <g>
      <Panel
        id="f-bumper"
        clip="fsil"
        creases={[]}
        d="M322 284 C400 278 500 276 600 276 C700 276 800 278 878 284 C880 306 880 324 876 342 L866 402 L334 402 L324 342 C320 324 320 306 322 284 Z"
      >
        <path d="M468 318 C520 312 680 312 732 318 L722 374 C660 380 540 380 478 374 Z" fill="#050607" />
        {[330, 342, 354, 366].map((y) => (
          <path key={y} d={`M476 ${y} C540 ${y - 4} 660 ${y - 4} 724 ${y}`} stroke="rgba(213,217,224,0.12)" strokeWidth="1.2" />
        ))}
        <path d="M338 350 L424 346 L416 384 L344 388 Z" fill="#050607" />
        <path d="M862 350 L776 346 L784 384 L856 388 Z" fill="#050607" />
      </Panel>
      <path d="M332 401 L868 401" stroke="#050607" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}
function FrontFender({ side }: { side: Side }) {
  return (
    <Flip flip={side === "left"} axis="x">
      <Panel id={`f-fender-${side}`} clip="fsil" creases={[]} d="M0 0 L322 0 L322 284 C320 306 320 324 324 342 L334 402 L0 402 Z" />
    </Flip>
  );
}
function FrontHeadlight({ side }: { side: Side }) {
  const art = useArt();
  return (
    <Flip flip={side === "left"} axis="x">
      <path d="M326 288 C360 284 400 283 436 284 L428 300 C392 302 358 302 330 302 Z" fill="#0b0e12" stroke="#000" />
      <path d="M334 292 C370 289 404 288 430 289" stroke="#eef4ff" strokeWidth="2.2" strokeLinecap="round" fill="none" filter={art.url("glow")} />
    </Flip>
  );
}
function FrontMirror({ side }: { side: Side }) {
  const art = useArt();
  return (
    <Flip flip={side === "left"} axis="x">
      <path d="M398 224 C372 216 350 220 342 230 C344 242 372 244 400 238 Z" fill={art.url("paint-flat")} stroke="#050607" />
    </Flip>
  );
}
function FrontWheel({ side }: { side: Side }) {
  const art = useArt();
  return (
    <Flip flip={side === "left"} axis="x">
      <rect x="294" y="332" width="58" height="88" rx="16" fill={art.url("tire")} />
      <rect x="294" y="332" width="58" height="88" rx="16" fill="#0d0e10" stroke="rgba(255,255,255,0.08)" />
    </Flip>
  );
}

/* ------------------------------------------------------------------- REAR */
// Seen from behind, the car's left side is on the viewer's left.

function RearShell() {
  return <path d={VIEW_CLIPS.rsil} fill="#0b0d10" />;
}
function RearRoof() {
  return <Panel id="r-roof" clip="rsil" creases={[]} d="M470 158 C530 148 670 148 730 158 L726 164 C670 155 530 155 474 164 Z" />;
}
function RearGlass() {
  return <Glass clip="rsil" d="M418 238 L474 164 C530 155 670 155 726 164 L782 238 Z" />;
}
function RearTrunk() {
  return (
    <Panel
      id="r-trunk"
      clip="rsil"
      creases={["M330 258 C420 248 500 246 600 246 C700 246 780 248 870 258"]}
      d="M310 256 C350 244 430 240 600 238 C770 240 850 244 890 256 L880 300 C800 296 700 294 600 294 C500 294 400 296 320 300 Z"
    />
  );
}
function RearBumper() {
  return (
    <Panel
      id="r-bumper"
      clip="rsil"
      creases={[]}
      d="M320 300 C400 296 500 294 600 294 C700 294 800 296 880 300 C882 330 880 356 874 380 L866 402 L334 402 L326 380 C320 356 318 330 320 300 Z"
    >
      <rect x="540" y="312" width="120" height="34" rx="3" fill="#07080a" stroke="rgba(213,217,224,0.12)" />
    </Panel>
  );
}
function RearDiffuser() {
  const art = useArt();
  return (
    <g>
      <path d="M420 372 L780 372 L770 404 L430 404 Z" fill="#07080a" />
      {[500, 560, 640, 700].map((x) => (
        <path key={x} d={`M${x} 372 L${x} 404`} stroke="#1f2227" strokeWidth="2" />
      ))}
      <ellipse cx="462" cy="388" rx="18" ry="9" fill="#0f1012" stroke={art.url("metal")} strokeWidth="2.5" />
      <ellipse cx="738" cy="388" rx="18" ry="9" fill="#0f1012" stroke={art.url("metal")} strokeWidth="2.5" />
    </g>
  );
}
function RearLight({ side }: { side: Side }) {
  const art = useArt();
  return (
    <Flip flip={side === "right"} axis="x">
      <path d="M318 270 C400 266 500 264 597 264 L597 274 C500 274 400 276 322 281 Z" fill="#2a070b" />
      <path d="M324 274 C400 270 500 268 594 268" stroke="#ff3347" strokeWidth="2" fill="none" filter={art.url("glow")} />
    </Flip>
  );
}
function RearFender({ side }: { side: Side }) {
  return (
    <Flip flip={side === "right"} axis="x">
      <Panel id={`r-fender-${side}`} clip="rsil" creases={[]} d="M0 0 L320 0 L320 300 C318 330 320 356 326 380 L334 402 L0 402 Z" />
    </Flip>
  );
}
function RearMirror({ side }: { side: Side }) {
  const art = useArt();
  return (
    <Flip flip={side === "right"} axis="x">
      <path d="M394 226 C368 218 346 222 338 232 C340 244 368 246 396 240 Z" fill={art.url("paint-flat")} stroke="#050607" />
    </Flip>
  );
}
function RearWheel({ side }: { side: Side }) {
  return (
    <Flip flip={side === "right"} axis="x">
      <rect x="292" y="332" width="58" height="88" rx="16" fill="#0d0e10" stroke="rgba(255,255,255,0.08)" />
    </Flip>
  );
}

/* -------------------------------------------------------------------- TOP */
// Plan view, front to the left. The car's right side is at the top of the drawing.

function TopShell() {
  return <path d={VIEW_CLIPS.tsil} fill="#0b0d10" />;
}
const topPanel = (id: string, d: string, creases: string[] = []) =>
  function TopPanel() {
    return <Panel id={id} clip="tsil" creases={creases} d={d} paint="paint-flat" />;
  };
const TopBumperFront = topPanel("t-bumper-f", "M0 0 L140 0 C128 120 128 360 140 480 L0 480 Z");
const TopHood = topPanel(
  "t-hood",
  "M140 112 C300 104 400 104 470 112 L470 368 C400 376 300 376 140 368 C128 300 128 180 140 112 Z",
  ["M160 196 C300 192 400 192 466 196", "M160 284 C300 288 400 288 466 284"],
);
const TopRoof = topPanel("t-roof", "M578 126 C680 118 780 118 850 128 L850 352 C780 362 680 362 578 354 Z");
const TopTrunk = topPanel("t-trunk", "M962 142 L1082 152 C1090 200 1090 280 1082 328 L962 338 Z");
const TopBumperRear = topPanel("t-bumper-r", "M1082 0 L1200 0 L1200 480 L1082 480 C1094 330 1094 150 1082 0 Z");
function TopWindshield() {
  return <Glass clip="tsil" d="M470 114 L578 126 L578 354 L470 366 Z" />;
}
function TopRearWindow() {
  return <Glass clip="tsil" d="M850 128 L962 142 L962 338 L850 352 Z" />;
}
function TopSide({ side, part }: { side: Side; part: "fender_front" | "door_front" | "door_rear" | "fender_rear" }) {
  const d = {
    fender_front: "M120 0 L480 0 L480 112 L470 112 C400 104 300 104 140 112 Z",
    door_front: "M480 0 L700 0 L700 121 C640 120 600 122 578 126 L480 114 Z",
    door_rear: "M700 0 L880 0 L880 132 L850 128 C800 122 750 120 700 121 Z",
    fender_rear: "M880 0 L1082 0 L1082 152 L962 142 L880 132 Z",
  }[part];
  return (
    <Flip flip={side === "left"} axis="y">
      <Panel id={`t-${part}-${side}`} clip="tsil" creases={[]} d={d} paint="paint-flat" />
    </Flip>
  );
}
function TopMirror({ side }: { side: Side }) {
  const art = useArt();
  return (
    <Flip flip={side === "left"} axis="y">
      <path d="M498 112 C492 86 496 60 508 50 L534 52 C530 74 526 96 520 114 Z" fill={art.url("paint-flat")} stroke="#050607" />
    </Flip>
  );
}
function TopHeadlight({ side }: { side: Side }) {
  const art = useArt();
  return (
    <Flip flip={side === "left"} axis="y">
      <path d="M108 128 C114 106 132 92 160 86 L166 98 C144 104 128 116 120 132 Z" fill="#0b0e12" stroke="#000" />
      <path d="M116 124 C124 108 138 98 158 92" stroke="#eef4ff" strokeWidth="2" fill="none" filter={art.url("glow")} />
    </Flip>
  );
}
function TopTaillight({ side }: { side: Side }) {
  const art = useArt();
  return (
    <Flip flip={side === "left"} axis="y">
      <path d="M1098 120 C1094 104 1084 92 1064 86 L1060 98 C1074 102 1084 112 1088 126 Z" fill="#2a070b" />
      <path d="M1092 118 C1088 106 1080 98 1066 92" stroke="#ff3347" strokeWidth="2" fill="none" filter={art.url("glow")} />
    </Flip>
  );
}

/* -------------------------------------------------------------- UNDERSIDE */
// Seen from below, front to the left. The car's left side is at the top of the drawing.

function UnderShell() {
  return (
    <g>
      <path d={VIEW_CLIPS.tsil} fill="#0b0d10" />
      <path d={VIEW_CLIPS.tsil} fill="none" stroke="rgba(213,217,224,0.12)" />
    </g>
  );
}
function UnderFloor() {
  const art = useArt();
  return (
    <g clipPath={art.url("tsil")}>
      <rect x="160" y="110" width="900" height="260" rx="30" fill="#101216" stroke="rgba(213,217,224,0.14)" />
      {Array.from({ length: 15 }, (_, i) => 200 + i * 56).map((x) => (
        <path key={x} d={`M${x} 118 L${x} 362`} stroke="rgba(213,217,224,0.05)" />
      ))}
      <rect x="200" y="100" width="210" height="280" rx="18" fill="none" stroke="rgba(213,217,224,0.2)" />
      <rect x="820" y="100" width="190" height="280" rx="18" fill="none" stroke="rgba(213,217,224,0.2)" />
    </g>
  );
}
function UnderEngine() {
  const art = useArt();
  return (
    <g>
      <rect x="190" y="170" width="240" height="140" rx="10" fill={art.url("block")} stroke="#000" />
      <rect x="214" y="196" width="190" height="88" rx="6" fill="#17191d" stroke="#3b4047" />
      <circle cx="184" cy="240" r="18" fill="#1c1f23" stroke="#5c626b" strokeWidth="3" />
    </g>
  );
}
function UnderTransmission() {
  const art = useArt();
  return (
    <g>
      <path d="M430 206 L560 216 L600 228 L600 252 L560 264 L430 274 Z" fill={art.url("block")} stroke="#000" />
      <rect x="600" y="234" width="290" height="12" rx="6" fill={art.url("metal")} />
      <circle cx="915" cy="240" r="30" fill={art.url("block")} stroke="#000" />
      <rect x="840" y="236" width="150" height="8" rx="4" fill={art.url("metal")} transform="rotate(90 915 240)" />
    </g>
  );
}
function UnderExhaust() {
  const art = useArt();
  return (
    <g fill="none">
      {[196, 284].map((y) => (
        <g key={y}>
          <path d={`M440 ${y} L1070 ${y}`} stroke="#3b4047" strokeWidth="9" strokeLinecap="round" />
          <path d={`M440 ${y} L1070 ${y}`} stroke={art.url("metal")} strokeWidth="3.5" />
        </g>
      ))}
      <rect x="980" y="170" width="70" height="140" rx="14" fill={art.url("block")} stroke="#5c626b" />
    </g>
  );
}
function UnderDiffuser() {
  return (
    <g>
      <path d="M1040 150 L1100 160 L1104 320 L1040 330 Z" fill="#07080a" stroke="rgba(213,217,224,0.16)" />
      {[190, 230, 270].map((y) => (
        <path key={y} d={`M1044 ${y + 10} L1100 ${y + 10}`} stroke="#22252a" strokeWidth="2" />
      ))}
    </g>
  );
}
function UnderWheel({ x, y }: { x: number; y: number }) {
  const art = useArt();
  return (
    <g>
      <rect x={x - 62} y={y - 26} width="124" height="52" rx="14" fill={art.url("tire")} />
      <rect x={x - 62} y={y - 26} width="124" height="52" rx="14" fill="#0d0e10" stroke="rgba(255,255,255,0.1)" />
      {[-40, -20, 0, 20, 40].map((o) => (
        <path key={o} d={`M${x + o} ${y - 24} L${x + o} ${y + 24}`} stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
      ))}
    </g>
  );
}
const underBumper = (id: string, d: string) =>
  function UnderBumper() {
    return <Panel id={id} clip="tsil" creases={[]} d={d} paint="paint-flat" />;
  };

/* ---------------------------------------------------------------- export */

export type ViewLayer = { partId: string; Art: ComponentType };

const s = (partId: string, Art: ComponentType): ViewLayer => ({ partId, Art });

export const frontLayers: ViewLayer[] = [
  s("body_shell", FrontShell),
  s("wheel_front_right", () => <FrontWheel side="right" />),
  s("wheel_front_left", () => <FrontWheel side="left" />),
  s("roof", FrontRoof),
  s("windshield", FrontWindshield),
  s("hood", FrontHood),
  s("fender_front_right", () => <FrontFender side="right" />),
  s("fender_front_left", () => <FrontFender side="left" />),
  s("bumper_front", FrontBumper),
  s("headlight_right", () => <FrontHeadlight side="right" />),
  s("headlight_left", () => <FrontHeadlight side="left" />),
  s("mirror_right", () => <FrontMirror side="right" />),
  s("mirror_left", () => <FrontMirror side="left" />),
];

export const rearLayers: ViewLayer[] = [
  s("body_shell", RearShell),
  s("wheel_rear_left", () => <RearWheel side="left" />),
  s("wheel_rear_right", () => <RearWheel side="right" />),
  s("roof", RearRoof),
  s("rear_window", RearGlass),
  s("trunk", RearTrunk),
  s("fender_rear_left", () => <RearFender side="left" />),
  s("fender_rear_right", () => <RearFender side="right" />),
  s("bumper_rear", RearBumper),
  s("diffuser", RearDiffuser),
  s("taillight_left", () => <RearLight side="left" />),
  s("taillight_right", () => <RearLight side="right" />),
  s("mirror_left", () => <RearMirror side="left" />),
  s("mirror_right", () => <RearMirror side="right" />),
];

const sides: Side[] = ["right", "left"];
export const topLayers: ViewLayer[] = [
  s("body_shell", TopShell),
  s("bumper_front", TopBumperFront),
  s("hood", TopHood),
  s("windshield", TopWindshield),
  s("roof", TopRoof),
  s("rear_window", TopRearWindow),
  s("trunk", TopTrunk),
  s("bumper_rear", TopBumperRear),
  ...sides.flatMap((side) =>
    (["fender_front", "door_front", "door_rear", "fender_rear"] as const).map((part) =>
      s(`${part}_${side}`, () => <TopSide side={side} part={part} />),
    ),
  ),
  ...sides.flatMap((side) => [
    s(`mirror_${side}`, () => <TopMirror side={side} />),
    s(`headlight_${side}`, () => <TopHeadlight side={side} />),
    s(`taillight_${side}`, () => <TopTaillight side={side} />),
  ]),
];

export const undersideLayers: ViewLayer[] = [
  s("body_shell", UnderShell),
  s("bumper_front", underBumper("u-bumper-f", "M0 0 L140 0 C128 120 128 360 140 480 L0 480 Z")),
  s("bumper_rear", underBumper("u-bumper-r", "M1082 0 L1200 0 L1200 480 L1082 480 C1094 330 1094 150 1082 0 Z")),
  s("chassis_floor", UnderFloor),
  s("engine", UnderEngine),
  s("transmission", UnderTransmission),
  s("exhaust", UnderExhaust),
  s("diffuser", UnderDiffuser),
  s("wheel_front_left", () => <UnderWheel x={300} y={70} />),
  s("wheel_rear_left", () => <UnderWheel x={915} y={70} />),
  s("wheel_front_right", () => <UnderWheel x={300} y={410} />),
  s("wheel_rear_right", () => <UnderWheel x={915} y={410} />),
];
