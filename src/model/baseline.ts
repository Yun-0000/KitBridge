import type { BaselinePlan, ItemId, KitId, Scenario } from "../types";
import { consumptionFor, remainderFor, unmetFor } from "./interpret";

function canPack(stock: Record<ItemId, number>, recipe: Record<ItemId, number>): boolean {
  return Object.entries(recipe).every(([itemId, qty]) => (stock[itemId] ?? 0) >= qty);
}

function consume(stock: Record<ItemId, number>, recipe: Record<ItemId, number>): void {
  for (const [itemId, qty] of Object.entries(recipe)) {
    stock[itemId] = (stock[itemId] ?? 0) - qty;
  }
}

/**
 * Same-condition simple baseline: no purchases, honor mins then leftover
 * demand in kit list order, consuming shared stock as packed.
 */
export function greedyLeftover(scenario: Scenario): BaselinePlan {
  const stock: Record<ItemId, number> = {};
  for (const item of scenario.items) stock[item.id] = item.stock;

  const kits: Record<KitId, number> = {};
  for (const kit of scenario.kits) kits[kit.id] = 0;

  let feasibleMins = true;
  for (const kit of scenario.kits) {
    for (let i = 0; i < kit.committedMin; i += 1) {
      if (!canPack(stock, kit.recipe)) {
        feasibleMins = false;
        break;
      }
      consume(stock, kit.recipe);
      kits[kit.id] += 1;
    }
  }

  if (feasibleMins) {
    for (const kit of scenario.kits) {
      while (kits[kit.id] < kit.demand && canPack(stock, kit.recipe)) {
        consume(stock, kit.recipe);
        kits[kit.id] += 1;
      }
    }
  }

  const consumption = consumptionFor(scenario, kits);
  const zeroBuys: Record<ItemId, number> = {};
  for (const item of scenario.items) zeroBuys[item.id] = 0;

  return {
    kits,
    consumption,
    remainder: remainderFor(scenario, consumption, zeroBuys),
    unmet: unmetFor(scenario, kits),
    totalKits: Object.values(kits).reduce((sum, n) => sum + n, 0),
    feasibleMins,
  };
}
