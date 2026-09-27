import { describe, expect, it } from "vitest";
import loadHighs from "highs";
import type { Highs } from "highs";
import { createExampleScenario, withBackpackStock } from "../model/example";
import {
  inventoryHolds,
  minsHonored,
  purchaseCostCents,
  totalKits,
  withinBudget,
  withinDemand,
} from "../model/interpret";
import { removeItem, updateItem } from "../model/scenario";
import type { Scenario, SolveOutcome } from "../types";
import { runTwoPhase } from "./runTwoPhase";

const highs = await loadHighs();

describe("two-phase school-supply planning", () => {
  it("packs 8 kits from current stock and 12 after a $5 notebook buy", () => {
    const scenario = createExampleScenario();

    const current = runTwoPhase(highs, {
      requestId: "t-current",
      scenario,
      mode: "current",
      remainingMs: 2000,
    });

    expect(current.overallStatus).toBe("Optimal");
    expect(current.phase1.status).toBe("Optimal");
    expect(current.phase2?.status).toBe("Optimal");
    expect(totalKits(current.kits)).toBe(8);
    expect(current.kits.kit_a).toBe(4);
    expect(current.kits.kit_b).toBe(4);
    expect(current.costCents).toBe(0);
    expect(Object.values(current.buys).every((n) => n === 0)).toBe(true);
    expect(inventoryHolds(scenario, current.kits, current.buys)).toBe(true);
    expect(minsHonored(scenario, current.kits)).toBe(true);
    expect(withinDemand(scenario, current.kits)).toBe(true);

    const restock = runTwoPhase(highs, {
      requestId: "t-restock",
      scenario,
      mode: "restock",
      remainingMs: 2000,
    });

    expect(restock.overallStatus).toBe("Optimal");
    expect(restock.phase1.status).toBe("Optimal");
    expect(restock.phase2?.status).toBe("Optimal");
    expect(totalKits(restock.kits)).toBe(12);
    expect(restock.kits.kit_a).toBe(8);
    expect(restock.kits.kit_b).toBe(4);
    expect(restock.buys.item_notebook).toBe(1);
    expect(restock.buys.item_calculator).toBe(0);
    expect(purchaseCostCents(scenario, restock.buys)).toBe(500);
    expect(withinBudget(scenario, restock.buys)).toBe(true);
    expect(inventoryHolds(scenario, restock.kits, restock.buys)).toBe(true);
    expect(minsHonored(scenario, restock.kits)).toBe(true);
  });

  it("reports infeasible when 7 backpacks cannot honor 4+4 mins", () => {
    const scenario = withBackpackStock(createExampleScenario(), 7);
    const current = runTwoPhase(highs, {
      requestId: "t-infeas",
      scenario,
      mode: "current",
      remainingMs: 2000,
    });
    expect(current.overallStatus).toBe("Infeasible");
    expect(current.phase1.status).toBe("Infeasible");
    expect(current.phase2).toBeNull();
    expect(current.message).toContain("did not lower");

    const restock = runTwoPhase(highs, {
      requestId: "t-infeas-r",
      scenario,
      mode: "restock",
      remainingMs: 2000,
    });
    expect(restock.overallStatus).toBe("Infeasible");
    expect(scenario.kits.map((kit) => kit.committedMin)).toEqual([4, 4]);
  });

  it("does not buy a $5 notebook pack on a $4 budget", () => {
    const scenario = { ...createExampleScenario(), budgetCents: 400 };
    const restock = solve(scenario, "restock");
    expect(restock.overallStatus).toBe("Optimal");
    expect(totalKits(restock.kits)).toBe(8);
    expect(restock.costCents).toBe(0);
    expect(restock.buys.item_notebook).toBe(0);
    expect(withinBudget(scenario, restock.buys)).toBe(true);
  });

  it("stops buying notebooks when the pack price rises above the budget", () => {
    const scenario = updateItem(createExampleScenario(), "item_notebook", {
      buyPackPriceCents: 1100,
    });
    const restock = solve(scenario, "restock");
    expect(restock.overallStatus).toBe("Optimal");
    expect(totalKits(restock.kits)).toBe(8);
    expect(restock.costCents).toBe(0);
    expect(restock.buys.item_notebook).toBe(0);
  });

  it("still buys one notebook pack when the price is $6 and the budget is $10", () => {
    const scenario = updateItem(createExampleScenario(), "item_notebook", {
      buyPackPriceCents: 600,
    });
    const restock = solve(scenario, "restock");
    expect(restock.overallStatus).toBe("Optimal");
    expect(totalKits(restock.kits)).toBe(12);
    expect(restock.buys.item_notebook).toBe(1);
    expect(restock.costCents).toBe(600);
    expect(withinBudget(scenario, restock.buys)).toBe(true);
  });

  it("keeps a feasible plan after the calculator row is deleted", () => {
    const scenario = removeItem(createExampleScenario(), "item_calculator");
    expect(scenario.items.some((item) => item.id === "item_calculator")).toBe(
      false,
    );
    const current = solve(scenario, "current");
    const restock = solve(scenario, "restock");
    expect(current.overallStatus).toBe("Optimal");
    expect(restock.overallStatus).toBe("Optimal");
    expect(totalKits(current.kits)).toBe(8);
    expect(totalKits(restock.kits)).toBe(12);
    expect(inventoryHolds(scenario, restock.kits, restock.buys)).toBe(true);
    expect(minsHonored(scenario, restock.kits)).toBe(true);
  });

  it("reports timeout and discards a partial objective", () => {
    const fake = {
      solve: () => ({
        Status: "Time limit reached",
        ObjectiveValue: 99,
        Columns: {},
      }),
    } as unknown as Highs;
    const outcome = runTwoPhase(fake, {
      requestId: "t-timeout",
      scenario: createExampleScenario(),
      mode: "current",
      remainingMs: 2000,
    });
    expect(outcome.overallStatus).toBe("Timeout");
    expect(outcome.phase2).toBeNull();
    expect(totalKits(outcome.kits)).toBe(0);
    expect(outcome.message.toLowerCase()).toContain("time");
  });

  it("does not publish an optimal phase-1 value after the wall clock is already spent", () => {
    const outcome = runTwoPhase(highs, {
      requestId: "t-wall",
      scenario: createExampleScenario(),
      mode: "current",
      remainingMs: 0,
    });
    expect(outcome.overallStatus).toBe("Timeout");
    expect(outcome.overallStatus).not.toBe("Optimal");
    expect(totalKits(outcome.kits)).toBe(0);
  });

  it("keeps integers, minima, stock, and budget across varied edits", () => {
    const seeds: Scenario[] = [];
    const base = createExampleScenario();
    for (const budgetCents of [0, 400, 500, 1000]) {
      seeds.push({ ...base, budgetCents });
    }
    for (const price of [0, 100, 500, 900]) {
      seeds.push(
        updateItem(base, "item_notebook", { buyPackPriceCents: price }),
      );
    }
    for (const stock of [0, 7, 8, 12, 20]) {
      seeds.push(withBackpackStock(base, stock));
    }
    const zeroMins = structuredClone(base);
    for (const kit of zeroMins.kits) kit.committedMin = 0;
    seeds.push(zeroMins);

    for (const scenario of seeds) {
      for (const mode of ["current", "restock"] as const) {
        const outcome = solve(scenario, mode);
        expect(["Optimal", "Infeasible", "Timeout", "Error"]).toContain(
          outcome.overallStatus,
        );
        if (outcome.overallStatus !== "Optimal") {
          expect(totalKits(outcome.kits)).toBe(0);
          continue;
        }
        expect(outcome.phase1.status).toBe("Optimal");
        expect(outcome.phase2?.status).toBe("Optimal");
        expect(inventoryHolds(scenario, outcome.kits, outcome.buys)).toBe(true);
        expect(minsHonored(scenario, outcome.kits)).toBe(true);
        expect(withinDemand(scenario, outcome.kits)).toBe(true);
        expect(withinBudget(scenario, outcome.buys)).toBe(true);
        expect(
          Object.values(outcome.kits).every((count) => Number.isInteger(count)),
        ).toBe(true);
        if (mode === "current") expect(outcome.costCents).toBe(0);
      }
    }
    expect(seeds.length).toBeGreaterThanOrEqual(12);
  });
});

function solve(scenario: Scenario, mode: "current" | "restock"): SolveOutcome {
  return runTwoPhase(highs, {
    requestId: `t-${mode}`,
    scenario,
    mode,
    remainingMs: 2000,
  });
}

describe("judge regressions", () => {
  it("rejects an empty recipe instead of inventing complete kits", () => {
    const scenario = createExampleScenario();
    scenario.kits[0].recipe = {};
    expect(solve(scenario, "current").overallStatus).toBe("Error");
    expect(solve(scenario, "restock").message).toContain("empty recipe");
  });

  it("matches independent exhaustive allocation and purchase enumeration in 96 cases", () => {
    for (const backpacks of [7, 8, 12, 16])
      for (const notebooks of [8, 12, 20])
        for (const budget of [0, 400, 500, 1000]) {
          const scenario = createExampleScenario();
          scenario.items[0].stock = backpacks;
          scenario.items[1].stock = notebooks;
          scenario.budgetCents = budget;
          for (const mode of ["current", "restock"] as const) {
            let expected: { count: number; cost: number } | null = null;
            const limit = mode === "restock" ? budget : 0;
            for (let a = 4; a <= 8; a++)
              for (let b = 4; b <= 8; b++)
                for (let n = 0; n <= Math.floor(limit / 500); n++)
                  for (let c = 0; c <= Math.floor(limit / 400); c++) {
                    const count = a + b,
                      cost = n * 500 + c * 400;
                    if (
                      count > backpacks ||
                      a + 2 * b > notebooks + 5 * n ||
                      2 * count > 40 ||
                      a > 8 ||
                      b > 4 + c ||
                      cost > limit
                    )
                      continue;
                    if (
                      !expected ||
                      count > expected.count ||
                      (count === expected.count && cost < expected.cost)
                    )
                      expected = { count, cost };
                  }
            const actual = solve(scenario, mode);
            if (!expected) {
              expect(actual.overallStatus).toBe("Infeasible");
              continue;
            }
            expect(actual.overallStatus).toBe("Optimal");
            expect(totalKits(actual.kits)).toBe(expected.count);
            expect(actual.costCents).toBe(expected.cost);
          }
        }
  });
});
