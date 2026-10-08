import { useState } from "react";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { ArrowLeftIcon, CartIcon } from "./icons";
import { totalKits } from "../model/interpret";
import { listNames, purchasesFor } from "../model/insights";
import { formatUsd } from "../model/money";
import type { Scenario, SolveOutcome } from "../types";

type PlanProps = {
  scenario: Scenario;
  now: SolveOutcome | null;
  after: SolveOutcome | null;
};

function buySummary(scenario: Scenario, outcome: SolveOutcome): string {
  return listNames(
    purchasesFor(scenario, outcome).map(
      ({ item, packs }) =>
        `${packs} ${packs === 1 ? "pack" : "packs"} of ${item.buyPackSize} ${item.name}`,
    ),
  );
}

function BuyFirst({ scenario, outcome }: { scenario: Scenario; outcome: SolveOutcome }) {
  return (
    <section className="buy-first" aria-labelledby="buy-h">
      <span className="buy-icon" aria-hidden="true">
        <CartIcon />
      </span>
      <div>
        <h2 id="buy-h">
          Buy first: {buySummary(scenario, outcome)} · {formatUsd(outcome.costCents)}
        </h2>
        <p>
          Pack the extra kits after it arrives.{" "}
          {formatUsd(scenario.budgetCents - outcome.costCents)} of the budget stays unspent.
        </p>
      </div>
    </section>
  );
}

function Checklists({ scenario, outcome }: { scenario: Scenario; outcome: SolveOutcome }) {
  return (
    <div className="pack-grid">
      {scenario.kits.map((kit) => {
        const count = outcome.kits[kit.id] ?? 0;
        return (
          <article className="pack-card" key={kit.id} data-empty={count === 0 || undefined}>
            <header className="pack-head">
              <div>
                <h3>{kit.name}</h3>
                <p>
                  {kit.demand} requested · {kit.committedMin} promised
                </p>
              </div>
              <div className="pack-count">
                <strong>{count}</strong>
                <span>{count === 1 ? "kit" : "kits"} to pack</span>
              </div>
            </header>
            <ul className="pack-list">
              {scenario.items
                .filter((item) => (kit.recipe[item.id] ?? 0) > 0)
                .map((item) => (
                  <li key={item.id}>
                    <label>
                      <input type="checkbox" />
                      <span className="pack-item">{item.name}</span>
                      <span className="pack-per">{kit.recipe[item.id]} per kit</span>
                      <span className="pack-total">{(kit.recipe[item.id] ?? 0) * count}</span>
                    </label>
                  </li>
                ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

export function PackingView({
  scenario,
  now,
  after,
  canExport,
  onExportCsv,
  onBack,
}: PlanProps & {
  canExport: boolean;
  onExportCsv: () => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<"now" | "after">("now");
  const selected = (mode === "after" ? after : now) ?? now ?? after;
  const showing = selected === after ? "after" : "now";

  return (
    <div className="packing">
      <div className="packing-top">
        <Button variant="ghost" className="back" onClick={onBack}>
          <ArrowLeftIcon aria-hidden="true" />
          Back to plan
        </Button>
        <div className="packing-actions">
          <Button variant="secondary" disabled={!canExport} onClick={onExportCsv}>
            Export CSV
          </Button>
          <Button disabled={!canExport} onClick={() => window.print()}>
            Print sheets
          </Button>
        </div>
      </div>
      <div className="packing-title">
        <h1>Packing sheets</h1>
        {now || after ? (
          <Tabs value={showing} onValueChange={(value) => setMode(value as "now" | "after")}>
            <TabsList aria-label="Which plan to pack" className="pill-tabs">
              <TabsTrigger value="now" disabled={!now}>
                Pack now{now ? <b>{totalKits(now.kits)}</b> : null}
              </TabsTrigger>
              <TabsTrigger value="after" disabled={!after}>
                After restock{after ? <b>{totalKits(after.kits)}</b> : null}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}
      </div>
      {selected ? (
        <>
          {showing === "after" && selected.costCents > 0 ? (
            <BuyFirst scenario={scenario} outcome={selected} />
          ) : (
            <p className="hint packing-note">Uses only supplies already on hand.</p>
          )}
          <Checklists scenario={scenario} outcome={selected} />
        </>
      ) : (
        <p className="hint packing-note">
          No packing sheet yet. Add supplies and a kit type on the plan page.
        </p>
      )}
    </div>
  );
}

export function PrintSheets({ scenario, now, after }: PlanProps) {
  const grows = after && totalKits(after.kits) > (now ? totalKits(now.kits) : 0);
  return (
    <section className="print-only" aria-label="Printable packing sheets">
      <h1>KitBridge packing sheets</h1>
      <p>
        Printed {new Date().toLocaleString()}. Prices are planning estimates; this is not
        a purchase order.
      </p>
      {now ? (
        <>
          <h2>Pack now · {totalKits(now.kits)} kits</h2>
          <Checklists scenario={scenario} outcome={now} />
        </>
      ) : (
        <p>No packing plan from current stock.</p>
      )}
      {after && grows ? (
        <>
          <h2>After restock · {totalKits(after.kits)} kits</h2>
          <BuyFirst scenario={scenario} outcome={after} />
          <Checklists scenario={scenario} outcome={after} />
        </>
      ) : null}
    </section>
  );
}
