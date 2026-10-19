import { CAR_PARTS, PART_GROUPS } from "../car/parts";
import { PAINTS, getGlass } from "../car/paint";
import CarStage from "../car/CarStage";
import type { Phase } from "../hooks/useScrollDrive";
import { GARAGE, whatsappLink } from "../config";
import { Button, Eyebrow, Panel, Reveal, Stat } from "../components/ui";

const BRANDS = [
  "Ford Mustang", "Chevrolet Camaro", "Dodge", "Porsche", "BMW M", "Mercedes-AMG",
  "Audi Sport", "Range Rover", "Volkswagen", "Mini", "Nissan", "Toyota",
];

const SERVICES = [
  {
    t: "Tuning & performance",
    d: "Remaps, exhausts, intakes and suspension work — set up for the road, the strip or the show.",
    n: "01",
  },
  {
    t: "Accessories & parts",
    d: "All types of accessories and parts, sourced and fitted: lighting, interiors, audio, trim.",
    n: "02",
  },
  {
    t: "Body kits & wraps",
    d: "Bumpers, skirts, spoilers and wide-body kits, plus vinyl wraps and paint protection film.",
    n: "03",
  },
  {
    t: "Wheels & tyres",
    d: "Alloy and forged wheels, tyre packages, and stance dialled in to the millimetre.",
    n: "04",
  },
  {
    t: "Vente & location",
    d: "Consignment sales and rental of luxury and sports cars — we handle the listing, the viewing and the paperwork.",
    n: "05",
  },
  {
    t: "Diagnostics & follow-up",
    d: "Factory-level scan tools, live data and fault tracing — before and after every build.",
    n: "06",
  },
];

const PHASE_LABEL: Record<Phase, string> = {
  assembled: "Assembled",
  exploding: "Disassembling",
  exploded: "Fully separated",
  reassembling: "Reassembling",
};

export default function Home({
  onNavigate,
  targetRef,
  phase,
}: {
  onNavigate: (r: string) => void;
  targetRef: { current: number };
  phase: Phase;
}) {
  const paint = PAINTS[2];
  const glass = getGlass("tinted");

  return (
    <>
      {/* ---------- fixed 3D car behind everything ---------- */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="grid-floor absolute inset-x-0 bottom-0 top-1/3 opacity-40 [mask-image:linear-gradient(to_top,black,transparent)]" />
        <div
          className="absolute left-1/2 top-[52%] aspect-[1240/520] w-[min(1180px,116vw)] sm:w-[min(1180px,94vw)]"
          style={{
            transform:
              "translate(-50%, -50%) scale(calc(1 - var(--e, 0) * 0.24))",
          }}
        >
          <CarStage paint={paint} glass={glass} targetRef={targetRef} showLabels />
        </div>
        {/* dim the car as the page moves on to denser content */}
        <div
          className="absolute inset-0 bg-ink-950"
          style={{ opacity: "clamp(0, calc((var(--p, 0) - 0.58) * 2.4), 0.94)" }}
        />
      </div>

      {/* ---------- build-state HUD ---------- */}
      <div
        className="pointer-events-none fixed bottom-5 left-5 z-40 hidden items-center gap-3 rounded-full border border-white/10 bg-ink-950/70 px-4 py-2.5 backdrop-blur-md lg:flex"
        style={{ opacity: "clamp(0, calc((0.78 - var(--p, 0)) * 5), 1)" }}
      >
        <span className="relative grid h-2.5 w-2.5 place-items-center">
          <span className="absolute h-2.5 w-2.5 rounded-full bg-gold-400/50 pulse-ring" />
          <span className="h-1.5 w-1.5 rounded-full bg-gold-300" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
          Stage
        </span>
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-200">
          {PHASE_LABEL[phase]}
        </span>
        <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-300"
            style={{ width: "calc(var(--e, 0) * 100%)" }}
          />
        </span>
      </div>

      <main className="relative z-10">
        {/* ================= HERO ================= */}
        <section className="relative flex min-h-[100svh] items-center pt-24">
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/70" />
          <div className="relative mx-auto w-full max-w-[1320px] px-5 sm:px-8">
            <div className="max-w-[560px]">
              <Eyebrow>{GARAGE.tagline} · Sousse</Eyebrow>
              <h1 className="mt-6 font-display text-[clamp(2.4rem,6.4vw,4.6rem)] font-bold leading-[0.98] tracking-[-0.02em] text-white">
                Built to be
                <br />
                <span className="bg-gradient-to-r from-gold-100 via-gold-300 to-gold-500 bg-clip-text text-transparent">
                  looked at twice.
                </span>
              </h1>
              <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-white/55 sm:text-base">
                {GARAGE.name} is a tuning showroom for luxury and sports cars.
                Accessories, performance work, body kits and wheels — plus
                consignment sales and rentals. Describe the build you want and
                send it to us on WhatsApp.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button onClick={() => onNavigate("diagnose")}>
                  Start your build
                  <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Button>
                <Button variant="ghost" onClick={() => onNavigate("services")}>
                  What we do
                </Button>
              </div>
              <div className="mt-14 grid max-w-[520px] grid-cols-3 gap-6 border-t border-white/10 pt-8">
                <Stat value="8.4K" label="TikTok followers" />
                <Stat value="10.5K" label="Likes on TikTok" />
                <Stat value="2.2K" label="Instagram followers" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-7 right-5 hidden items-center gap-3 sm:right-8 lg:flex">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
              Scroll to open the car
            </span>
            <span className="relative h-14 w-px overflow-hidden bg-white/15">
              <span className="absolute inset-x-0 top-0 h-5 animate-[float-soft_2.2s_ease-in-out_infinite] bg-gold-400" />
            </span>
          </div>
        </section>

        {/* ================= COMING APART ================= */}
        <section
          id="car-explode-start"
          className="flex min-h-[70svh] items-center justify-center px-5 py-20"
        >
          <div className="max-w-[440px] rounded-3xl border border-white/[0.06] bg-ink-950/55 px-7 py-10 text-center backdrop-blur-md sm:px-10">
            <Reveal>
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold-300/80">
                Step 01 / 03
              </span>
              <h2 className="mt-5 font-display text-[clamp(1.8rem,4vw,2.9rem)] font-semibold leading-tight text-white">
                It comes apart in your hands.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/45">
                {CAR_PARTS.length} components, separated live as you scroll. It
                is exactly how we plan a build — one part at a time.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ================= EXPLODED / STICKY COPY ================= */}
        <section id="work" className="relative min-h-[150svh] px-5 py-24 sm:px-8">
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[52%] bg-gradient-to-r from-ink-950 via-ink-950/85 to-transparent lg:block" />
          <div className="relative mx-auto max-w-[1320px]">
            <div className="sticky top-[18vh] max-w-[330px]">
              <Eyebrow>The workshop</Eyebrow>
              <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-semibold leading-[1.05] text-white">
                We don't guess.
                <br />
                We build it.
              </h2>
              <div className="mt-9 space-y-7">
                {[
                  {
                    n: "01",
                    t: "Tell us the build",
                    d: "Stock, subtle or full show car — point at the parts you want changed and we price it.",
                  },
                  {
                    n: "02",
                    t: "Parts and labour, itemised",
                    d: "Accessories, bodywork, wheels, performance. You see the line items before we start.",
                  },
                  {
                    n: "03",
                    t: "Built, photographed, delivered",
                    d: "Progress shots as it goes together, then the finished car on our feed.",
                  },
                ].map((s, i) => (
                  <Reveal key={s.n} delay={i * 120}>
                    <div className="border-l border-white/10 pl-5">
                      <span className="font-mono text-[10px] tracking-[0.3em] text-gold-400/70">
                        {s.n}
                      </span>
                      <h3 className="mt-2 font-display text-base font-semibold text-white">
                        {s.t}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-white/40">
                        {s.d}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= EVERY PART LISTED ================= */}
        <section
          id="car-explode-full"
          className="relative flex min-h-[110svh] items-center px-5 py-24 sm:px-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-ink-950/45" />
          <div className="relative mx-auto w-full max-w-[1320px]">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
              <Reveal>
                <Eyebrow>Step 02 / 03</Eyebrow>
                <h2 className="mt-5 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1] text-white">
                  Every part,
                  <br />
                  <span className="text-gold-300">isolated and priced.</span>
                </h2>
                <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-white/50">
                  While the car is apart, each component is inspectable. In the
                  build tool you tap the ones you want changed and we price the
                  job around them.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button onClick={() => onNavigate("diagnose")}>
                    Try the build tool
                  </Button>
                </div>
              </Reveal>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {PART_GROUPS.map((g, gi) => (
                  <Reveal key={g} delay={gi * 70}>
                    <Panel hover className="h-full p-4">
                      <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-gold-400/70">
                        {g}
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {CAR_PARTS.filter((p) => p.group === g).map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center gap-2 text-[12px] text-white/55"
                          >
                            <span className="h-1 w-1 rounded-full bg-white/25" />
                            {p.name}
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= BACK TOGETHER ================= */}
        <section
          id="car-reassemble"
          className="relative flex min-h-[100svh] items-center justify-center px-5 py-24 sm:px-8"
        >
          <Reveal className="w-full">
            <div className="mx-auto max-w-[720px] text-center">
              <Eyebrow>Step 03 / 03</Eyebrow>
              <h2 className="mt-6 font-display text-[clamp(2.2rem,6vw,4rem)] font-bold leading-[1.02] text-white">
                Then we put it all
                <br />
                <span className="bg-gradient-to-r from-gold-100 via-gold-300 to-gold-500 bg-clip-text text-transparent">
                  back together.
                </span>
              </h2>
              <p className="mx-auto mt-6 max-w-[52ch] text-[15px] leading-relaxed text-white/50">
                Torque-spec assembly, OEM or upgraded parts, and a road test
                before you ever see the invoice. Nothing rattles, nothing is
                left over.
              </p>
              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {[
                  ["OEM + uprated", "Factory or better, your choice"],
                  ["Photographed", "Every step documented for you"],
                  ["Road tested", "Warm, cold, and 30 miles after"],
                ].map(([t, d]) => (
                  <Panel key={t} className="p-5 text-left">
                    <div className="font-display text-sm font-semibold text-gold-200">
                      {t}
                    </div>
                    <div className="mt-1.5 text-[12.5px] leading-relaxed text-white/40">
                      {d}
                    </div>
                  </Panel>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ================= SERVICES ================= */}
        <section id="services" className="relative px-5 py-24 sm:px-8">
          <div className="pointer-events-none absolute inset-0 bg-ink-950/75 backdrop-blur-[2px]" />
          <div className="relative mx-auto max-w-[1320px]">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <Eyebrow>Capabilities</Eyebrow>
                  <h2 className="mt-5 font-display text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.05] text-white">
                    What we do
                  </h2>
                </div>
                <p className="max-w-[38ch] text-sm leading-relaxed text-white/45">
                  Tuning, accessories, bodywork, wheels and tyres — plus
                  consignment sales and rentals. One build at a time, and you
                  deal with the same person start to finish.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((s, i) => (
                <Reveal key={s.t} delay={i * 60}>
                  <Panel hover className="group h-full overflow-hidden p-7">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-[11px] tracking-[0.3em] text-gold-400/60">
                        {s.n}
                      </span>
                      <span className="text-white/15 transition-all duration-500 group-hover:translate-x-1 group-hover:text-gold-300">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 17 17 7M9 7h8v8" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-8 font-display text-lg font-semibold text-white">
                      {s.t}
                    </h3>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-white/45">
                      {s.d}
                    </p>
                  </Panel>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= BRANDS ================= */}
        <section className="overflow-hidden border-y border-white/[0.07] bg-ink-950/60 py-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-5 sm:px-8">
            <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 sm:block">
              Trusted with
            </span>
            <div className="hide-scrollbar flex gap-10 overflow-x-auto">
              {BRANDS.map((b) => (
                <span
                  key={b}
                  className="shrink-0 font-display text-lg font-semibold uppercase tracking-[0.14em] text-white/25 transition-colors hover:text-gold-200 sm:text-xl"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ================= SOCIAL ================= */}
        <section className="relative px-5 py-24 sm:px-8">
          <div className="pointer-events-none absolute inset-0 bg-ink-950/75 backdrop-blur-[2px]" />
          <div className="relative mx-auto max-w-[1320px]">
            <Reveal>
              <Eyebrow>Follow the builds</Eyebrow>
              <h2 className="mt-5 max-w-[26ch] font-display text-[clamp(1.9rem,4.4vw,3rem)] font-bold leading-[1.05] text-white">
                The work is on our feed, not in a brochure.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {[
                {
                  n: "TikTok",
                  h: GARAGE.tiktokHandle,
                  d: "8.4K followers and 10.5K likes. Builds, walkarounds and cars as they arrive.",
                  href: GARAGE.tiktok,
                },
                {
                  n: "Instagram",
                  h: GARAGE.instagramHandle,
                  d: "2.2K followers. The showroom floor — Mustang, Camaro, Porsche, Dodge and more.",
                  href: GARAGE.instagram,
                },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 90}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="block">
                    <Panel hover className="flex h-full flex-col p-7">
                      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-400/70">
                        {s.n}
                      </div>
                      <div className="mt-4 font-display text-xl font-semibold text-white">
                        {s.h}
                      </div>
                      <p className="mt-3 flex-1 text-[14px] leading-relaxed text-white/55">
                        {s.d}
                      </p>
                      <span className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-300">
                        Open <span aria-hidden>↗</span>
                      </span>
                    </Panel>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="px-5 pb-28 sm:px-8">
          <Reveal>
            <div className="relative mx-auto max-w-[1320px] overflow-hidden rounded-3xl border border-gold-400/20 bg-ink-950 bg-gradient-to-br from-gold-400/[0.16] via-ink-900 to-ink-950 p-10 sm:p-16">
              <div className="noise pointer-events-none absolute inset-0 opacity-[0.06]" />
              <div className="relative max-w-[620px]">
                <Eyebrow>Ready when you are</Eyebrow>
                <h2 className="mt-5 font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[1.03] text-white">
                  Tell us the build.
                  <br />
                  We'll do the rest.
                </h2>
                <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-white/55">
                  Open the build tool, pick a model close to yours, tap the parts
                  you want changed, and send it straight to our WhatsApp.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Button onClick={() => onNavigate("diagnose")}>
                    Open the build tool
                  </Button>
                  <Button
                    variant="wa"
                    target="_blank"
                    href={whatsappLink(
                      `Bonjour ${GARAGE.name}, je voudrais des informations pour ma voiture : `,
                    )}
                  >
                    Message us on WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </>
  );
}
