import { describe, expect, it } from "vitest";
import loadHighs from "highs";
import { runTwoPhase } from "../solver/runTwoPhase";
import type { Scenario } from "../types";
import { createExampleScenario, withBackpackStock } from "./example";
import {
  commitmentGaps,
  headline,
  limitingItems,
  listNames,
  nextKitGaps,
  purchasesFor,
} from "./insights";

const highs = await loadHighs();

function solve(scenario: Scenario) {
  const run = (mode: "current" | "restock") =>
    runTwoPhase(highs, {
      requestId: mode,
      scenario,
      mode,
      remainingMs: 2000,
    });
  return { now: run("current"), after: run("restock") };
}

describe("plan insights", () => {
  it("explains the opening drive: one notebook pack adds 4 kits", () => {
    const scenario = createExampleScenario();
    const { now, after } = solve(scenario);

    expect(limitingItems(scenario, now).map((item) => item.name)).toEqual([
      "Notebook",
      "Calculator",
    ]);
    expect(purchasesFor(scenario, after)).toEqual([
      {
        item: scenario.items[1],
        packs: 1,
        units: 5,
        costCents: 500,
      },
    ]);
    expect(headline(scenario, now, after)).toEqual({
      lead: "Notebook and Calculator run out first.",
      action: "Spending $5.00 on Notebook adds 4 kits.",
    });
  });

  it("lists what one more kit needs for each short group", () => {
    const scenario = createExampleScenario();
    const { now } = solve(scenario);
    const gaps = nextKitGaps(scenario, now);

    expect(gaps.map((gap) => gap.kit.id)).toEqual(["kit_a", "kit_b"]);
    expect(gaps[0].missing).toEqual([{ item: scenario.items[1], qty: 1 }]);
    expect(gaps[1].missing).toEqual([
      { item: scenario.items[1], qty: 2 },
      { item: scenario.items[4], qty: 1 },
    ]);
  });

  it("names the stock gap when promises cannot be met", () => {
    const scenario = withBackpackStock(createExampleScenario(), 7);
    expect(commitmentGaps(scenario)).toEqual([
      { item: scenario.items[0], needed: 8, short: 1 },
    ]);
  });

  it("says when the budget cannot help", () => {
    const scenario = { ...createExampleScenario(), budgetCents: 0 };
    const { now, after } = solve(scenario);
    expect(headline(scenario, now, after)?.lead).toMatch(/budget can't add a kit/);
    expect(headline(scenario, now, after)?.action).toBeNull();
  });

  it("joins names in plain English", () => {
    expect(listNames(["A"])).toBe("A");
    expect(listNames(["A", "B"])).toBe("A and B");
    expect(listNames(["A", "B", "C"])).toBe("A, B and C");
  });
});
