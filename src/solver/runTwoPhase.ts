import type { Highs } from "highs";
import { buildLp } from "../model/lp";
import {
  buyCountsFromColumns,
  consumptionFor,
  emptyBuyCounts,
  emptyKitCounts,
  kitCountsFromColumns,
  purchaseCostCents,
  remainderFor,
  unmetFor,
} from "../model/interpret";
import { validateScenario, formatIssues } from "../model/validate";
import type {
  HighsPhaseStatus,
  PhaseResult,
  SolveOutcome,
  SolveRequest,
  SolverStatus,
} from "../types";

function classifyHighs(status: HighsPhaseStatus): SolverStatus {
  if (status === "Optimal") return "Optimal";
  if (status === "Infeasible") return "Infeasible";
  if (status === "Time limit reached") return "Timeout";
  return "Error";
}

function phaseFromHighs(
  status: HighsPhaseStatus,
  objective: number | null,
  extra?: string,
): PhaseResult {
  const mapped = classifyHighs(status);
  const message =
    mapped === "Optimal"
      ? null
      : (extra ??
        (mapped === "Infeasible"
          ? "HiGHS proved this phase infeasible. Committed minima were not lowered."
          : mapped === "Timeout"
            ? "HiGHS stopped at the time limit before proving optimality."
            : `HiGHS ended with status “${status}”.`));
  return {
    status: mapped,
    highsStatus: status,
    objective,
    message,
  };
}

function emptyOutcome(
  request: SolveRequest,
  overallStatus: SolverStatus,
  message: string,
  phase1: PhaseResult,
  phase2: PhaseResult | null,
  elapsedMs: number,
): SolveOutcome {
  const kits = emptyKitCounts(request.scenario);
  const buys = emptyBuyCounts(request.scenario);
  const consumption = consumptionFor(request.scenario, kits);
  return {
    requestId: request.requestId,
    mode: request.mode,
    overallStatus,
    message,
    phase1,
    phase2,
    kits,
    buys,
    costCents: 0,
    consumption,
    remainder: remainderFor(request.scenario, consumption, buys),
    unmet: unmetFor(request.scenario, kits),
    elapsedMs,
  };
}

function remainingSeconds(started: number, remainingMs: number): number {
  const leftMs = remainingMs - (performance.now() - started);
  return Math.max(0.05, leftMs / 1000);
}

export function runTwoPhase(highs: Highs, request: SolveRequest): SolveOutcome {
  const started = performance.now();
  const { scenario, mode } = request;

  const issues = validateScenario(scenario);
  if (issues.length) {
    const message = formatIssues(issues);
    return emptyOutcome(
      request,
      "Error",
      message,
      { status: "Error", highsStatus: null, objective: null, message },
      null,
      0,
    );
  }

  const phase1Lp = buildLp(scenario, mode, "maxKits");
  let raw1: ReturnType<Highs["solve"]>;
  try {
    raw1 = highs.solve(phase1Lp.text, {
      output_flag: false,
      presolve: "on",
      mip_rel_gap: 0,
      time_limit: remainingSeconds(started, request.remainingMs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Phase 1 threw.";
    return emptyOutcome(
      request,
      "Error",
      message,
      {
        status: "Error",
        highsStatus: null,
        objective: null,
        message,
      },
      null,
      Math.round(performance.now() - started),
    );
  }

  const phase1 = phaseFromHighs(
    raw1.Status,
    typeof raw1.ObjectiveValue === "number" ? raw1.ObjectiveValue : null,
  );

  if (performance.now() - started >= request.remainingMs) {
    return emptyOutcome(
      request,
      "Timeout",
      "Solve exceeded the 2s wall-clock limit.",
      phase1.status === "Timeout"
        ? phase1
        : {
            ...phase1,
            status: "Timeout",
            message: "Wall-clock limit reached.",
          },
      null,
      Math.round(performance.now() - started),
    );
  }

  if (phase1.status === "Infeasible") {
    return emptyOutcome(
      request,
      "Infeasible",
      mode === "current"
        ? "Current stock cannot honor every committed minimum. KitBridge did not lower those minima."
        : "Even with this restock budget and pack sizes, committed minima cannot be met. KitBridge did not lower those minima.",
      phase1,
      null,
      Math.round(performance.now() - started),
    );
  }

  if (phase1.status !== "Optimal") {
    return emptyOutcome(
      request,
      phase1.status,
      phase1.message ?? "Phase 1 did not prove optimality.",
      phase1,
      null,
      Math.round(performance.now() - started),
    );
  }

  const minTotalKits = Math.round(raw1.ObjectiveValue);
  const phase2Lp = buildLp(scenario, mode, "minCost", minTotalKits);
  let raw2: ReturnType<Highs["solve"]>;
  try {
    raw2 = highs.solve(phase2Lp.text, {
      output_flag: false,
      presolve: "on",
      mip_rel_gap: 0,
      time_limit: remainingSeconds(started, request.remainingMs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Phase 2 threw.";
    return emptyOutcome(
      request,
      "Error",
      message,
      phase1,
      {
        status: "Error",
        highsStatus: null,
        objective: null,
        message,
      },
      Math.round(performance.now() - started),
    );
  }

  const phase2 = phaseFromHighs(
    raw2.Status,
    typeof raw2.ObjectiveValue === "number" ? raw2.ObjectiveValue : null,
  );

  if (phase2.status !== "Optimal") {
    return emptyOutcome(
      request,
      phase2.status === "Infeasible" ? "Error" : phase2.status,
      phase2.status === "Infeasible"
        ? "Phase 1 was Optimal but the min-cost lock was infeasible. Results were discarded."
        : (phase2.message ??
            "Phase 2 did not prove optimality. Optimal is only claimed when both phases are Optimal."),
      phase1,
      phase2,
      Math.round(performance.now() - started),
    );
  }

  const includeBuys = mode === "restock";
  const kits = kitCountsFromColumns(
    raw2.Columns,
    phase2Lp.mapping.xNames,
    phase2Lp.mapping.kitIds,
  );
  const buys = buyCountsFromColumns(
    raw2.Columns,
    phase2Lp.mapping.yNames,
    phase2Lp.mapping.itemIds,
    includeBuys,
  );
  const consumption = consumptionFor(scenario, kits);
  const remainder = remainderFor(scenario, consumption, buys);
  const costCents = purchaseCostCents(scenario, buys);

  return {
    requestId: request.requestId,
    mode,
    overallStatus: "Optimal",
    message:
      mode === "current"
        ? "Both phases Optimal on current stock (purchases forced to zero)."
        : "Both phases Optimal with restock purchases allowed.",
    phase1,
    phase2,
    kits,
    buys,
    costCents,
    consumption,
    remainder,
    unmet: unmetFor(scenario, kits),
    elapsedMs: Math.round(performance.now() - started),
  };
}
