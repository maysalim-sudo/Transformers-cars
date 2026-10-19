import { useMemo, useState } from "react";
import { CarFigure, CONCERNS, CONCERN_GROUPS, MODELS, Silhouette, VIEWS, type ViewId } from "../car/views";
import CarStage from "../car/CarStage";
import { GLASSES, PAINTS, getGlass, getPaint } from "../car/paint";
import { buildDiagnosisMessage, GARAGE, whatsappLink } from "../config";
import { Button, Eyebrow, Panel, Check } from "../components/ui";
import { cn } from "../utils/cn";

const STEPS = ["Vehicle", "Parts", "Spec", "Send"];

const SEVERITY = ["Just a check-up", "Annoying but drivable", "Getting worse", "Undrivable / recovery"];
const DRIVABLE = ["Yes, I can drive it in", "Only short distances", "No — needs recovery"];

export default function Diagnose() {
  const [step, setStep] = useState(0);
  const [modelId, setModelId] = useState<string | null>(null);
  const [customModel, setCustomModel] = useState("");
  const [view, setView] = useState<ViewId>("front");
  const [inspected, setInspected] = useState<ViewId[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [paintId, setPaintId] = useState(PAINTS[2].id);
  const [glassId, setGlassId] = useState(GLASSES[1].id);
  const [explode, setExplode] = useState(0);
  const [severity, setSeverity] = useState(SEVERITY[1]);
  const [drivable, setDrivable] = useState(DRIVABLE[0]);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");

  const paint = getPaint(paintId);
  const glass = getGlass(glassId);
  const model = MODELS.find((m) => m.id === modelId) ?? null;
  const modelLabel = customModel.trim() ? `${model ? model.brand + " " : ""}${customModel.trim()}` : model ? `${model.brand} ${model.name}` : "Not selected";

  const switchView = (v: ViewId) => {
    setView(v);
    setInspected((prev) => (prev.includes(v) ? prev : [...prev, v]));
  };

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const visibleConcerns = useMemo(
    () => CONCERNS.filter((c) => c.pos[view]?.length),
    [view],
  );

  const message = buildDiagnosisMessage({
    model: modelLabel,
    views: inspected.map((v) => VIEWS.find((x) => x.id === v)?.label ?? v),
    parts: picked.map((id) => CONCERNS.find((c) => c.id === id)?.label ?? id),
    paint: paint.name,
    glass: glass.name,
    severity,
    drivable,
    notes,
    name,
    phone,
  });

  const filtered = MODELS.filter(
    (m) =>
      !query.trim() ||
      (m.brand + m.name + m.class + m.note).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-ink-950 pb-32 pt-[76px]">
      {/* ambient light */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="grid-floor absolute inset-x-0 bottom-0 top-1/2 opacity-30 [mask-image:linear-gradient(to_top,black,transparent)]" />
        <div className="absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-gold-400/[0.07] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8">
        {/* ---------- header ---------- */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>Build tool · Step {step + 1} of 4</Eyebrow>
            <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[1.02] text-white">
              Tell us what you want built.
            </h1>
            <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-white/45">
              Pick a model close to yours, rotate through the six sides, and tap
              the parts you want changed. No account, no forms — it goes
              straight to our WhatsApp.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Selected
            </span>
            <span className="font-display text-sm font-bold text-gold-300">
              {picked.length}
            </span>
            <span className="mx-1 h-4 w-px bg-white/10" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Views
            </span>
            <span className="font-display text-sm font-bold text-gold-300">
              {inspected.length}/6
            </span>
          </div>
        </div>

        {/* ---------- stepper ---------- */}
        <div className="mt-9 grid grid-cols-4 gap-2 sm:gap-4">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className="group text-left"
            >
              <div
                className={cn(
                  "h-[3px] w-full rounded-full transition-all duration-500",
                  i <= step ? "bg-gold-400" : "bg-white/10",
                )}
              />
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full font-mono text-[10px] transition-colors",
                    i < step
                      ? "bg-gold-400 text-ink-950"
                      : i === step
                        ? "border border-gold-400 text-gold-300"
                        : "border border-white/15 text-white/30",
                  )}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span
                  className={cn(
                    "font-display text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors sm:text-[12px]",
                    i === step ? "text-white" : "text-white/35 group-hover:text-white/60",
                  )}
                >
                  {s}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* ---------- workspace ---------- */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* ============ viewer ============ */}
          <div className="lg:sticky lg:top-[96px] lg:self-start">
            <Panel className="overflow-hidden">
              {/* view tabs */}
              <div className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-white/[0.07] p-3">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => switchView(v.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.14em] transition-all",
                      view === v.id
                        ? "bg-gold-400 text-ink-950"
                        : "text-white/45 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* figure */}
              <div className="relative aspect-[1240/620] w-full bg-[radial-gradient(60%_60%_at_50%_45%,rgba(223,174,85,0.10),transparent_70%)]">
                <div className="absolute inset-x-6 bottom-4 h-16 rounded-[50%] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.7),transparent_70%)] blur-md" />
                <CarFigure view={view} paint={paint} glass={glass} />

                {/* hotspots */}
                {visibleConcerns.map((c) =>
                  (c.pos[view] ?? []).map(([x, y], i) => {
                    const on = picked.includes(c.id);
                    return (
                      <button
                        key={c.id + i}
                        onClick={() => {
                          toggle(c.id);
                          setInspected((p) => (p.includes(view) ? p : [...p, view]));
                        }}
                        title={c.label}
                        aria-label={c.label}
                        aria-pressed={picked.includes(c.id)}
                        className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${(x / 1240) * 100}%`, top: `${(y / 620) * 100}%` }}
                      >
                        <span className="relative grid place-items-center">
                          {!on && (
                            <span className="pulse-ring absolute h-8 w-8 rounded-full border border-gold-300/70" />
                          )}
                          <span
                            className={cn(
                              "grid h-5 w-5 place-items-center rounded-full border transition-all duration-300 group-hover:scale-125",
                              on
                                ? "border-gold-200 bg-gold-400 text-ink-950"
                                : "border-gold-300/70 bg-ink-950/70 text-gold-200 backdrop-blur",
                            )}
                          >
                            {on ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-gold-300" />
                            )}
                          </span>
                        </span>
                        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[200px] -translate-x-1/2 scale-95 rounded-md border border-white/10 bg-ink-950/95 px-2.5 py-1.5 text-center text-[10.5px] leading-snug text-white/85 opacity-0 shadow-xl transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                          {c.label}
                        </span>
                      </button>
                    );
                  }),
                )}

                {/* view badge */}
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/70 px-3 py-1.5 backdrop-blur">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold-300">
                    {VIEWS.find((v) => v.id === view)?.short}
                  </span>
                  <span className="hidden text-[10.5px] text-white/50 sm:block">
                    {VIEWS.find((v) => v.id === view)?.hint}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Tap a marker to flag it
                </span>
                <div className="flex items-center gap-1.5">
                  {VIEWS.map((v) => (
                    <span
                      key={v.id}
                      className={cn(
                        "h-1.5 w-6 rounded-full transition-colors",
                        inspected.includes(v.id) ? "bg-gold-400" : "bg-white/10",
                      )}
                    />
                  ))}
                </div>
              </div>
            </Panel>

            {/* live spec strip */}
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 backdrop-blur">
              <span className="h-5 w-5 rounded-full border border-white/20" style={{ background: paint.body }} />
              <span className="text-[12px] text-white/70">{paint.name}</span>
              <span className="h-4 w-px bg-white/10" />
              <span className="h-4 w-7 rounded-sm border border-white/15" style={{ background: glass.fill, opacity: 0.9 }} />
              <span className="text-[12px] text-white/70">{glass.name}</span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
                Live preview
              </span>
            </div>
          </div>

          {/* ============ panel ============ */}
          <div className="space-y-4">
            {/* ---------- STEP 0 : model ---------- */}
            {step === 0 && (
              <>
                <Panel className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="font-display text-base font-semibold text-white">
                      Choose a vehicle
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                      {filtered.length} of {MODELS.length}
                    </span>
                  </div>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search brand or model…"
                    className="mt-4 w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-gold-400/60 focus:outline-none"
                  />
                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-2">
                    {filtered.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setModelId(m.id)}
                        className={cn(
                          "group rounded-xl border p-3 text-left transition-all duration-300",
                          modelId === m.id
                            ? "border-gold-400/70 bg-gold-400/[0.12]"
                            : "border-white/[0.08] bg-white/[0.02] hover:border-gold-400/40",
                        )}
                      >
                        <div className="h-11">
                          <Silhouette
                            shape={m.shape}
                            color={modelId === m.id ? paint.body : "#8c939c"}
                          />
                        </div>
                        <div className="mt-2 font-display text-[12.5px] font-semibold leading-tight text-white">
                          {m.brand}
                        </div>
                        <div className="mt-0.5 text-[11px] leading-snug text-white/40">
                          {m.class}
                        </div>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel className="p-5">
                  <h3 className="font-display text-sm font-semibold text-white">
                    Not listed? Give us the closest match.
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
                    The tool is a reference, not a database. Type your exact car
                    and we'll map it to the right platform ourselves.
                  </p>
                  <input
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="e.g. 2019 Audi S5 Sportback, 3.0 TFSI"
                    className="mt-4 w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-gold-400/60 focus:outline-none"
                  />
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#25d366]/20 bg-[#25d366]/[0.07] px-4 py-3">
                    <span className="text-[13px] text-[#8ef0b0]">
                      {model ? `Using ${model.brand} reference geometry` : "No reference selected yet"}
                    </span>
                  </div>
                </Panel>
              </>
            )}

            {/* ---------- STEP 1 : symptoms ---------- */}
            {step === 1 && (
              <>
                {picked.length > 0 && (
                  <Panel className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold text-white">
                        Flagged ({picked.length})
                      </h3>
                      <button
                        onClick={() => setPicked([])}
                        className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35 hover:text-gold-300"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {picked.map((id) => {
                        const c = CONCERNS.find((x) => x.id === id)!;
                        return (
                          <button
                            key={id}
                            onClick={() => toggle(id)}
                            className="group inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/[0.12] px-3 py-1.5 text-[12px] text-gold-100"
                          >
                            {c.label}
                            <span className="text-gold-300/60 group-hover:text-gold-100">✕</span>
                          </button>
                        );
                      })}
                    </div>
                  </Panel>
                )}

                {CONCERN_GROUPS.map((g) => (
                  <Panel key={g} className="p-5">
                    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-400/70">
                      {g}
                    </div>
                    <div className="mt-3 space-y-1">
                      {CONCERNS.filter((c) => c.group === g).map((c) => {
                        const on = picked.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggle(c.id)}
                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                          >
                            <span
                              className={cn(
                                "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all",
                                on
                                  ? "border-gold-300 bg-gold-400 text-ink-950"
                                  : "border-white/20 text-transparent",
                              )}
                            >
                              <Check className="h-3 w-3" />
                            </span>
                            <span
                              className={cn(
                                "text-[13px] leading-snug transition-colors",
                                on ? "text-white" : "text-white/55",
                              )}
                            >
                              {c.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Panel>
                ))}
              </>
            )}

            {/* ---------- STEP 2 : spec ---------- */}
            {step === 2 && (
              <>
                <Panel className="p-5">
                  <h3 className="font-display text-sm font-semibold text-white">
                    Paint you'd like to see
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
                    Purely a preview — but if you're here for respray or PPF,
                    this is the colour we'll quote.
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-3">
                    {PAINTS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPaintId(p.id)}
                        className={cn(
                          "rounded-xl border p-2.5 text-left transition-all",
                          paintId === p.id
                            ? "border-gold-400/70 bg-gold-400/[0.1]"
                            : "border-white/[0.08] hover:border-white/20",
                        )}
                      >
                        <span
                          className="block h-12 w-full rounded-lg border border-white/10"
                          style={{
                            background: `linear-gradient(140deg, ${p.body} 0%, ${p.body} 55%, rgba(255,255,255,0.22) 100%)`,
                          }}
                        />
                        <span className="mt-2 block text-[11.5px] font-medium leading-tight text-white/80">
                          {p.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                          {p.price}
                        </span>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel className="p-5">
                  <h3 className="font-display text-sm font-semibold text-white">
                    Glazing
                  </h3>
                  <div className="mt-4 space-y-2">
                    {GLASSES.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGlassId(g.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                          glassId === g.id
                            ? "border-gold-400/70 bg-gold-400/[0.1]"
                            : "border-white/[0.08] hover:border-white/20",
                        )}
                      >
                        <span
                          className="h-10 w-14 shrink-0 rounded-md border border-white/15"
                          style={{ background: g.fill, opacity: 0.92 }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium text-white">
                            {g.name}
                          </span>
                          <span className="mt-0.5 block text-[11.5px] text-white/40">
                            {g.note}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                          {g.price}
                        </span>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel className="overflow-hidden">
                  <div className="flex items-center justify-between px-5 pt-5">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-white">
                        Open it up
                      </h3>
                      <p className="mt-1 text-[12px] text-white/40">
                        Drag to inspect the build
                      </p>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-300/70">
                      {Math.round(explode * 100)}%
                    </span>
                  </div>
                  <div className="relative mt-3 aspect-[1240/560] w-full">
                    <CarStage
                      paint={paint}
                      glass={glass}
                      value={explode}
                      showLabels={explode > 0.6}
                    />
                  </div>
                  <div className="px-5 pb-5">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={explode}
                      onChange={(e) => setExplode(parseFloat(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-gold-400"
                      style={{
                        background: `linear-gradient(90deg, #dfae55 ${explode * 100}%, rgba(255,255,255,0.1) ${explode * 100}%)`,
                      }}
                    />
                  </div>
                </Panel>
              </>
            )}

            {/* ---------- STEP 3 : send ---------- */}
            {step === 3 && (
              <>
                <Panel className="p-5">
                  <h3 className="font-display text-sm font-semibold text-white">
                    How bad is it?
                  </h3>
                  <div className="mt-4 space-y-2">
                    {SEVERITY.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSeverity(s)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[13px] transition-all",
                          severity === s
                            ? "border-gold-400/70 bg-gold-400/[0.1] text-white"
                            : "border-white/[0.08] text-white/55 hover:border-white/20",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            severity === s ? "bg-gold-400" : "bg-white/20",
                          )}
                        />
                        {s}
                      </button>
                    ))}
                  </div>

                  <h3 className="mt-7 font-display text-sm font-semibold text-white">
                    Can it get to us?
                  </h3>
                  <div className="mt-4 grid gap-2">
                    {DRIVABLE.map((s) => (
                      <button
                        key={s}
                        onClick={() => setDrivable(s)}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left text-[13px] transition-all",
                          drivable === s
                            ? "border-gold-400/70 bg-gold-400/[0.1] text-white"
                            : "border-white/[0.08] text-white/55 hover:border-white/20",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel className="p-5">
                  <h3 className="font-display text-sm font-semibold text-white">
                    Your details
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Name"
                      className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-gold-400/60 focus:outline-none"
                    />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Mobile number"
                      className="rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-gold-400/60 focus:outline-none"
                    />
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="When did it start? Any noises, smells, warning lights?"
                    className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-gold-400/60 focus:outline-none"
                  />
                </Panel>

                <Panel className="p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-400/70">
                    What we'll receive
                  </div>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-white/[0.07] bg-ink-950/80 p-4 font-mono text-[11px] leading-relaxed text-white/60">
                    {message}
                  </pre>
                </Panel>

                <Button
                  variant="wa"
                  className="w-full py-4"
                  target="_blank"
                  href={whatsappLink(message)}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2Zm5.8 14.06c-.24.68-1.4 1.3-1.93 1.35-.53.05-1.02.24-3.44-.72-2.92-1.15-4.75-4.19-4.89-4.38-.15-.2-1.16-1.55-1.16-2.95 0-1.4.73-2.09 1-2.38.26-.29.57-.36.77-.36l.55.01c.17 0 .41-.07.63.48.24.58.8 1.98.87 2.13.07.14.12.31.02.5-.1.2-.15.32-.29.5-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.24 1.61 2.01 1.11.99 2.04 1.3 2.33 1.44.29.15.46.12.63-.07.17-.2.73-.85.93-1.14.19-.29.39-.24.65-.15.27.1 1.67.79 1.96.93.29.15.48.22.55.34.07.13.07.75-.17 1.43Z" />
                  </svg>
                  Send the build request
                </Button>
                <p className="px-2 text-center text-[11.5px] leading-relaxed text-white/35">
                  Opens WhatsApp with everything pre-filled for {GARAGE.phoneDisplay}.
                  Nothing is stored on this site.
                </p>
              </>
            )}

            {/* ---------- nav ---------- */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className={cn(step === 0 && "pointer-events-none opacity-30")}
              >
                Back
              </Button>
              <Button
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                className={cn(step === 3 && "pointer-events-none opacity-30")}
              >
                {step === 0 ? "Add symptoms" : step === 1 ? "Preview spec" : "Finish"}
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- mobile sticky bar ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-ink-950/90 px-5 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[12px] font-semibold text-white">
              {modelLabel}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
              {picked.length} flagged · {inspected.length}/6 views
            </div>
          </div>
          <a
            href={whatsappLink(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-[#25d366] px-5 py-2.5 font-display text-[11.5px] font-bold uppercase tracking-[0.12em] text-white"
          >
            Send
          </a>
        </div>
      </div>
    </div>
  );
}
