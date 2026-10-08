import type { CSSProperties, ReactNode } from "react";
import { Button } from "./ui/button";
import { ArrowRightIcon } from "./icons";
import { totalKits } from "../model/interpret";
import { commitmentGaps, headline } from "../model/insights";
import type { Scenario, SolveOutcome } from "../types";

export type PlanStatus = "loading" | "failed" | "updating" | "ready";

type AnswerBandProps = {
  scenario: Scenario;
  current: SolveOutcome | null;
  restock: SolveOutcome | null;
  status: PlanStatus;
  issues: string[];
  canExport: boolean;
  onOpenPacking: () => void;
  onExportCsv: () => void;
  onLoadSample: () => void;
};

const pct = (part: number, whole: number) =>
  whole > 0 ? `${Math.min(100, (part / whole) * 100)}%` : "0%";

function Band({
  label,
  status,
  children,
}: {
  label: string;
  status: PlanStatus;
  children: ReactNode;
}) {
  return (
    <section className="band" aria-labelledby="band-h" data-status={status}>
      <div className="band-label">
        <h1 id="band-h">{label}</h1>
        {status === "updating" || status === "loading" ? (
          <span className="band-status" role="status">
            {status === "loading" ? "Starting the planner…" : "Updating…"}
          </span>
        ) : status === "failed" ? (
          <span className="band-status failed" role="status">
            Planner unavailable. Reload to try again.
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function AnswerBand({
  scenario,
  current,
  restock,
  status,
  issues,
  canExport,
  onOpenPacking,
  onExportCsv,
  onLoadSample,
}: AnswerBandProps) {
  const now = current?.overallStatus === "Optimal" ? current : null;
  const after = restock?.overallStatus === "Optimal" ? restock : null;
  const demand = scenario.kits.reduce((sum, kit) => sum + kit.demand, 0);

  if (scenario.items.length === 0 || scenario.kits.length === 0) {
    return (
      <Band label="Kits you can pack" status={status}>
        <p className="band-sentence">
          Add your supplies and at least one kit type below to see how many complete kits
          you can pack.
        </p>
        <div className="band-actions">
          <Button className="accent-button" onClick={onLoadSample}>
            Try the sample drive
          </Button>
        </div>
      </Band>
    );
  }

  if (issues.length) {
    return (
      <Band label="Fix this to see the plan" status={status}>
        <ul className="band-list">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </Band>
    );
  }

  const failed = [current, restock].find(
    (o) => o && !["Optimal", "Infeasible"].includes(o.overallStatus),
  );
  if (failed) {
    return (
      <Band label="The planner stopped early" status={status}>
        <p className="band-sentence">{failed.message}</p>
      </Band>
    );
  }

  if (current?.overallStatus === "Infeasible" && !after) {
    return (
      <Band label="Promised kits are short on stock" status={status}>
        <ul className="band-list">
          {commitmentGaps(scenario).map(({ item, needed, short }) => (
            <li key={item.id}>
              {item.name}: need {needed}, have {item.stock} — short {short}
            </li>
          ))}
        </ul>
        <p className="band-sentence small">
          The budget can't close the gap. Add stock, list purchasable packs or lower a
          promise.
        </p>
      </Band>
    );
  }

  const nowTotal = now ? totalKits(now.kits) : null;
  const afterTotal = after ? totalKits(after.kits) : null;
  const grows = afterTotal !== null && afterTotal > (nowTotal ?? 0);
  const sentence =
    current?.overallStatus === "Infeasible"
      ? {
          lead: "Stock alone can't cover the promised kits.",
          action: "The suggested restock fills the gap.",
        }
      : headline(scenario, now, after);

  return (
    <Band label="Kits you can pack" status={status}>
      <div className="band-body">
        <div className="band-main">
          <div className="band-numbers" aria-live="polite">
            <strong>{nowTotal ?? "—"}</strong>
            {grows ? (
              <>
                <span className="band-arrow" aria-hidden="true">
                  →
                </span>
                <strong className="accent">{afterTotal}</strong>
              </>
            ) : null}
            <span className="band-of">
              of {demand} requested{grows ? " · now → after restock" : ""}
            </span>
          </div>
          {sentence ? (
            <p className="band-sentence">
              {sentence.lead}
              {sentence.action ? <> <mark>{sentence.action}</mark></> : null}
            </p>
          ) : null}
          <div className="band-actions">
            <Button className="accent-button" disabled={!canExport} onClick={onOpenPacking}>
              Open packing sheets
              <ArrowRightIcon aria-hidden="true" />
            </Button>
            <Button className="ghost-dark" disabled={!canExport} onClick={onExportCsv}>
              Export CSV
            </Button>
          </div>
        </div>
        <ul className="band-kits" aria-label="By kit type">
          {scenario.kits.map((kit) => {
            const n = now?.kits[kit.id] ?? 0;
            const a = after?.kits[kit.id] ?? n;
            return (
              <li key={kit.id}>
                <div className="band-kit-line">
                  <span>{kit.name}</span>
                  <b>
                    {n}
                    {a > n ? <em> → {a}</em> : null}
                    <small> / {kit.demand}</small>
                  </b>
                </div>
                <div
                  className="bar"
                  role="img"
                  aria-label={`${kit.name}: ${n} now, ${a} after restock, of ${kit.demand} requested`}
                  style={
                    {
                      "--now": pct(n, kit.demand),
                      "--after": pct(Math.max(n, a), kit.demand),
                    } as CSSProperties
                  }
                >
                  <span className="bar-after" />
                  <span className="bar-now" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Band>
  );
}
