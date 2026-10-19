import { CAR_PARTS } from "./parts";
import { buildPartPaint, type Glass, type Paint } from "./paint";

export const FIG_W = 1240;
export const FIG_H = 620;
export const FIG_VIEWBOX = `0 0 ${FIG_W} ${FIG_H}`;

export type ViewId = "front" | "rear" | "left" | "right" | "top" | "under";

export const VIEWS: { id: ViewId; label: string; short: string; hint: string }[] = [
  { id: "front", label: "Front", short: "FR", hint: "Nose, lamps, bumper, crash structure" },
  { id: "rear", label: "Rear", short: "RR", hint: "Tail lamps, diffuser, exhaust, boot" },
  { id: "left", label: "Left side", short: "L", hint: "Driver side panels, sills, wheels" },
  { id: "right", label: "Right side", short: "R", hint: "Passenger side panels, sills, wheels" },
  { id: "top", label: "Roof / top", short: "TOP", hint: "Roof, seals, glass, panel gaps" },
  { id: "under", label: "Underside", short: "UND", hint: "Sump, gearbox, diff, exhaust, rust" },
];

/* ------------------------------------------------------------------ */
/*  Side view — reuses the layered parts, so paint + glass stay live   */
/* ------------------------------------------------------------------ */

const byZ = [...CAR_PARTS].sort((a, b) => a.z - b.z);

export function SideFigure({
  paint,
  glass,
  mirror = false,
}: {
  paint: Paint;
  glass: Glass;
  mirror?: boolean;
}) {
  const pp = buildPartPaint(paint, glass);
  return (
    <g transform={mirror ? "translate(1240,50) scale(-1,1)" : "translate(0,50)"}>
      {byZ.map((p) => p.draw(pp, p.id))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Front + rear share one drawing                                     */
/* ------------------------------------------------------------------ */

function EndFigure({
  paint,
  glass,
  rear = false,
}: {
  paint: Paint;
  glass: Glass;
  rear?: boolean;
}) {
  const c = buildPartPaint(paint, glass);
  const uid = rear ? "er" : "ef";
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-body`} x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor={c.bodyLight} />
          <stop offset="45%" stopColor={c.body} />
          <stop offset="100%" stopColor={c.bodyDeep} />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={c.glassOpacity * 0.8} />
          <stop offset="100%" stopColor={c.glass} stopOpacity={c.glassOpacity} />
        </linearGradient>
        <radialGradient id={`${uid}-lamp`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor={rear ? "#ff6a55" : "#ffffff"} />
          <stop offset="100%" stopColor={rear ? "#7c1313" : "#5d7f93"} />
        </radialGradient>
      </defs>

      {/* wheels first */}
      {[262, 878].map((x) => (
        <g key={x}>
          <rect x={x} y={418} width={100} height={150} rx={48} fill="#15181d" />
          <rect x={x + 8} y={428} width={84} height={130} rx={42} fill="#0b0d11" />
          <rect x={x + 18} y={440} width={64} height={106} rx={32} fill={c.rim} opacity="0.5" />
          <rect x={x + 34} y={452} width={32} height={82} rx={16} fill={c.rim} opacity="0.75" />
        </g>
      ))}

      {/* body shell */}
      <path
        d="M300 470 C300 386 320 302 352 268 L386 246 C424 186 472 148 522 128 L718 128
           C768 148 816 186 854 246 L888 268 C920 302 940 386 940 470
           C940 520 902 548 852 548 L388 548 C338 548 300 520 300 470 Z"
        fill={`url(#${uid}-body)`}
      />
      {/* mirrors */}
      <path d="M258 296 L312 288 L318 330 L266 336 Z" fill={c.bodyDark} />
      <path d="M982 296 L928 288 L922 330 L974 336 Z" fill={c.bodyDark} />

      {/* greenhouse */}
      <path
        d="M404 138 L836 138 L878 252 L362 252 Z"
        fill={rear ? "#0b0d11" : `url(#${uid}-glass)`}
      />
      <path
        d="M522 122 L718 122 C748 140 780 168 802 196 L438 196 C460 168 492 140 522 122 Z"
        fill={rear ? `url(#${uid}-glass)` : "#0b0d11"}
      />
      {/* roof rail highlight */}
      <path d="M420 128 L820 128" stroke="#fff" strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" />

      {/* lid */}
      <path d="M352 268 C420 250 820 250 888 268 L878 300 L362 300 Z" fill={c.bodyLight} opacity="0.55" />
      <path d="M362 300 L878 300 L876 312 L364 312 Z" fill="#000" opacity="0.18" />

      {rear ? (
        <>
          {/* wing */}
          <path d="M392 210 L848 202 L852 226 L396 234 Z" fill={c.carbon} />
          {/* tail light bar */}
          <path d="M352 306 L888 306 L886 356 L354 356 Z" fill="#170c0d" />
          <path d="M360 314 L880 314 L878 348 L362 348 Z" fill={`url(#${uid}-lamp)`} />
          <path d="M368 320 L872 320 L872 330 L368 330 Z" fill="#fff" opacity="0.2" />
          {/* plate */}
          <path d="M566 372 L674 372 L676 424 L564 424 Z" fill="#d8dde3" />
          <path d="M576 386 L664 386 L664 410 L576 410 Z" fill="#2a2f36" />
          {/* diffuser */}
          <path d="M368 456 L872 456 L862 548 L378 548 Z" fill="#0b0d11" />
          <g fill="#2b3039">
            {[420, 500, 580, 660, 740, 810].map((x) => (
              <rect key={x} x={x} y={462} width="12" height="76" rx="5" />
            ))}
          </g>
          {[470, 540, 700, 770].map((x) => (
            <circle key={x} cx={x} cy={516} r="22" fill="#22262d" stroke={c.chrome} strokeWidth="3" />
          ))}
        </>
      ) : (
        <>
          {/* headlamps */}
          <path d="M336 296 L520 282 L540 336 L350 350 Z" fill="#12151a" />
          <path d="M904 296 L720 282 L700 336 L890 350 Z" fill="#12151a" />
          <path d="M348 302 L512 290 L526 328 L360 340 Z" fill={`url(#${uid}-lamp)`} />
          <path d="M892 302 L728 290 L714 328 L880 340 Z" fill={`url(#${uid}-lamp)`} />
          {/* grille */}
          <path d="M470 372 L770 372 L742 446 L498 446 Z" fill="#0a0c10" />
          <g stroke={c.metal} strokeWidth="3" opacity="0.6">
            {[386, 404, 422].map((y) => (
              <path key={y} d={`M486 ${y} L754 ${y}`} />
            ))}
          </g>
          {/* lower intakes */}
          <path d="M352 470 L560 470 L556 536 L348 536 Z" fill="#0a0c10" />
          <path d="M888 470 L680 470 L684 536 L892 536 Z" fill="#0a0c10" />
          <path d="M330 548 L910 548 L906 570 L334 570 Z" fill={c.carbon} />
          <path d="M566 456 L674 456 L676 462 L564 462 Z" fill="#d8dde3" opacity="0.8" />
        </>
      )}

      {/* shoulder highlight */}
      <path d="M318 466 C318 400 334 320 360 284" stroke="#fff" strokeOpacity="0.12" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M922 466 C922 400 906 320 880 284" stroke="#fff" strokeOpacity="0.12" strokeWidth="9" fill="none" strokeLinecap="round" />
      {/* contact shadow */}
      <ellipse cx="620" cy="576" rx="380" ry="20" fill="#000" opacity="0.45" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Roof + underside share the plan silhouette                        */
/* ------------------------------------------------------------------ */

function PlanFigure({
  paint,
  glass,
  under = false,
}: {
  paint: Paint;
  glass: Glass;
  under?: boolean;
}) {
  const c = buildPartPaint(paint, glass);
  const uid = under ? "pu" : "pt";
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-b`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.bodyLight} />
          <stop offset="50%" stopColor={c.body} />
          <stop offset="100%" stopColor={c.bodyDeep} />
        </linearGradient>
        <linearGradient id={`${uid}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={c.glassOpacity * 0.85} />
          <stop offset="100%" stopColor={c.glass} stopOpacity={c.glassOpacity} />
        </linearGradient>
      </defs>

      {/* wheels */}
      {[
        [272, 168], [888, 168], [272, 388], [888, 388],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="84" height="112" rx="42" fill="#15181d" />
          <rect x={x + 12} y={y + 12} width="60" height="88" rx="30" fill={c.rim} opacity="0.55" />
          <rect x={x + 30} y={y + 26} width="24" height="60" rx="12" fill={c.rim} opacity="0.8" />
        </g>
      ))}

      {/* plan silhouette */}
      <path
        d="M508 52 C430 58 366 88 348 152 C336 196 340 240 334 278 C322 322 302 356 300 404
           C298 464 312 528 344 566 L896 566 C928 528 942 464 940 404
           C938 356 918 322 906 278 C900 240 904 196 892 152 C874 88 810 58 732 52 Z"
        fill={`url(#${uid}-b)`}
      />

      {under ? (
        <>
          {/* floor pan */}
          <path d="M370 210 L870 210 L880 520 L360 520 Z" fill="#0d0f14" />
          {/* sump */}
          <path d="M548 150 L692 150 L706 226 L534 226 Z" fill="#3c424b" />
          <path d="M560 162 L680 162 L690 214 L550 214 Z" fill="#575f6a" opacity="0.7" />
          {/* gearbox + propshaft */}
          <path d="M574 236 L666 236 L678 320 L562 320 Z" fill="#333941" />
          <path d="M610 320 L630 320 L632 470 L608 470 Z" fill="#414750" />
          {/* differential */}
          <path d="M548 452 L692 452 L706 508 L534 508 Z" fill="#3a4048" />
          {/* exhaust run */}
          <path d="M470 330 C520 356 520 400 470 430" stroke={c.chrome} strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d="M770 330 C720 356 720 400 770 430" stroke={c.chrome} strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.7" />
          {/* cross braces */}
          <g stroke="#22262d" strokeWidth="10">
            <path d="M370 250 L870 250" />
            <path d="M366 380 L874 380" />
            <path d="M374 480 L866 480" />
          </g>
          {/* subframes */}
          <path d="M420 150 L820 150 L826 240 L414 240 Z" fill="none" stroke="#2b3039" strokeWidth="12" />
          <path d="M440 430 L800 430 L806 520 L434 520 Z" fill="none" stroke="#2b3039" strokeWidth="12" />
          <g stroke="#000" strokeWidth="2" opacity="0.4">
            <path d="M370 300 L870 300" />
            <path d="M370 430 L870 430" />
          </g>
        </>
      ) : (
        <>
          {/* bonnet */}
          <path d="M470 96 L770 96 L792 190 L448 190 Z" fill={c.bodyLight} opacity="0.6" />
          <path d="M452 190 L788 190 L786 204 L454 204 Z" fill="#000" opacity="0.15" />
          {/* windscreen */}
          <path d="M456 204 L784 204 L800 268 L440 268 Z" fill={`url(#${uid}-g)`} />
          {/* roof glasshouse */}
          <path d="M442 268 L798 268 L808 384 L432 384 Z" fill={`url(#${uid}-g)`} />
          <path d="M432 384 L808 384 L794 446 L446 446 Z" fill="#0b0d11" />
          {/* rear glass + boot */}
          <path d="M446 446 L794 446 L780 470 L460 470 Z" fill={`url(#${uid}-g)`} opacity="0.75" />
          <path d="M460 470 L780 470 L772 540 L468 540 Z" fill={c.bodyLight} opacity="0.45" />
          {/* shut lines */}
          <g stroke="#000" strokeOpacity="0.3" strokeWidth="2.5" fill="none">
            <path d="M448 192 L792 192" />
            <path d="M444 384 L806 384" />
            <path d="M462 470 L778 470" />
          </g>
          {/* roof rails */}
          <path d="M440 274 L802 274" stroke="#fff" strokeOpacity="0.16" strokeWidth="6" strokeLinecap="round" />
          {/* mirrors */}
          <rect x="386" y="266" width="46" height="34" rx="12" fill={c.bodyDark} />
          <rect x="808" y="266" width="46" height="34" rx="12" fill={c.bodyDark} />
        </>
      )}
      <ellipse cx="620" cy="588" rx="330" ry="16" fill="#000" opacity="0.4" />
    </g>
  );
}

export function CarFigure({
  view,
  paint,
  glass,
}: {
  view: ViewId;
  paint: Paint;
  glass: Glass;
}) {
  return (
    <svg viewBox={FIG_VIEWBOX} className="h-full w-full">
      {view === "left" && <SideFigure paint={paint} glass={glass} />}
      {view === "right" && <SideFigure paint={paint} glass={glass} mirror />}
      {view === "front" && <EndFigure paint={paint} glass={glass} />}
      {view === "rear" && <EndFigure paint={paint} glass={glass} rear />}
      {view === "top" && <PlanFigure paint={paint} glass={glass} />}
      {view === "under" && <PlanFigure paint={paint} glass={glass} under />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Concerns + hotspot coordinates (in the 1240 × 620 figure space)    */
/* ------------------------------------------------------------------ */

export type Concern = {
  id: string;
  label: string;
  group: string;
  pos: Partial<Record<ViewId, [number, number][]>>;
};

export const CONCERNS: Concern[] = [
  {
    id: "bumper-front", label: "Front bumper / impact damage", group: "Bodywork",
    pos: { front: [[620, 508]], left: [[180, 444]], right: [[1060, 444]], top: [[620, 108]] },
  },
  {
    id: "bonnet", label: "Bonnet, panels & panel gaps", group: "Bodywork",
    pos: { front: [[620, 286]], left: [[300, 294]], right: [[940, 294]], top: [[620, 148]] },
  },
  {
    id: "bumper-rear", label: "Rear bumper / diffuser", group: "Bodywork",
    pos: { rear: [[620, 500]], left: [[1104, 440]], right: [[136, 440]] },
  },
  {
    id: "paint", label: "Paint, swirls & corrosion", group: "Bodywork",
    pos: { rear: [[420, 292]], left: [[540, 300]], right: [[700, 300]], top: [[620, 74]] },
  },
  {
    id: "windscreen", label: "Windscreen & camera", group: "Glass",
    pos: { front: [[620, 196]], left: [[512, 246]], right: [[728, 246]], top: [[620, 232]] },
  },
  {
    id: "side-glass", label: "Side windows & tint", group: "Glass",
    pos: { left: [[676, 252]], right: [[564, 252]], top: [[620, 326]] },
  },
  {
    id: "roof-seals", label: "Roof & door seals (leaks)", group: "Glass",
    pos: { front: [[620, 124]], left: [[672, 200]], right: [[568, 200]], top: [[620, 286]] },
  },
  {
    id: "headlights", label: "Headlamps & levelling", group: "Electrical",
    pos: { front: [[418, 316], [822, 316]], left: [[206, 331]], right: [[1034, 331]], top: [[500, 122], [740, 122]] },
  },
  {
    id: "taillights", label: "Tail lamps & wiring", group: "Electrical",
    pos: { rear: [[620, 330]], left: [[1086, 300]], right: [[154, 300]], top: [[620, 522]] },
  },
  {
    id: "battery", label: "Battery & electrics", group: "Electrical",
    pos: { left: [[600, 300]], right: [[640, 300]] },
  },
  {
    id: "wheels-front", label: "Front wheels & tyres", group: "Wheels & brakes",
    pos: { front: [[286, 508], [954, 508]], left: [[318, 436]], right: [[922, 436]], top: [[314, 224], [926, 224]], under: [[314, 224], [926, 224]] },
  },
  {
    id: "wheels-rear", label: "Rear wheels & tyres", group: "Wheels & brakes",
    pos: { rear: [[286, 508], [954, 508]], left: [[940, 436]], right: [[300, 436]], top: [[314, 444], [926, 444]], under: [[314, 444], [926, 444]] },
  },
  {
    id: "brakes", label: "Brakes — pads, discs, sensors", group: "Wheels & brakes",
    pos: { front: [[360, 452], [880, 452]], left: [[392, 436]], right: [[848, 436]], under: [[400, 210], [840, 210], [400, 470], [840, 470]] },
  },
  {
    id: "suspension", label: "Suspension, knocks & clunks", group: "Chassis",
    pos: { rear: [[620, 468]], left: [[806, 436]], right: [[434, 436]], under: [[314, 300], [926, 300], [314, 520], [926, 520]] },
  },
  {
    id: "steering", label: "Steering & tracking", group: "Chassis",
    pos: { left: [[436, 396]], right: [[804, 396]], under: [[620, 226]] },
  },
  {
    id: "engine", label: "Engine — running, noise, smoke", group: "Drivetrain",
    pos: { rear: [[620, 268]], left: [[920, 296]], right: [[320, 296]], under: [[620, 186]] },
  },
  {
    id: "gearbox", label: "Gearbox / DSG & clutch", group: "Drivetrain",
    pos: { rear: [[620, 366]], left: [[836, 340]], right: [[404, 340]], under: [[620, 286]] },
  },
  {
    id: "exhaust", label: "Exhaust, DPF & emissions", group: "Drivetrain",
    pos: { rear: [[500, 516]], left: [[1114, 420]], right: [[126, 420]], under: [[500, 400], [740, 400]] },
  },
  {
    id: "ac", label: "Air conditioning & heating", group: "Comfort",
    pos: { front: [[620, 412]], left: [[240, 336]], right: [[1000, 336]] },
  },
  {
    id: "interior", label: "Interior, trim & seats", group: "Comfort",
    pos: { left: [[632, 330]], right: [[608, 330]], top: [[620, 356]] },
  },
];

export const CONCERN_GROUPS = [
  "Bodywork", "Glass", "Electrical", "Wheels & brakes", "Chassis", "Drivetrain", "Comfort",
];

/* ------------------------------------------------------------------ */
/*  Model catalogue                                                    */
/* ------------------------------------------------------------------ */

export type Model = {
  id: string;
  brand: string;
  name: string;
  shape: "supercar" | "gt" | "sedan" | "suv" | "roadster" | "coupe" | "ev" | "classic";
  class: string;
  note: string;
};

export const MODELS: Model[] = [
  { id: "r8", brand: "Audi", name: "R8 / RS lineage", shape: "supercar", class: "Mid-engine supercar", note: "Also covers Huracán platform" },
  { id: "911", brand: "Porsche", name: "911 Carrera / Turbo", shape: "gt", class: "Rear-engine sports", note: "991 / 992 generations" },
  { id: "amggt", brand: "Mercedes-AMG", name: "GT / SL Roadster", shape: "roadster", class: "Grand tourer", note: "Also GLE / E-Class AMG" },
  { id: "bmwm", brand: "BMW M", name: "M3 / M4 / M5", shape: "coupe", class: "Performance saloon", note: "Also 3, 5, 7 series" },
  { id: "ur", brand: "Land Rover", name: "Range Rover / Sport", shape: "suv", class: "Luxury SUV", note: "Also Discovery, Defender" },
  { id: "bentley", brand: "Bentley", name: "Continental GT / Flying Spur", shape: "gt", class: "Luxury coupe", note: "Also Rolls-Royce Wraith" },
  { id: "ev", brand: "Tesla / EV", name: "Model S / Taycan / iX", shape: "ev", class: "Electric", note: "HV battery certified" },
  { id: "classic", brand: "Classic", name: "Pre-2000 classics", shape: "classic", class: "Heritage", note: "Carburettors to early EFI" },
];

export function Silhouette({ shape, color = "#dfae55" }: { shape: Model["shape"]; color?: string }) {
  const shapes: Record<Model["shape"], string> = {
    supercar:
      "M6 44 L20 38 L44 30 L62 22 L86 20 L104 24 L118 32 L128 38 L132 46 L124 50 L106 51 L92 47 L84 51 L46 51 L38 47 L14 50 Z",
    gt: "M4 46 L14 38 L34 30 L56 22 L92 21 L114 30 L130 40 L132 48 L120 51 L98 47 L88 51 L42 51 L32 47 L10 50 Z",
    sedan:
      "M4 46 L14 38 L30 33 L46 22 L94 21 L114 33 L130 41 L132 49 L118 51 L96 47 L86 51 L44 51 L34 47 L12 51 Z",
    suv:
      "M4 42 L12 30 L30 24 L44 12 L100 11 L118 24 L132 32 L132 50 L118 51 L96 47 L84 51 L46 51 L34 47 L10 51 Z",
    roadster:
      "M6 46 L20 40 L42 33 L60 26 L82 25 L98 30 L112 36 L128 42 L130 49 L118 51 L96 46 L86 51 L44 51 L34 46 L12 51 Z",
    coupe:
      "M4 46 L16 38 L36 30 L54 20 L96 19 L116 30 L130 40 L132 49 L118 51 L96 47 L86 51 L44 51 L34 47 L12 51 Z",
    ev:
      "M6 44 L18 34 L36 27 L52 18 L92 17 L114 27 L130 38 L132 49 L118 51 L96 47 L86 51 L44 51 L34 47 L12 51 Z",
    classic:
      "M8 44 L22 36 L40 32 L54 24 L92 23 L112 30 L126 40 L130 49 L116 51 L96 47 L86 51 L44 51 L34 47 L12 51 Z",
  };
  return (
    <svg viewBox="0 0 136 62" className="h-full w-full">
      <path d={shapes[shape]} fill={color} opacity="0.9" />
      <circle cx="38" cy="48" r="8" fill="#0a0c11" />
      <circle cx="96" cy="48" r="8" fill="#0a0c11" />
      <circle cx="38" cy="48" r="3.4" fill="#8b939d" />
      <circle cx="96" cy="48" r="3.4" fill="#8b939d" />
    </svg>
  );
}
