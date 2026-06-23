import { createFileRoute } from "@tanstack/react-router";
import { User, Server, Database, HardDrive, ArrowRight, Check, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  billed: boolean;
};

const hops: Hop[] = [
  { label: "User", icon: User, billed: false },
  { label: "App host", icon: Server, billed: true },
  { label: "Database", icon: Database, billed: true },
  { label: "Storage", icon: HardDrive, billed: true },
];

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
}: {
  title: string;
  hops: Hop[];
  totalLabel: string;
  totalTone: "bad" | "good";
  caption: string;
}) {
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

      <div className="flex flex-wrap items-center justify-between gap-y-4">
        {hops.map((hop, i) => {
          const Icon = hop.icon;
          return (
            <div key={hop.label} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-background">
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  {hop.billed && <CoinBadge />}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {hop.label}
                </span>
              </div>
              {i < hops.length - 1 && (
                <ArrowRight className="mx-2 h-4 w-4 shrink-0 text-muted-foreground sm:mx-4" />
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">
        {caption}
      </p>
    </div>
  );
}

const catalystHops: Hop[] = hops.map((h) => ({ ...h, billed: false }));

const rows = [
  { hop: "App host → User (egress)", typical: "$0.33/GB", catalyst: "$0" },
  { hop: "Database → App host", typical: "$0.33/GB", catalyst: "$0" },
  { hop: "Storage → App host", typical: "$0.33/GB", catalyst: "$0" },
  { hop: "Storage → User (direct)", typical: "$0.33/GB", catalyst: "$0" },
];

function Index() {
  return (
    <div className="min-h-screen bg-[#fcfbf8]">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-red-600">
            The hidden egress tax
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            One request. Three bills.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Every time data crosses a vendor boundary in a typical stack, you
            pay. Catalyst keeps it inside one network.
          </p>
        </header>

        <section className="space-y-4">
          <FlowDiagram
            title="Typical stack"
            hops={hops}
            totalLabel="≈ $0.99 / GB"
            totalTone="bad"
            caption="3 boundaries crossed · 3 egress bills"
          />
          <FlowDiagram
            title="Catalyst"
            hops={catalystHops}
            totalLabel="$0 / GB"
            totalTone="good"
            caption="Same path, one network, no egress fees"
          />
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
