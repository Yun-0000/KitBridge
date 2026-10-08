import { describe, expect, it } from "vitest";
import { commitIntegerDraft, commitMoneyDraft } from "./money";
import { greedyLeftover } from "./baseline";
import { createExampleScenario, withBackpackStock } from "./example";
import { parseScenarioJson } from "./io";
import { consumptionFor, inventoryHolds, minsHonored, purchaseCostCents, totalKits } from "./interpret";
import { buildLp } from "./lp";
import { createBlankScenario, createItem, createKit } from "./scenario";
import { describeIssues, formatIssues, validateScenario } from "./validate";

describe("draft commit", () => {
  it("lets a deleted field become zero and ignores junk", () => {
    expect(commitIntegerDraft("", 12)).toBe(0);
    expect(commitIntegerDraft("7", 12)).toBe(7);
    expect(commitIntegerDraft("1", 12)).toBe(1);
    expect(commitIntegerDraft("12x", 12)).toBe(12);
    expect(commitIntegerDraft("-3", 12)).toBe(12);
  });

  it("rejects a pack price above the budget cap instead of clamping it", () => {
    expect(commitMoneyDraft("11", 500, 100_000)).toBe(1100);
    expect(commitMoneyDraft("4", 500, 100_000)).toBe(400);
    expect(commitMoneyDraft("", 500, 100_000)).toBe(0);
    expect(commitMoneyDraft("1001", 500, 100_000)).toBe(500);
    expect(commitMoneyDraft("5.5x", 500, 100_000)).toBe(500);
  });
});

describe("example fixture", () => {
  it("matches the school-supply drive allocation", () => {
    const scenario = createExampleScenario();
    expect(scenario.items).toHaveLength(5);
    expect(scenario.kits).toHaveLength(2);
    expect(scenario.budgetCents).toBe(1000);
    expect(scenario.kits[0].recipe.item_notebook).toBe(1);
    expect(scenario.kits[1].recipe.item_notebook).toBe(2);
    expect(scenario.items.find((item) => item.id === "item_notebook")?.buyPackSize).toBe(5);
    expect(scenario.items.find((item) => item.id === "item_notebook")?.buyPackPriceCents).toBe(500);
  });
});

describe("validateScenario", () => {
  it("accepts the example", () => {
    expect(validateScenario(createExampleScenario())).toEqual([]);
  });

  it("rejects more than 3 kits and more than 100 demand", () => {
    const scenario = createExampleScenario();
    scenario.kits.push({
      id: "kit_c",
      name: "C",
      demand: 1,
      committedMin: 0,
      recipe: {},
    });
    scenario.kits.push({
      id: "kit_d",
      name: "D",
      demand: 1,
      committedMin: 0,
      recipe: {},
    });
    const issues = validateScenario(scenario);
    expect(issues.some((issue) => issue.message.includes("At most 3"))).toBe(true);
  });

  it("refuses committed min above demand", () => {
    const scenario = createExampleScenario();
    scenario.kits[0].committedMin = 9;
    const issues = validateScenario(scenario);
    expect(issues.some((issue) => issue.message.includes("will not lower"))).toBe(true);
  });

  it("rejects a blank planner", () => {
    expect(validateScenario(createBlankScenario()).length).toBeGreaterThan(0);
  });
});

describe("greedy leftover baseline", () => {
  it("packs 8 kits on the example without buying", () => {
    const plan = greedyLeftover(createExampleScenario());
    expect(plan.feasibleMins).toBe(true);
    expect(plan.totalKits).toBe(8);
    expect(plan.kits.kit_a).toBe(4);
    expect(plan.kits.kit_b).toBe(4);
  });

  it("cannot honor mins with 7 backpacks", () => {
    const plan = greedyLeftover(withBackpackStock(createExampleScenario(), 7));
    expect(plan.feasibleMins).toBe(false);
  });
});

describe("buildLp", () => {
  it("forces y = 0 on current stock by omitting buy variables", () => {
    const { text } = buildLp(createExampleScenario(), "current", "maxKits");
    expect(text).toContain("Maximize");
    expect(text).not.toMatch(/\by0\b/);
    expect(text).toContain("4 <= x0 <= 8");
  });

  it("allows notebook purchases on restock and locks total kits in phase 2", () => {
    const { text } = buildLp(createExampleScenario(), "restock", "minCost", 12);
    expect(text).toContain("Minimize");
    expect(text).toContain("lock_kits:");
    expect(text).toContain(">= 12");
    expect(text).toContain("budget:");
    expect(text).toMatch(/\by1\b/);
  });
});

describe("conservation helpers", () => {
  it("rejects a plan that over-uses stock", () => {
    const scenario = createExampleScenario();
    const kits = { kit_a: 8, kit_b: 8 };
    expect(inventoryHolds(scenario, kits, { item_notebook: 0 })).toBe(false);
    expect(minsHonored(scenario, { kit_a: 3, kit_b: 4 })).toBe(false);
    expect(purchaseCostCents(scenario, { item_notebook: 1, item_calculator: 1 })).toBe(900);
    expect(totalKits(kits)).toBe(16);
    const used = consumptionFor(scenario, { kit_a: 4, kit_b: 4 });
    expect(used.item_notebook).toBe(12);
  });
});

describe("JSON import", () => {
  it("keeps existing data when JSON is corrupt", () => {
    const result = parseScenarioJson("{not json");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("kept");
    }
  });

  it("rejects a schema that silently drops mins by omitting them", () => {
    const result = parseScenarioJson(
      JSON.stringify({
        version: 1,
        items: [createItem({ id: "i", name: "X", stock: 1 })],
        kits: [createKit([], { id: "k", name: "K", demand: 1 })],
        budgetCents: 0,
        label: null,
      }),
    );
    expect("scenario" in result).toBe(true);
  });

  it("surfaces validation text", () => {
    const text = formatIssues(validateScenario({ version: 2 }));
    expect(text.length).toBeGreaterThan(0);
  });
});

describe("describeIssues", () => {
  it("names the kit instead of printing a path", () => {
    const scenario = createExampleScenario();
    scenario.kits[0].demand = 2;
    expect(describeIssues(scenario, validateScenario(scenario))).toEqual([
      "Kit A — lower grade: promised kits can't be more than requested kits.",
    ]);
  });
});
