import type { ItemId, KitId, Scenario } from "../types";

export function asInt(value: number): number {
  return Math.max(0, Math.round(value));
}

function primalOf(column: unknown): number {
  if (typeof column === "object" && column !== null && "Primal" in column) {
    const value = (column as { Primal?: unknown }).Primal;
    return typeof value === "number" ? value : 0;
  }
  return 0;
}

export function kitCountsFromColumns(
  columns: Record<string, unknown>,
  xNames: string[],
  kitIds: string[],
): Record<KitId, number> {
  const kits: Record<KitId, number> = {};
  xNames.forEach((name, index) => {
    kits[kitIds[index]] = asInt(primalOf(columns[name]));
  });
  return kits;
}

export function buyCountsFromColumns(
  columns: Record<string, unknown>,
  yNames: string[],
  itemIds: string[],
  includeBuys: boolean,
): Record<ItemId, number> {
  const buys: Record<ItemId, number> = {};
  itemIds.forEach((itemId, index) => {
    buys[itemId] = includeBuys ? asInt(primalOf(columns[yNames[index]])) : 0;
  });
  return buys;
}

export function consumptionFor(
  scenario: Scenario,
  kits: Record<KitId, number>,
): Record<ItemId, number> {
  const consumption: Record<ItemId, number> = {};
  for (const item of scenario.items) {
    let used = 0;
    for (const kit of scenario.kits) {
      used += (kit.recipe[item.id] ?? 0) * (kits[kit.id] ?? 0);
    }
    consumption[item.id] = used;
  }
  return consumption;
}

export function remainderFor(
  scenario: Scenario,
  consumption: Record<ItemId, number>,
  buys: Record<ItemId, number>,
): Record<ItemId, number> {
  const remainder: Record<ItemId, number> = {};
  for (const item of scenario.items) {
    const available = item.stock + item.buyPackSize * (buys[item.id] ?? 0);
    remainder[item.id] = available - (consumption[item.id] ?? 0);
  }
  return remainder;
}

export function unmetFor(
  scenario: Scenario,
  kits: Record<KitId, number>,
): Record<KitId, number> {
  const unmet: Record<KitId, number> = {};
  for (const kit of scenario.kits) {
    unmet[kit.id] = Math.max(0, kit.demand - (kits[kit.id] ?? 0));
  }
  return unmet;
}

export function purchaseCostCents(
  scenario: Scenario,
  buys: Record<ItemId, number>,
): number {
  let cost = 0;
  for (const item of scenario.items) {
    cost += item.buyPackPriceCents * (buys[item.id] ?? 0);
  }
  return cost;
}

export function inventoryHolds(
  scenario: Scenario,
  kits: Record<KitId, number>,
  buys: Record<ItemId, number>,
): boolean {
  const consumption = consumptionFor(scenario, kits);
  for (const item of scenario.items) {
    const available = item.stock + item.buyPackSize * (buys[item.id] ?? 0);
    if ((consumption[item.id] ?? 0) > available) return false;
  }
  return true;
}

export function minsHonored(
  scenario: Scenario,
  kits: Record<KitId, number>,
): boolean {
  return scenario.kits.every((kit) => (kits[kit.id] ?? 0) >= kit.committedMin);
}

export function withinDemand(
  scenario: Scenario,
  kits: Record<KitId, number>,
): boolean {
  return scenario.kits.every((kit) => (kits[kit.id] ?? 0) <= kit.demand);
}

export function withinBudget(
  scenario: Scenario,
  buys: Record<ItemId, number>,
): boolean {
  return purchaseCostCents(scenario, buys) <= scenario.budgetCents;
}

export function totalKits(kits: Record<KitId, number>): number {
  return Object.values(kits).reduce((sum, n) => sum + n, 0);
}

export function emptyKitCounts(scenario: Scenario): Record<KitId, number> {
  const kits: Record<KitId, number> = {};
  for (const kit of scenario.kits) kits[kit.id] = 0;
  return kits;
}

export function emptyBuyCounts(scenario: Scenario): Record<ItemId, number> {
  const buys: Record<ItemId, number> = {};
  for (const item of scenario.items) buys[item.id] = 0;
  return buys;
}
