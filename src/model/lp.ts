import type { Item, Scenario, SolveMode } from "../types";
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

/**
 * Most packs worth buying: enough to cover every requested kit, and no more
 * than the budget pays for. Free packs are bounded by need alone.
 */
function maxUsefulBuys(scenario: Scenario, item: Item): number {
  if (!purchasable(item)) return 0;
  let need = 0;
  for (const kit of scenario.kits) {
    need += (kit.recipe[item.id] ?? 0) * kit.demand;
  }
  const byNeed = Math.ceil(Math.max(0, need - item.stock) / item.buyPackSize);
  if (item.buyPackPriceCents === 0) return byNeed;
  return Math.min(byNeed, Math.floor(scenario.budgetCents / item.buyPackPriceCents));
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
  const yNames = scenario.items.map((_, index) => lpName("y", index));
  // Upper bound on packs bought per item; 0 means the item gets no buy variable.
  const yMax = scenario.items.map((item) =>
    mode === "restock" ? maxUsefulBuys(scenario, item) : 0,
  );
  const buyable = scenario.items
    .map((item, index) => ({ item, index, name: yNames[index] }))
    .filter(({ index }) => yMax[index] > 0);

  const objTerms =
    phase === "maxKits"
      ? [...xNames]
      : buyable.map(({ item, name }) => `${item.buyPackPriceCents} ${name}`);
  const useDummy = phase === "minCost" && objTerms.length === 0;
  if (useDummy) objTerms.push("0 dummy");

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
    // CPLEX LP wants a numeric RHS; encode purchases on the left.
    const buy = yMax[itemIndex] > 0 ? ` - ${item.buyPackSize} ${yNames[itemIndex]}` : "";
    constraints.push(`  item_${itemIndex}: ${terms.join(" + ")}${buy} <= ${item.stock}`);
  });

  const costTerms = buyable
    .filter(({ item }) => item.buyPackPriceCents > 0)
    .map(({ item, name }) => `${item.buyPackPriceCents} ${name}`);
  if (costTerms.length > 0) {
    constraints.push(`  budget: ${costTerms.join(" + ")} <= ${scenario.budgetCents}`);
  }

  const bounds = scenario.kits.map(
    (kit, index) => `  ${kit.committedMin} <= ${xNames[index]} <= ${kit.demand}`,
  );
  for (const { index, name } of buyable) {
    bounds.push(`  0 <= ${name} <= ${yMax[index]}`);
  }
  const generals = [...xNames, ...buyable.map(({ name }) => name)];
  if (useDummy) {
    bounds.push("  dummy = 0");
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
