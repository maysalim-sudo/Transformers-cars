// Renders the app's car parts to standalone SVG via React server rendering.
// Usage: node art/export-car.mjs   (built by esbuild from this .tsx)
import { renderToStaticMarkup } from "react-dom/server";
import { CAR_PARTS, CAR_W, CAR_H, CAR_VIEWBOX } from "../src/car/parts";
import { buildPartPaint, getGlass, getPaint } from "../src/car/paint";

const paint = getPaint("rosso");
const glass = getGlass("tinted");
const pp = buildPartPaint(paint, glass);
const parts = [...CAR_PARTS].sort((a, b) => a.z - b.z);

// e = 0 assembled, e = 1 fully exploded. Approximation: apply the 2D part of
// the transform (dx, dy + rotation); the z component has no static 2D analogue.
function scene(e: number) {
  return renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={CAR_VIEWBOX}
      width={CAR_W}
      height={CAR_H}
    >
      <rect x={0} y={0} width={CAR_W} height={CAR_H} fill="#06070a" />
      {parts.map((p) => (
        <g
          key={p.id}
          transform={
            e === 0
              ? undefined
              : `translate(${p.dx * e} ${p.dy * e})` +
                (p.rot ? ` rotate(${p.rot * e} ${p.anchor[0]} ${p.anchor[1]})` : "")
          }
        >
          {p.draw(pp, p.id)}
        </g>
      ))}
    </svg>,
  );
}

process.stdout.write("===ASSEMBLED===\n" + scene(0) + "\n===EXPLODED===\n" + scene(1) + "\n");
