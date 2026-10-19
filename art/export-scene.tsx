// Studio hero frame: the car grounded on a reflective floor with a contact
// shadow and an environment backdrop. Assembles the same parts the app draws.
import { renderToStaticMarkup } from "react-dom/server";
import { CAR_PARTS, CAR_W } from "../src/car/parts";
import { buildPartPaint, getGlass, getPaint } from "../src/car/paint";

const paint = getPaint("rosso");
const glass = getGlass("tinted");
const pp = buildPartPaint(paint, glass);
const parts = [...CAR_PARTS].sort((a, b) => a.z - b.z);

// The car's wheel contact line sits at ~y=464 in the source art.
const FLOOR = 464;
const H = 576;

function Car({ uidPrefix = "" }: { uidPrefix?: string }) {
  return (
    <g>
      {parts.map((p) => (
        <g key={p.id}>{p.draw(pp, uidPrefix + p.id)}</g>
      ))}
    </g>
  );
}

const svg = renderToStaticMarkup(
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${CAR_W} ${H}`} width={CAR_W} height={H}>
    <defs>
      <radialGradient id="env" cx="50%" cy="34%" r="62%">
        <stop offset="0%" stopColor="#20242e" />
        <stop offset="46%" stopColor="#0d1016" />
        <stop offset="100%" stopColor="#06070a" />
      </radialGradient>
      <linearGradient id="reflFade" x1="0" y1={FLOOR} x2="0" y2={H} gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.26" />
        <stop offset="55%" stopColor="#fff" stopOpacity="0.06" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="floorGlow" x1="0" y1={FLOOR - 40} x2="0" y2={H} gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#dfae55" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#dfae55" stopOpacity="0" />
      </linearGradient>
      <mask id="reflMask">
        <rect x="0" y={FLOOR} width={CAR_W} height={H - FLOOR} fill="url(#reflFade)" />
      </mask>
      <filter id="soft" x="-20%" y="-60%" width="140%" height="260%">
        <feGaussianBlur stdDeviation="16" />
      </filter>
    </defs>

    <rect width={CAR_W} height={H} fill="url(#env)" />
    <rect x="0" y={FLOOR - 60} width={CAR_W} height={H - FLOOR + 60} fill="url(#floorGlow)" />

    {/* mirrored car, faded into the floor */}
    <g mask="url(#reflMask)">
      <g transform={`translate(0 ${FLOOR * 2}) scale(1 -1)`}>
        <Car uidPrefix="r-" />
      </g>
    </g>

    {/* contact shadow on the floor plane */}
    <ellipse cx={620} cy={FLOOR + 6} rx={452} ry={26} fill="#000" opacity="0.55" filter="url(#soft)" />

    <Car />

    {/* floor hairline */}
    <rect x="0" y={FLOOR + 2} width={CAR_W} height="1.5" fill="#dfae55" opacity="0.14" />
  </svg>,
);

process.stdout.write(svg);
