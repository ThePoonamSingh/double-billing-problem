import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  User,
  Server,
  Database,
  HardDrive,
  ArrowRight,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  /** Cost for the sample 100 GB / month scenario, in USD. */
  cost: number;
  /** Short reason rendered inline next to the hop in side-by-side view. */
  reason: string;
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
    cost: 0,
    reason: "Ingress is free everywhere",
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
    cost: 12,
    reason: "Leaves Vercel network → user",
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
    cost: 9,
    reason: "Leaves DB network → app",
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
    cost: 12,
    reason: "Leaves S3 network → app",
  },
];

const catalystHops: Hop[] = hops.map((h) => ({
  ...h,
  billed: false,
  rate: "$0",
  cost: 0,
  reason:
    h.id === "user"
      ? "Ingress is free everywhere"
      : "Same network — no boundary crossed",
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

function HopRow({
  hop,
  idPrefix,
  active,
  passed,
  dim,
  onToggle,
  showCoin,
}: {
  hop: Hop;
  idPrefix: string;
  active: boolean;
  passed: boolean;
  dim: boolean;
  onToggle: () => void;
  showCoin: boolean;
}) {
  const Icon = hop.icon;
  return (
    <div
      className={
        "relative flex items-stretch gap-3 transition " +
        (dim ? "opacity-40" : "")
      }
    >
      {/* Icon column with vertical connector */}
      <div className="relative flex w-14 flex-col items-center">
        <Tooltip
          open={active ? true : undefined}
          onOpenChange={(o) => {
            if (!o && active) onToggle();
          }}
        >
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              aria-label={`${hop.label} hop`}
              className={
                "relative z-10 flex h-14 w-14 items-center justify-center rounded-xl border bg-background transition " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                (active
                  ? hop.billed
                    ? "scale-110 border-red-500 ring-2 ring-red-200"
                    : "scale-110 border-emerald-500 ring-2 ring-emerald-200"
                  : passed
                    ? hop.billed
                      ? "border-red-400"
                      : "border-emerald-400"
                    : "hover:scale-105")
              }
            >
              <Icon
                className={
                  "h-6 w-6 transition " +
                  (passed
                    ? hop.billed
                      ? "text-red-600"
                      : "text-emerald-600"
                    : "text-foreground")
                }
              />
              {hop.billed && (
                <span
                  aria-label="Billed hop"
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-sm ring-2 ring-background"
                >
                  $
                </span>
              )}
              {showCoin && hop.billed && (
                <span
                  key={`coin-${idPrefix}-${hop.id}`}
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow"
                  style={{
                    animation:
                      "coinDrop 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
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
                    (hop.billed ? "text-red-600" : "text-emerald-600")
                  }
                >
                  {hop.sample}
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Label / reason / per-hop cost */}
      <div className="flex flex-1 items-center justify-between gap-3 pb-1">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">
            {hop.label}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {hop.reason}
          </div>
        </div>
        <div
          className={
            "shrink-0 rounded-md px-2 py-1 font-mono text-xs transition " +
            (hop.billed
              ? passed
                ? "bg-red-500 text-white"
                : "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700")
          }
        >
          {hop.billed ? `+ $${hop.cost.toFixed(2)}` : "$0.00"}
        </div>
      </div>
    </div>
  );
}

function StackColumn({
  title,
  tone,
  hops,
  idPrefix,
  packetIdx,
  packetActive,
  activeId,
  setActiveId,
  runningTotal,
  totalLabel,
  caption,
  badge,
  focusIdx,
}: {
  title: string;
  tone: "bad" | "good";
  hops: Hop[];
  idPrefix: string;
  packetIdx: number;
  packetActive: boolean;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  runningTotal: number;
  totalLabel: string;
  caption: string;
  badge: string;
  focusIdx?: number | null;
}) {
  const isBad = tone === "bad";
  return (
    <div
      className={
        "flex flex-col rounded-xl border bg-card p-5 shadow-sm " +
        (isBad ? "border-red-200/70" : "border-emerald-200/70")
      }
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <span
          className={
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold " +
            (isBad
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700")
          }
        >
          {badge}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{caption}</p>

      <div className="relative flex-1">
        {/* Vertical pipeline line */}
        <div
          aria-hidden
          className="absolute left-7 top-7 bottom-7 w-px bg-border"
        />
        {/* Travelling packet */}
        {packetActive && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-7 z-20 h-3 w-3 -translate-x-1/2 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.25)]"
            style={{
              top: `${packetIdx * 76 + 28}px`,
              transition: "top 400ms cubic-bezier(0.65, 0, 0.35, 1)",
            }}
          />
        )}

        <TooltipProvider delayDuration={150}>
          <div className="space-y-5">
            {hops.map((hop, i) => {
              const key = `${idPrefix}-${hop.id}`;
              const active = activeId === key;
              const focused = focusIdx === i;
              const dim =
                (activeId !== null && !active) ||
                (focusIdx != null && !focused);
              const passed = packetActive && i <= packetIdx;
              const showCoin =
                packetActive && hop.billed && i <= packetIdx && i > 0;
              return (
                <div
                  key={key}
                  className={
                    "rounded-lg transition " +
                    (focused
                      ? "-mx-2 px-2 py-2 ring-2 ring-blue-400/60 bg-blue-50/40"
                      : "")
                  }
                  style={
                    focused
                      ? { animation: "focusPulse 1.6s ease-in-out infinite" }
                      : undefined
                  }
                >
                  <HopRow
                    hop={hop}
                    idPrefix={idPrefix}
                    active={active}
                    passed={passed}
                    dim={dim}
                    showCoin={showCoin}
                    onToggle={() => setActiveId(active ? null : key)}
                  />
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Running total */}
      <div
        className={
          "mt-5 rounded-lg border px-4 py-3 " +
          (isBad
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50")
        }
      >
        <div className="flex items-baseline justify-between">
          <span
            className={
              "text-xs font-semibold uppercase tracking-wide " +
              (isBad ? "text-red-700" : "text-emerald-700")
            }
          >
            Running cost
          </span>
          <span
            className={
              "font-mono text-2xl font-bold tabular-nums " +
              (isBad ? "text-red-700" : "text-emerald-700")
            }
          >
            ${runningTotal.toFixed(2)}
          </span>
        </div>
        <div
          className={
            "mt-0.5 text-[11px] " +
            (isBad ? "text-red-700/80" : "text-emerald-700/80")
          }
        >
          {totalLabel}
        </div>
      </div>
    </div>
  );
}

type TourStep = {
  title: string;
  typical: string;
  catalyst: string;
  delta: string;
};

const tourSteps: TourStep[] = [
  {
    title: "1. The request leaves the user",
    typical:
      "Bytes arrive at the app host. Inbound traffic is free — no meter ticks yet.",
    catalyst:
      "Same story. Ingress is free on every cloud, including Catalyst.",
    delta: "Both stacks: $0 so far.",
  },
  {
    title: "2. App host responds to the user",
    typical:
      "The response leaves Vercel's network to reach the browser. That crossing is metered as egress.",
    catalyst:
      "Catalyst's edge serves the response from inside the same network — nothing crosses a billable boundary.",
    delta: "Typical: +$12.00 · Catalyst: $0.",
  },
  {
    title: "3. App host reads from the database",
    typical:
      "Rows leave the managed DB's network to reach the app host — a separate vendor, separately billed.",
    catalyst:
      "DB and app share one network on Catalyst. No vendor boundary, no egress meter.",
    delta: "Typical: +$9.00 · Catalyst: $0.",
  },
  {
    title: "4. App host pulls an asset from storage",
    typical:
      "Every object pulled out of S3 is metered per GB, regardless of where it's going.",
    catalyst:
      "Storage lives next to compute. Reads stay inside the network — $0 to move them.",
    delta: "Typical: +$12.00 · Catalyst: $0.",
  },
];

function SideBySideFlow({
  onCoinDrop,
  onReset,
}: {
  onCoinDrop?: (index: number) => void;
  onReset?: () => void;
}) {
  const [packetIdx, setPacketIdx] = useState(0);
  const [packetActive, setPacketActive] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourActive = tourStep !== null;

  // Auto-loop animation (paused while tour is active).
  useEffect(() => {
    if (tourActive) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      if (cancelled) return;
      setPacketActive(true);
      setPacketIdx(0);
      onReset?.();

      for (let i = 1; i < hops.length; i++) {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setPacketIdx(i);
            if (hops[i].billed) onCoinDrop?.(i);
          }, 350 + (i - 1) * 500),
        );
      }

      const total = 350 + (hops.length - 1) * 500 + 800;
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setPacketActive(false);
          timers.push(setTimeout(run, 200));
        }, total),
      );
    };

    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [onCoinDrop, onReset, tourActive]);

  // Tour: drive packet from the step, drop coins for billed hops on entry.
  const lastTourStepRef = useRef<number | null>(null);
  useEffect(() => {
    if (tourStep === null) {
      lastTourStepRef.current = null;
      return;
    }
    setPacketActive(true);
    if (tourStep === 0) onReset?.();
    setPacketIdx(tourStep);
    // Drop coin only when stepping forward into a billed hop.
    const prev = lastTourStepRef.current;
    if (
      hops[tourStep]?.billed &&
      (prev === null || tourStep > prev)
    ) {
      onCoinDrop?.(tourStep);
    }
    // Stepping backwards: replay coin totals up to current step.
    if (prev !== null && tourStep < prev) {
      onReset?.();
      for (let i = 1; i <= tourStep; i++) {
        if (hops[i].billed) onCoinDrop?.(i);
      }
    }
    lastTourStepRef.current = tourStep;
  }, [tourStep, onCoinDrop, onReset]);

  const startTour = () => setTourStep(0);
  const exitTour = () => {
    setTourStep(null);
    lastTourStepRef.current = null;
  };
  const nextStep = () => {
    if (tourStep === null) return;
    if (tourStep < tourSteps.length - 1) setTourStep(tourStep + 1);
  };
  const prevStep = () => {
    if (tourStep === null) return;
    if (tourStep > 0) setTourStep(tourStep - 1);
  };
  const restartTour = () => {
    lastTourStepRef.current = null;
    onReset?.();
    setTourStep(0);
  };

  // Running totals follow the packet.
  const typicalTotal = hops
    .slice(0, packetActive ? packetIdx + 1 : 0)
    .reduce((sum, h) => sum + h.cost, 0);
  const catalystTotal = 0;
  const typicalFinal = hops.reduce((s, h) => s + h.cost, 0);

  const step = tourStep !== null ? tourSteps[tourStep] : null;
  const atEnd = tourStep === tourSteps.length - 1;

  return (
    <div>
      {/* Tour bar / scenario header */}
      <div className="mb-4 overflow-hidden rounded-lg border bg-muted/40">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Scenario
            </span>
            <span className="font-medium text-foreground">
              100 GB of user traffic / month
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.25)]" />
              Data packet
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                $
              </span>
              Billed boundary
            </span>
            {!tourActive ? (
              <button
                type="button"
                onClick={startTour}
                className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background px-3 py-1 text-[11px] font-semibold text-foreground transition hover:border-foreground/30 hover:bg-muted"
              >
                <Sparkles className="h-3 w-3" />
                Take the guided tour
              </button>
            ) : (
              <button
                type="button"
                onClick={exitTour}
                className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background px-3 py-1 text-[11px] font-semibold text-foreground transition hover:border-foreground/30 hover:bg-muted"
              >
                <Play className="h-3 w-3" />
                Resume autoplay
              </button>
            )}
          </div>
        </div>

        {/* Tour narration */}
        {tourActive && step && (
          <div className="border-t bg-background px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Step {tourStep! + 1} of {tourSteps.length}
                  </span>
                  <div className="flex gap-1">
                    {tourSteps.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTourStep(i)}
                        aria-label={`Go to step ${i + 1}`}
                        className={
                          "h-1.5 rounded-full transition " +
                          (i === tourStep
                            ? "w-6 bg-foreground"
                            : i < tourStep!
                              ? "w-3 bg-foreground/40"
                              : "w-3 bg-foreground/15 hover:bg-foreground/30")
                        }
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {step.title}
                </p>
                <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-md border border-red-200 bg-red-50/60 px-2.5 py-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-red-700">
                      Typical stack
                    </div>
                    <p className="text-red-900/80">{step.typical}</p>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Catalyst
                    </div>
                    <p className="text-emerald-900/80">{step.catalyst}</p>
                  </div>
                </div>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {step.delta}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={tourStep === 0}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-foreground transition hover:bg-muted disabled:opacity-30"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {atEnd ? (
                  <button
                    type="button"
                    onClick={restartTour}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-foreground px-3 text-xs font-semibold text-background transition hover:opacity-90"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Replay
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-foreground px-3 text-xs font-semibold text-background transition hover:opacity-90"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StackColumn
          title="Typical stack"
          tone="bad"
          hops={hops}
          idPrefix="typical"
          packetIdx={packetIdx}
          packetActive={packetActive}
          activeId={activeId}
          setActiveId={setActiveId}
          focusIdx={tourActive ? tourStep : null}
          runningTotal={typicalTotal}
          totalLabel={`Vercel + managed DB + S3 · final: $${typicalFinal.toFixed(2)}`}
          caption="3 vendor boundaries → 3 egress bills"
          badge="3 billed hops"
        />
        <StackColumn
          title="Catalyst"
          tone="good"
          hops={catalystHops}
          idPrefix="catalyst"
          packetIdx={packetIdx}
          packetActive={packetActive}
          activeId={activeId}
          setActiveId={setActiveId}
          focusIdx={tourActive ? tourStep : null}
          runningTotal={catalystTotal}
          totalLabel="One network · same packet, $0 egress"
          caption="Same path, one network, zero billed hops"
          badge="0 billed hops"
        />
      </div>

      <style>{`
        @keyframes coinDrop {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          30%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%, 40px) scale(0.8); }
        }
        @keyframes focusPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.0); }
          50%      { box-shadow: 0 0 0 6px rgba(59,130,246,0.18); }
        }
      `}</style>
    </div>
  );
}



type Scenario = {
  id: string;
  title: string;
  vendors: string[];
  problem: string;
  before: string;
  after: string;
};

const scenarios: Scenario[] = [
  {
    id: "saas",
    title: "A 3-vendor SaaS stack",
    vendors: ["Supabase", "AWS S3", "Azure"],
    problem:
      "A SaaS app built across three providers pays egress every time the stack talks to itself. The app queries Supabase, retrieves files from S3, and delivers responses via Azure. Each hop crosses a provider boundary. Pulling 100MB from the database and sending that same 100MB to the browser is billed twice, even if the data never left the app.",
    before: "3× egress fees",
    after: "$0 egress",
  },
  {
    id: "media",
    title: "Media platform startup",
    vendors: ["AWS S3", "GCP", "Cloudflare CDN"],
    problem:
      "A video platform built across three providers pays egress at every stage of the pipeline. Uploads pulled from S3, transcoded on GCP, then thumbnails pushed to Cloudflare. Each step crosses a provider boundary and starts a new meter. At 50,000 uploads/month, per-video cents become thousands of dollars in transfer fees alone.",
    before: "Cost scales with every upload",
    after: "$0 egress",
  },
  {
    id: "etl",
    title: "The ETL pipeline",
    vendors: ["S3 Data Lake", "Snowflake", "DigitalOcean"],
    problem:
      "A nightly ETL job moves gigabytes from S3 to Snowflake to a dashboard server. Each sync crosses egress boundaries, starting a meter. The data belongs to the team running the pipeline — they just keep paying to move it around their own stack. By year end, the egress bill exceeded the actual compute cost.",
    before: "Daily egress × 365",
    after: "$0 egress",
  },
  {
    id: "ecommerce",
    title: "eCommerce backend",
    vendors: ["Firebase", "MongoDB Atlas", "Heroku"],
    problem:
      "A single customer page load crosses three provider boundaries. Auth check to Firebase, product fetch from Atlas, inventory sync from Heroku. Three round trips, three egress meters for one page. Multiply that by millions of page loads per month, and the egress bill grows significantly.",
    before: "Grows with every visitor",
    after: "$0 egress",
  },
];

function RealStackScenarios() {
  const [activeId, setActiveId] = useState(scenarios[0].id);
  const active = scenarios.find((s) => s.id === activeId)!;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          See how this plays out in real stacks
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a scenario to see the stack, the problem, and what changes with Catalyst.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {scenarios.map((s, i) => {
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(s.id)}
              className={
                "rounded-full border px-4 py-2 text-sm transition-colors " +
                (isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-foreground/30")
              }
            >
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-xs">
                {i + 1}
              </span>
              {s.title}
            </button>
          );
        })}
      </div>

      <div key={active.id} className="mt-6 animate-fade-in space-y-6">
        {/* Problem statement */}
        <div className="rounded-xl border border-border bg-background/40 p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            The problem
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {active.problem}
          </p>
        </div>

        {/* Visual hop diagrams */}
        <div className="grid gap-4 lg:grid-cols-2">
          <HopDiagram vendors={active.vendors} mode="before" summary={active.before} />
          <HopDiagram vendors={active.vendors} mode="after" summary={active.after} />
        </div>
      </div>
    </div>
  );
}

function HopDiagram({
  vendors,
  mode,
  summary,
}: {
  vendors: string[];
  mode: "before" | "after";
  summary: string;
}) {
  const isBefore = mode === "before";
  const accent = isBefore
    ? {
        ring: "border-red-500/40 bg-red-500/[0.04]",
        chip: "border-red-500/30 bg-red-500/10 text-red-300",
        label: "text-red-400",
        node: "border-red-500/40 bg-background",
        line: "bg-gradient-to-r from-red-500/20 via-red-500/60 to-red-500/20",
        dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]",
      }
    : {
        ring: "border-emerald-500/40 bg-emerald-500/[0.04]",
        chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        label: "text-emerald-400",
        node: "border-emerald-500/40 bg-background",
        line: "bg-gradient-to-r from-emerald-500/20 via-emerald-500/60 to-emerald-500/20",
        dot: "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]",
      };

  return (
    <div className={`relative rounded-xl border-2 border-dashed p-5 ${accent.ring}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${accent.label}`}>
          {!isBefore && <Sparkles className="h-3.5 w-3.5" />}
          {isBefore ? "Before Catalyst" : "After Catalyst"}
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${accent.chip}`}>
          {summary}
        </span>
      </div>

      {/* For "After": wrap the whole network in one unified boundary label */}
      {!isBefore && (
        <div className="mb-3 text-center text-[10px] font-medium uppercase tracking-widest text-emerald-400/80">
          ── one network · no boundaries ──
        </div>
      )}

      {/* Vendor flow */}
      <div className="flex items-stretch justify-between gap-1">
        {vendors.map((v, i) => (
          <span key={v} className="flex flex-1 items-center gap-1">
            {/* Vendor node, optionally wrapped in its own boundary box for "before" */}
            {isBefore ? (
              <span className="flex flex-1 flex-col items-center rounded-lg border border-dashed border-red-500/40 bg-red-500/[0.03] p-2">
                <span className="text-[9px] font-medium uppercase tracking-wider text-red-400/70">
                  boundary
                </span>
                <span className={`mt-1 w-full truncate rounded-md border px-2 py-1.5 text-center text-xs font-semibold ${accent.node}`}>
                  {v}
                </span>
              </span>
            ) : (
              <span className={`flex-1 truncate rounded-md border px-2 py-2 text-center text-xs font-semibold ${accent.node}`}>
                {v}
              </span>
            )}

            {/* Connector with animated packet + cost badge */}
            {i < vendors.length - 1 && (
              <span className="relative flex shrink-0 flex-col items-center gap-1 px-1">
                <span className={`relative h-[2px] w-10 overflow-hidden rounded-full ${accent.line}`}>
                  <span
                    className={`absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${accent.dot}`}
                    style={{
                      animation: `hop-packet 1.8s linear infinite`,
                      animationDelay: `${i * 0.4}s`,
                    }}
                  />
                </span>
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none ${accent.chip}`}
                >
                  {isBefore ? "$ egress" : "$0"}
                </span>
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 text-center text-[11px] text-muted-foreground">
        {isBefore
          ? `${vendors.length - 1} vendor boundaries crossed · ${vendors.length - 1} meters running`
          : "Data moves freely inside Catalyst — nothing to meter"}
      </div>
    </div>
  );
}


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
            In a typical user request, data crosses at least three vendor
            boundaries — app, database, storage — and each one charges egress
            on the way out.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tip: hover or tap any icon below to see what happens at that hop.
          </p>
        </header>

        <section>
          <SideBySideFlow
            onCoinDrop={handleCoinDrop}
            onReset={handleReset}
          />
        </section>

        <section className="mt-16">
          <RealStackScenarios />
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
