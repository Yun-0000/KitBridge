import { CAPS } from "../constants";
import type { Scenario, SolveMode } from "../types";
import { lpName } from "./ids";
import { purchasable } from "./scenario";

export interface LpMapping {
  xNames: string[];
  yNames: string[];
  kitIds: string[];
  itemIds: string[];
}

export interface BuiltLp {
  text: string;
  mapping: LpMapping;
}

function maxUsefulBuys(scenario: Scenario, itemIndex: number): number {
  const item = scenario.items[itemIndex];
  if (!purchasable(item) || item.buyPackSize <= 0) return 0;
  let need = 0;
  for (const kit of scenario.kits) {
    need += (kit.recipe[item.id] ?? 0) * kit.demand;
  }
  const short = Math.max(0, need - item.stock);
  const byNeed = Math.ceil(short / item.buyPackSize);
  const byBudget =
    item.buyPackPriceCents > 0
      ? Math.floor(scenario.budgetCents / item.buyPackPriceCents)
      : CAPS.maxYPacks;
  return Math.max(0, Math.min(CAPS.maxYPacks, byNeed, byBudget));
}

export function buildLp(
  scenario: Scenario,
  mode: SolveMode,
  phase: "maxKits" | "minCost",
  minTotalKits?: number,
): BuiltLp {
  const kitIds = scenario.kits.map((kit) => kit.id);
  const itemIds = scenario.items.map((item) => item.id);
  const xNames = scenario.kits.map((_, index) => lpName("x", index));
  const allowBuys = mode === "restock";
  const yNames = scenario.items.map((_, index) => lpName("y", index));

  const objTerms: string[] = [];
  if (phase === "maxKits") {
    for (const name of xNames) objTerms.push(name);
  } else {
    if (allowBuys) {
      scenario.items.forEach((item, index) => {
        if (purchasable(item) && maxUsefulBuys(scenario, index) > 0) {
          objTerms.push(`${item.buyPackPriceCents} ${yNames[index]}`);
        }
      });
    }
    if (objTerms.length === 0) objTerms.push("0 dummy");
  }

  const constraints: string[] = [];

  if (phase === "minCost" && minTotalKits !== undefined) {
    constraints.push(`  lock_kits: ${xNames.join(" + ")} >= ${minTotalKits}`);
  }

  scenario.items.forEach((item, itemIndex) => {
    const terms: string[] = [];
    scenario.kits.forEach((kit, kitIndex) => {
      const qty = kit.recipe[item.id] ?? 0;
      if (qty > 0) terms.push(`${qty} ${xNames[kitIndex]}`);
    });
    if (terms.length === 0) return;
    const rhs =
      allowBuys && purchasable(item) && maxUsefulBuys(scenario, itemIndex) > 0
        ? `${item.stock} + ${item.buyPackSize} ${yNames[itemIndex]}`
        : `${item.stock}`;
    // CPLEX LP wants a numeric RHS; encode purchases on the left.
    if (allowBuys && purchasable(item) && maxUsefulBuys(scenario, itemIndex) > 0) {
      constraints.push(
        `  item_${itemIndex}: ${terms.join(" + ")} - ${item.buyPackSize} ${yNames[itemIndex]} <= ${item.stock}`,
      );
    } else {
      void rhs;
      constraints.push(`  item_${itemIndex}: ${terms.join(" + ")} <= ${item.stock}`);
    }
  });

  if (allowBuys && phase === "minCost") {
    const costTerms: string[] = [];
    scenario.items.forEach((item, index) => {
      if (purchasable(item) && maxUsefulBuys(scenario, index) > 0 && item.buyPackPriceCents > 0) {
        costTerms.push(`${item.buyPackPriceCents} ${yNames[index]}`);
      }
    });
    if (costTerms.length > 0) {
      constraints.push(`  budget: ${costTerms.join(" + ")} <= ${scenario.budgetCents}`);
    }
  } else if (allowBuys && phase === "maxKits") {
    const costTerms: string[] = [];
    scenario.items.forEach((item, index) => {
      if (purchasable(item) && maxUsefulBuys(scenario, index) > 0 && item.buyPackPriceCents > 0) {
        costTerms.push(`${item.buyPackPriceCents} ${yNames[index]}`);
      }
    });
    if (costTerms.length > 0) {
      constraints.push(`  budget: ${costTerms.join(" + ")} <= ${scenario.budgetCents}`);
    }
  }

  const bounds: string[] = [];
  scenario.kits.forEach((kit, index) => {
    bounds.push(`  ${kit.committedMin} <= ${xNames[index]} <= ${kit.demand}`);
  });
  if (allowBuys) {
    scenario.items.forEach((item, index) => {
      if (purchasable(item) && maxUsefulBuys(scenario, index) > 0) {
        bounds.push(`  0 <= ${yNames[index]} <= ${maxUsefulBuys(scenario, index)}`);
      }
    });
  }
  if (phase === "minCost" && objTerms.includes("0 dummy")) {
    bounds.push("  dummy = 0");
  }

  const generals = [...xNames];
  if (allowBuys) {
    scenario.items.forEach((item, index) => {
      if (purchasable(item) && maxUsefulBuys(scenario, index) > 0) {
        generals.push(yNames[index]);
      }
    });
  }
  if (phase === "minCost" && objTerms.includes("0 dummy")) {
    generals.push("dummy");
  }

  const sense = phase === "maxKits" ? "Maximize" : "Minimize";
  const text = [
    sense,
    `  obj: ${objTerms.join(" + ")}`,
    "Subject To",
    ...constraints,
    "Bounds",
    ...bounds,
    "Generals",
    `  ${generals.join(" ")}`,
    "End",
    "",
  ].join("\n");

  return {
    text,
    mapping: { xNames, yNames, kitIds, itemIds },
  };
}

export function yUpperBound(scenario: Scenario, itemIndex: number): number {
  return maxUsefulBuys(scenario, itemIndex);
}
