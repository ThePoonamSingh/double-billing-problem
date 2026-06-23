import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  User,
  Server,
  Database,
  HardDrive,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The hidden egress tax — Catalyst" },
      {
        name: "description",
        content:
          "See how a typical request gets billed three times for egress, and why Catalyst charges $0.",
      },
    ],
  }),
  component: Index,
});

type Hop = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  billed: boolean;
  rate: string;
  tip: string;
  why: string;
  sample: string;
};

const hops: Hop[] = [
  {
    id: "user",
    label: "User",
    icon: User,
    billed: false,
    rate: "free",
    tip: "The browser sends a request. No egress cost here — ingress is free.",
    why: "No coin drops — inbound bytes are free on every major cloud. You only pay when data leaves a vendor's network.",
    sample: "100 GB in × $0.00 = $0.00",
  },
  {
    id: "app",
    label: "App host",
    icon: Server,
    billed: true,
    rate: "$0.12 / GB",
    tip: "Your app server (e.g. Vercel) responds. Bytes leaving its network are billed as egress.",
    why: "The response leaves the app host's network to reach the user — that crossing is metered as egress.",
    sample: "100 GB out × $0.12 = $12.00",
  },
  {
    id: "db",
    label: "Database",
    icon: Database,
    billed: true,
    rate: "$0.09 / GB",
    tip: "Managed DB ships rows to the app host. That cross-network read is billed.",
    why: "Rows leave the managed DB's network to reach the app host — a separate vendor boundary, separately billed.",
    sample: "100 GB read × $0.09 = $9.00",
  },
  {
    id: "storage",
    label: "Storage",
    icon: HardDrive,
    billed: true,
    rate: "$0.12 / GB",
    tip: "S3-style storage streams the asset out. Egress is metered per GB.",
    why: "Assets leave the object store's network on every download — metered per GB regardless of destination.",
    sample: "100 GB out × $0.12 = $12.00",
  },
];

const catalystHops: Hop[] = hops.map((h) => ({
  ...h,
  billed: false,
  rate: "$0",
  tip:
    h.id === "user"
      ? h.tip
      : "Runs inside Catalyst's network — bytes never cross a billable boundary.",
  why:
    h.id === "user"
      ? h.why
      : "App, DB, and storage share one network. No vendor boundary is crossed, so no egress meter ticks.",
  sample: "100 GB × $0.00 = $0.00",
}));

function CoinBadge() {
  return (
    <span
      aria-label="Billed hop"
      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-sm ring-2 ring-background"
    >
      $
    </span>
  );
}

function FlowDiagram({
  title,
  hops,
  totalLabel,
  totalTone,
  caption,
  idPrefix,
  animate = false,
  onCoinDrop,
  onReset,
}: {
  title: string;
  hops: Hop[];
  totalLabel: string;
  totalTone: "bad" | "good";
  caption: string;
  idPrefix: string;
  animate?: boolean;
  onCoinDrop?: (index: number) => void;
  onReset?: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const hopRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [positions, setPositions] = useState<number[]>([]);
  const [packetIdx, setPacketIdx] = useState<number>(0);
  const [droppedCoins, setDroppedCoins] = useState<Set<number>>(new Set());

  // Measure hop x-centers relative to the row.
  useLayoutEffect(() => {
    if (!animate) return;
    const measure = () => {
      const row = rowRef.current;
      if (!row) return;
      const rowBox = row.getBoundingClientRect();
      const xs = hopRefs.current.map((el) => {
        if (!el) return 0;
        const b = el.getBoundingClientRect();
        return b.left - rowBox.left + b.width / 2;
      });
      setPositions(xs);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (rowRef.current) ro.observe(rowRef.current);
    return () => ro.disconnect();
  }, [animate, hops.length]);

  // Drive the journey loop.
  useEffect(() => {
    if (!animate || positions.length === 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setPacketIdx((prev) => {
        const next = prev + 1;
        if (next >= hops.length) {
          // Reset after a pause.
          timer = setTimeout(() => {
            setDroppedCoins(new Set());
            setPacketIdx(0);
            onReset?.();
          }, 1800);
          return prev;
        }
        if (hops[next].billed) {
          setDroppedCoins((d) => {
            const n = new Set(d);
            n.add(next);
            return n;
          });
          onCoinDrop?.(next);
        }
        timer = setTimeout(tick, 1100);
        return next;
      });
    };
    timer = setTimeout(tick, 900);
    return () => clearTimeout(timer);
  }, [animate, positions.length, hops, onCoinDrop, onReset]);

  const packetX = positions[packetIdx] ?? 0;
  const packetReady = animate && positions.length > 0;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <span
          className={
            "rounded-full px-3 py-1 text-sm font-bold " +
            (totalTone === "bad"
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700")
          }
        >
          {totalLabel}
        </span>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.25)]" />
          Request packet
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            $
          </span>
          Billed egress hop
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm border bg-background" />
          Free hop (no egress)
        </span>
      </div>

      <TooltipProvider delayDuration={150}>
        <div
          ref={rowRef}
          className="relative flex flex-wrap items-center justify-between gap-y-4"
        >
          {/* Packet */}
          {packetReady && (
            <div
              aria-hidden
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${packetX}px`,
                top: "28px",
                transition: "left 900ms cubic-bezier(0.65, 0, 0.35, 1)",
              }}
            >
              <div className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.25)]" />
            </div>
          )}

          {hops.map((hop, i) => {
            const Icon = hop.icon;
            const key = `${idPrefix}-${hop.id}`;
            const isActive = activeId === key;
            const isDim = activeId !== null && !isActive;
            const coinDropped = droppedCoins.has(i);
            return (
              <div key={key} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <Tooltip
                    open={isActive ? true : undefined}
                    onOpenChange={(o) => {
                      if (!o && isActive) setActiveId(null);
                    }}
                  >
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        ref={(el) => {
                          hopRefs.current[i] = el;
                        }}
                        onClick={() => setActiveId(isActive ? null : key)}
                        className={
                          "relative rounded-xl outline-none transition " +
                          "focus-visible:ring-2 focus-visible:ring-ring " +
                          (isActive
                            ? "scale-110"
                            : isDim
                              ? "opacity-40"
                              : "hover:scale-105")
                        }
                        aria-label={`${hop.label} hop`}
                      >
                        <div
                          className={
                            "flex h-14 w-14 items-center justify-center rounded-xl border bg-background transition " +
                            (isActive
                              ? hop.billed
                                ? "border-red-500 ring-2 ring-red-200"
                                : "border-emerald-500 ring-2 ring-emerald-200"
                              : "")
                          }
                        >
                          <Icon className="h-6 w-6 text-foreground" />
                        </div>
                        {hop.billed && <CoinBadge />}
                        {/* Dropped coin animation */}
                        {animate && hop.billed && coinDropped && (
                          <span
                            key={`coin-${droppedCoins.size}-${i}`}
                            aria-hidden
                            className="pointer-events-none absolute left-1/2 top-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow"
                            style={{
                              animation:
                                "coinDrop 900ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
                            }}
                          >
                            $
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] p-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground">
                          {hop.label} ·{" "}
                          <span
                            className={
                              hop.billed ? "text-red-600" : "text-emerald-600"
                            }
                          >
                            {hop.billed ? `egress ${hop.rate}` : hop.rate}
                          </span>
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {hop.why}
                        </p>
                        <div className="rounded border border-border bg-muted/50 px-2 py-1.5">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Sample · 100 GB / month
                          </p>
                          <p
                            className={
                              "font-mono text-xs " +
                              (hop.billed
                                ? "text-red-600"
                                : "text-emerald-600")
                            }
                          >
                            {hop.sample}
                          </p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className={
                        "text-xs font-medium transition " +
                        (isDim
                          ? "text-muted-foreground/40"
                          : "text-foreground")
                      }
                    >
                      {hop.label}
                    </span>
                    <span
                      className={
                        "text-[10px] font-mono transition " +
                        (isDim
                          ? "text-muted-foreground/40"
                          : hop.billed
                            ? "text-red-600"
                            : "text-emerald-600")
                      }
                    >
                      {hop.billed ? `egress · ${hop.rate}` : hop.rate}
                    </span>
                  </div>
                </div>
                {i < hops.length - 1 && (
                  <ArrowRight className="mx-2 h-4 w-4 shrink-0 text-muted-foreground sm:mx-4" />
                )}
              </div>
            );
          })}
        </div>
      </TooltipProvider>

      <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">
        {caption}
      </p>

      {animate && (
        <style>{`
          @keyframes coinDrop {
            0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
            30%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
            100% { opacity: 0; transform: translate(-50%, 40px) scale(0.8); }
          }
        `}</style>
      )}
    </div>
  );
}


function SampleJourney() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sample request
        </h3>
        <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs">
          GET /profile/42
        </span>
      </div>

      <ol className="space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs">
            1
          </span>
          <div>
            <span className="font-medium">User → App host</span>
            <span className="ml-2 text-muted-foreground">
              Browser requests profile page (2 KB in, free)
            </span>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-mono text-xs text-red-700">
            2
          </span>
          <div>
            <span className="font-medium">App host → Database</span>
            <span className="ml-2 text-muted-foreground">
              Query user row, 8 KB returned
            </span>
            <span className="ml-2 font-mono text-xs text-red-700">
              + egress
            </span>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-mono text-xs text-red-700">
            3
          </span>
          <div>
            <span className="font-medium">App host → Storage</span>
            <span className="ml-2 text-muted-foreground">
              Fetch avatar.jpg, 240 KB
            </span>
            <span className="ml-2 font-mono text-xs text-red-700">
              + egress
            </span>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-mono text-xs text-red-700">
            4
          </span>
          <div>
            <span className="font-medium">App host → User</span>
            <span className="ml-2 text-muted-foreground">
              Rendered HTML + avatar, 260 KB out
            </span>
            <span className="ml-2 font-mono text-xs text-red-700">
              + egress
            </span>
          </div>
        </li>
      </ol>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
        <div className="rounded-lg bg-red-50 px-3 py-2">
          <div className="text-xs text-red-700">Typical stack</div>
          <div className="font-mono font-semibold text-red-700">
            ~$0.000165 / request
          </div>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2">
          <div className="text-xs text-emerald-700">Catalyst</div>
          <div className="font-mono font-semibold text-emerald-700">
            $0.00 / request
          </div>
        </div>
      </div>
    </div>
  );
}

// Cost per request: 508 KB out * $0.33 / GB = ~$0.000165
const KB_PER_REQ = 508;
const TYPICAL_RATE_PER_GB = 0.33;
const COST_PER_REQ =
  (KB_PER_REQ / 1_000_000) * TYPICAL_RATE_PER_GB;

function BreakEvenCalculator() {
  const [millions, setMillions] = useState<number>(1);
  const requests = millions * 1_000_000;
  const typicalCost = requests * COST_PER_REQ;
  const gb = (requests * KB_PER_REQ) / 1_000_000;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Egress savings calculator
        </h3>
        <span className="text-xs text-muted-foreground">
          assuming 508 KB / request
        </span>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Drag to see what egress costs at your scale.
      </p>

      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-medium">Monthly requests</span>
          <span className="font-mono text-sm">
            {requests.toLocaleString()}
          </span>
        </div>
        <Slider
          value={[millions]}
          min={0.1}
          max={100}
          step={0.1}
          onValueChange={(v) => setMillions(v[0])}
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>100K</span>
          <span>100M</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-red-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-red-700">
            Typical stack
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-red-700">
            ${typicalCost.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-red-700/80">
            {gb.toFixed(1)} GB egress / mo
          </div>
        </div>
        <div className="rounded-lg border bg-emerald-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Catalyst
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">
            $0.00
          </div>
          <div className="mt-1 text-xs text-emerald-700/80">
            same traffic, $0 egress
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-sm">
        At this volume you save{" "}
        <span className="font-mono font-semibold">
          ${typicalCost.toFixed(2)}
        </span>{" "}
        / month — or{" "}
        <span className="font-mono font-semibold">
          ${(typicalCost * 12).toFixed(2)}
        </span>{" "}
        / year.
      </p>
    </div>
  );
}

const rows = [
  { hop: "App host → User (egress)", typical: "$0.33/GB", catalyst: "$0" },
  { hop: "Database → App host", typical: "$0.33/GB", catalyst: "$0" },
  { hop: "Storage → App host", typical: "$0.33/GB", catalyst: "$0" },
  { hop: "Storage → User (direct)", typical: "$0.33/GB", catalyst: "$0" },
];

function Index() {
  const billedTotal = hops.filter((h) => h.billed).length;
  const [coinsDropped, setCoinsDropped] = useState(0);
  const handleCoinDrop = useCallback(() => {
    setCoinsDropped((c) => Math.min(c + 1, billedTotal));
  }, [billedTotal]);
  const handleReset = useCallback(() => setCoinsDropped(0), []);

  const strikeProgress = coinsDropped / billedTotal;
  const revealed = coinsDropped >= billedTotal;

  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-red-600">
            The hidden egress tax
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            <span className="relative inline-block">
              <span
                className={
                  "transition-colors duration-500 " +
                  (revealed ? "text-muted-foreground/60" : "text-foreground")
                }
              >
                Why pay every time your data moves?
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-[width] duration-700 ease-out"
                style={{ width: `${strikeProgress * 100}%` }}
              />
            </span>
            <span
              className={
                "mt-2 block text-foreground transition-all duration-500 " +
                (revealed
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0")
              }
            >
              With Catalyst, you don't.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            One user request crosses three vendor boundaries — app, database,
            storage — and each one charges egress on the way out.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tip: hover or tap any icon below to see what happens at that hop.
          </p>
        </header>

        <section className="space-y-4">
          <FlowDiagram
            title="Typical stack"
            hops={hops}
            totalLabel="≈ $0.99 / GB"
            totalTone="bad"
            caption="3 boundaries crossed · 3 egress bills"
            idPrefix="typical"
            animate
            onCoinDrop={handleCoinDrop}
            onReset={handleReset}
          />
          <FlowDiagram
            title="Catalyst"
            hops={catalystHops}
            totalLabel="$0 / GB"
            totalTone="good"
            caption="Same path, one network, no egress fees"
            idPrefix="catalyst"
          />
        </section>

        <section className="mt-8">
          <SampleJourney />
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Side by side</h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Data hop
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Typical stack
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Catalyst
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.hop} className="border-t">
                    <td className="px-4 py-3 font-medium">{r.hop}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-red-700">
                        <X className="h-4 w-4" /> {r.typical}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-4 w-4" /> {r.catalyst}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">What you'd save</h2>
          <BreakEvenCalculator />
        </section>

        <section className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="why">
              <AccordionTrigger>How does this add up?</AccordionTrigger>
              <AccordionContent>
                In a typical stack — say Vercel + a managed database + S3 —
                each vendor meters bytes leaving its network. A single
                user-facing request can trigger a database read (egress #1),
                a storage read (egress #2), and the response back to the
                user (egress #3). At roughly $0.09–$0.12/GB per hop, a
                data-heavy app racks up ~$0.33/GB just for moving its own
                bytes around.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="catalyst">
              <AccordionTrigger>Why does Catalyst skip it?</AccordionTrigger>
              <AccordionContent>
                Compute, database, and storage run inside one network on
                Catalyst. Bytes never cross a billable vendor boundary, so
                there is nothing to meter. You pay for the resources you
                use, not for the privilege of moving data between them.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
