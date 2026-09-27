import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./ui/table";
import { Disclosure } from "./Disclosure";
import { useState } from "react";
import { BASELINE_RULE } from "../constants";
import { greedyLeftover } from "../model/baseline";
import { formatUsd } from "../model/money";
import { totalKits } from "../model/interpret";
import type { Scenario, SolveOutcome } from "../types";

type ResultsProps = {
  scenario: Scenario;
  current: SolveOutcome | null;
  restock: SolveOutcome | null;
  stale: boolean;
};

function StatusNote({ outcome }: { outcome: SolveOutcome | null }) {
  if (!outcome) return null;
  return (
    <Disclosure
      className="solver-details"
      title={<> Calculation details · {outcome.overallStatus} </>}
    >
      <p>
        {outcome.message} Phase 1:{" "}
        {outcome.phase1.highsStatus ?? outcome.phase1.status}; phase 2:{" "}
        {outcome.phase2?.highsStatus ?? "not completed"}. {outcome.elapsedMs}{" "}
        ms.
      </p>
    </Disclosure>
  );
}

export function PlanSummary({ current, restock, scenario }: ResultsProps) {
  return (
    <section
      className="plan-summary"
      aria-label="Plan overview"
      aria-live="polite"
    >
      <div>
        <span>Pack now</span>
        <strong>
          {current?.overallStatus === "Optimal" ? totalKits(current.kits) : "—"}
        </strong>
        <small>complete kits</small>
      </div>
      <span className="plan-arrow" aria-hidden="true">
        →
      </span>
      <div>
        <span>After restock</span>
        <strong>
          {restock?.overallStatus === "Optimal" ? totalKits(restock.kits) : "—"}
        </strong>
        <small>
          of {scenario.kits.reduce((sum, kit) => sum + kit.demand, 0)} requested
        </small>
      </div>
      <div className="cost-line">
        <span>Purchase cost</span>
        <b>
          {restock?.overallStatus === "Optimal"
            ? formatUsd(restock.costCents)
            : "—"}
        </b>
      </div>
    </section>
  );
}

function CommitmentGap({ scenario }: { scenario: Scenario }) {
  const gaps = scenario.items
    .map((item) => ({
      item,
      needed: scenario.kits.reduce(
        (n, k) => n + k.committedMin * (k.recipe[item.id] ?? 0),
        0,
      ),
    }))
    .filter(({ item, needed }) => needed > item.stock);
  return (
    <div className="banner warn">
      <strong>Not enough stock for your commitments.</strong>
      <ul>
        {gaps.map(({ item, needed }) => (
          <li key={item.id}>
            {item.name}: need {needed}, have {item.stock} — short{" "}
            {needed - item.stock}.
          </li>
        ))}
      </ul>
      <p>
        Check the restock plan, add supplies, or revise a commitment yourself.
        The planner keeps your promised numbers unchanged.
      </p>
    </div>
  );
}

function PackList({
  scenario,
  outcome,
}: {
  scenario: Scenario;
  outcome: SolveOutcome;
}) {
  return (
    <div className="pack-grid">
      {scenario.kits.map((kit) => (
        <Card className="pack-sheet" key={kit.id}>
          <div className="pack-title">
            <h3>{kit.name}</h3>
            <strong>
              {outcome.kits[kit.id] ?? 0}
              <small>kits</small>
            </strong>
          </div>
          <Table aria-label={`${kit.name} packing quantities`}>
            <TableHeader>
              <TableRow>
                <TableHead>Supply</TableHead>
                <TableHead>Per kit</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenario.items
                .filter((item) => (kit.recipe[item.id] ?? 0) > 0)
                .map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{kit.recipe[item.id]}</TableCell>
                    <TableCell className="result-number">
                      {(kit.recipe[item.id] ?? 0) * (outcome.kits[kit.id] ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      ))}
    </div>
  );
}

export function Results({
  scenario,
  current,
  restock,
  stale,
  view,
  onPacking,
  onUseTemplate,
}: ResultsProps & {
  view: "summary" | "packing";
  onPacking: () => void;
  onUseTemplate: () => void;
}) {
  const [packMode, setPackMode] = useState<"current" | "restock">("current");
  const now = current?.overallStatus === "Optimal" ? current : null;
  const after = restock?.overallStatus === "Optimal" ? restock : null;
  const baseline = now ? greedyLeftover(scenario) : null;
  const selected = packMode === "current" ? now : after;
  const purchases = after
    ? scenario.items.filter((item) => (after.buys[item.id] ?? 0) > 0)
    : [];
  return (
    <div className={`results-stack ${view}`}>
      <Card className="panel recommendation" hidden={view !== "summary"}>
        <h2>Your plan</h2>
        {now ||
        after ||
        (!current &&
          !restock &&
          scenario.items.length > 0 &&
          scenario.kits.length > 0) ? (
          <PlanSummary
            scenario={scenario}
            current={current}
            restock={restock}
            stale={stale}
          />
        ) : null}
        {stale ? (
          <p className="hint plan-status">Inputs changed. Update your plan.</p>
        ) : !current && !restock ? (
          <div className="empty-state">
            <p>
              {scenario.items.length && scenario.kits.length
                ? "Update your plan to calculate quantities and cost."
                : "Add supplies and kit recipes, or use a template."}
            </p>
            {(!scenario.items.length || !scenario.kits.length) && (
              <Button variant="secondary" onClick={onUseTemplate}>
                Use template
              </Button>
            )}
          </div>
        ) : null}
        {current?.overallStatus === "Infeasible" ? (
          <CommitmentGap scenario={scenario} />
        ) : null}
        {current &&
        !["Optimal", "Infeasible"].includes(current.overallStatus) ? (
          <div className="banner warn" role="alert">
            Current plan: {current.overallStatus}. No verified plan is
            available. {current.message}
          </div>
        ) : null}
        {restock && restock.overallStatus !== "Optimal" ? (
          <div className="banner warn" role="alert">
            Restock plan: {restock.overallStatus}.{" "}
            {restock.overallStatus === "Infeasible"
              ? "This budget and the available purchase packs cannot cover your commitments. Review prices, pack sizes and your budget."
              : restock.message}
          </div>
        ) : null}
        {after ? (
          <>
            {purchases.length > 0 ? (
              <p className="hint">
                Receive purchases before packing extra kits.
              </p>
            ) : null}
            <Disclosure title="Shopping list" className="purchase-list">
              {purchases.length ? (
                purchases.map((item) => (
                  <div className="purchase-row" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {after.buys[item.id]} pack(s) × {item.buyPackSize} units
                        = {after.buys[item.id] * item.buyPackSize} units
                      </small>
                    </div>
                    <strong>
                      {formatUsd(after.buys[item.id] * item.buyPackPriceCents)}
                    </strong>
                  </div>
                ))
              ) : (
                <p>No purchase is needed for this result.</p>
              )}
              <div className="purchase-total">
                <span>Remaining budget</span>
                <strong>
                  {formatUsd(scenario.budgetCents - after.costCents)}
                </strong>
              </div>
            </Disclosure>
          </>
        ) : null}
      </Card>
      {view === "packing" && !now && !after ? (
        <Card className="panel packing-empty">
          <h2>No packing list yet</h2>
          <p>
            {stale
              ? "Your inputs changed. Update the plan before packing."
              : "Calculate a verified plan from your supplies first."}
          </p>
          <Button onClick={onPacking}>Back to editor</Button>
        </Card>
      ) : null}
      {view === "packing" && (now || after) ? (
        <div className="packing-content">
          <Tabs
            value={packMode}
            onValueChange={(value) =>
              setPackMode(value as "current" | "restock")
            }
          >
            <TabsList aria-label="Packing list scenario">
              <TabsTrigger value="current" disabled={!now}>
                Pack now
              </TabsTrigger>
              <TabsTrigger value="restock" disabled={!after}>
                After supplies arrive
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="packing-note">
            {packMode === "restock"
              ? "Proposed quantities. Pack only after receiving the purchased supplies."
              : "Use only supplies already on hand."}
          </p>
          {selected ? (
            <PackList scenario={scenario} outcome={selected} />
          ) : (
            <p>Choose an available packing list above.</p>
          )}
        </div>
      ) : null}
      <div hidden={view !== "packing"} className="plan-details">
        {now || after ? (
          <Disclosure title="Allocation by group" className="panel">
            <div className="table-wrap">
              <Table>
                <TableCaption className="visually-hidden">
                  Current and proposed kit counts
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kit type</TableHead>
                    <TableHead>Need</TableHead>
                    <TableHead>Promised</TableHead>
                    <TableHead>Now</TableHead>
                    <TableHead>After restock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenario.kits.map((kit) => (
                    <TableRow key={kit.id}>
                      <TableHead scope="row">{kit.name}</TableHead>
                      <TableCell>{kit.demand}</TableCell>
                      <TableCell>{kit.committedMin}</TableCell>
                      <TableCell>{now?.kits[kit.id] ?? "—"}</TableCell>
                      <TableCell className="result-number">
                        {after?.kits[kit.id] ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="hint">Your minimum commitments stay protected.</p>
          </Disclosure>
        ) : null}
        {now ? (
          <Disclosure className="panel" title={<> What’s still missing? </>}>
            <p className="hint">
              Extra units needed to make one more kit from the current plan’s
              leftovers. Reallocating existing kits may change these gaps.
            </p>
            <div className="shortage-list">
              {scenario.kits.map((kit) => {
                const unmet = now.unmet[kit.id] ?? 0;
                const missing = scenario.items
                  .map((item) => ({
                    item,
                    qty: Math.max(
                      0,
                      (kit.recipe[item.id] ?? 0) -
                        (now.remainder[item.id] ?? 0),
                    ),
                  }))
                  .filter((x) => x.qty > 0);
                return (
                  <div key={kit.id}>
                    <strong>
                      {kit.name}
                      <span>{unmet} still needed</span>
                    </strong>
                    <p>
                      {unmet === 0
                        ? "This group’s full demand is covered."
                        : missing.length
                          ? `For one more kit: ${missing.map((x) => `${x.qty} × ${x.item.name}`).join(", ")}.`
                          : "Review the allocation and commitments for this group."}
                    </p>
                  </div>
                );
              })}
            </div>
          </Disclosure>
        ) : null}
        {now && baseline ? (
          <Disclosure
            className="panel audit-details"
            title={<> Calculation & comparison </>}
          >
            <StatusNote outcome={current} />
            <StatusNote outcome={restock} />
            <h3>Current inventory reconciliation</h3>
            <div className="table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>On hand</TableHead>
                    <TableHead>Used now</TableHead>
                    <TableHead>Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenario.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableHead scope="row">{item.name}</TableHead>
                      <TableCell>{item.stock}</TableCell>
                      <TableCell>{now.consumption[item.id]}</TableCell>
                      <TableCell>{now.remainder[item.id]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <h3>Same-input comparison</h3>
            <p>{BASELINE_RULE}</p>
            <p>
              Simple rule:{" "}
              <strong>
                {baseline.feasibleMins ? baseline.totalKits : "not feasible"}
              </strong>{" "}
              kits. Optimized current plan:{" "}
              <strong>{totalKits(now.kits)}</strong> kits.
            </p>
            <p className="hint">
              Both plans use the same stock, recipes, demand and commitments,
              without purchases.
            </p>
          </Disclosure>
        ) : null}
      </div>
    </div>
  );
}

export function PrintSheets({
  scenario,
  current,
  restock,
}: Omit<ResultsProps, "stale">) {
  return (
    <section
      className="print-only wrap"
      aria-label="Printable pack and shop sheets"
    >
      <h1>KitBridge · packing & purchase lists</h1>
      <p>
        Generated {new Date().toLocaleString()}.{" "}
        {scenario.label ?? "User-entered planning estimates."} Not a purchase
        order.
      </p>
      {current?.overallStatus === "Optimal" ? (
        <>
          <h2>Pack now · {totalKits(current.kits)} kits</h2>
          <p>Current inventory only.</p>
          <PackList scenario={scenario} outcome={current} />
        </>
      ) : (
        <p>No verified current-stock packing plan.</p>
      )}
      {restock?.overallStatus === "Optimal" ? (
        <>
          <h2>Proposed purchase · {formatUsd(restock.costCents)}</h2>
          <p>
            Prices are planning estimates. These supplies are not yet received.
          </p>
          <ul>
            {scenario.items
              .filter((item) => (restock.buys[item.id] ?? 0) > 0)
              .map((item) => (
                <li key={item.id}>
                  {item.name}: {restock.buys[item.id]} pack(s) ×{" "}
                  {item.buyPackSize} ={" "}
                  {restock.buys[item.id] * item.buyPackSize} units;{" "}
                  {formatUsd(restock.buys[item.id] * item.buyPackPriceCents)}.
                </li>
              ))}
          </ul>
          <h2>After supplies arrive · {totalKits(restock.kits)} kits</h2>
          <PackList scenario={scenario} outcome={restock} />
        </>
      ) : null}
    </section>
  );
}
