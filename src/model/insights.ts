import type { Item, Kit, Scenario, SolveOutcome } from "../types";
import { totalKits } from "./interpret";
import { formatUsd } from "./money";

export interface Purchase {
  item: Item;
  packs: number;
  units: number;
  costCents: number;
}

export interface NextKitGap {
  kit: Kit;
  unmet: number;
  missing: { item: Item; qty: number }[];
}

/** Packs to buy, in inventory order, skipping items the plan does not buy. */
export function purchasesFor(
  scenario: Scenario,
  outcome: SolveOutcome,
): Purchase[] {
  return scenario.items
    .map((item) => {
      const packs = outcome.buys[item.id] ?? 0;
      return {
        item,
        packs,
        units: packs * item.buyPackSize,
        costCents: packs * item.buyPackPriceCents,
      };
    })
    .filter((purchase) => purchase.packs > 0);
}

/**
 * For each kit type that is still short, the extra units needed to pack one
 * more kit from this plan's leftovers. Reallocating packed kits may change it.
 */
export function nextKitGaps(
  scenario: Scenario,
  outcome: SolveOutcome,
): NextKitGap[] {
  return scenario.kits
    .map((kit) => ({
      kit,
      unmet: outcome.unmet[kit.id] ?? 0,
      missing: scenario.items
        .map((item) => ({
          item,
          qty: Math.max(
            0,
            (kit.recipe[item.id] ?? 0) - (outcome.remainder[item.id] ?? 0),
          ),
        }))
        .filter((entry) => entry.qty > 0),
    }))
    .filter((gap) => gap.unmet > 0);
}

/** Items that block at least one more kit, in inventory order. */
export function limitingItems(
  scenario: Scenario,
  outcome: SolveOutcome,
): Item[] {
  const blocked = new Set(
    nextKitGaps(scenario, outcome).flatMap((gap) =>
      gap.missing.map((entry) => entry.item.id),
    ),
  );
  return scenario.items.filter((item) => blocked.has(item.id));
}

/** Commitment shortfalls: units needed to pack every promised kit from stock. */
export function commitmentGaps(
  scenario: Scenario,
): { item: Item; needed: number; short: number }[] {
  return scenario.items
    .map((item) => {
      const needed = scenario.kits.reduce(
        (sum, kit) => sum + kit.committedMin * (kit.recipe[item.id] ?? 0),
        0,
      );
      return { item, needed, short: needed - item.stock };
    })
    .filter((gap) => gap.short > 0);
}

export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * What the plan means in one sentence: `lead` names the bottleneck and
 * `action` is the purchase that helps, when there is one.
 */
export function headline(
  scenario: Scenario,
  now: SolveOutcome | null,
  after: SolveOutcome | null,
): { lead: string; action: string | null } | null {
  if (!now) return null;
  const demand = scenario.kits.reduce((sum, kit) => sum + kit.demand, 0);
  const packed = totalKits(now.kits);
  if (packed >= demand) {
    return { lead: "Stock on hand covers every requested kit.", action: null };
  }

  const limits = limitingItems(scenario, now).map((item) => item.name);
  const lead = limits.length
    ? `${listNames(limits)} ${limits.length === 1 ? "runs" : "run"} out first.`
    : "";
  if (after && totalKits(after.kits) > packed) {
    const extra = totalKits(after.kits) - packed;
    const names = purchasesFor(scenario, after).map((p) => p.item.name);
    return {
      lead,
      action: `Spending ${formatUsd(after.costCents)} on ${listNames(names)} adds ${extra} kit${extra === 1 ? "" : "s"}.`,
    };
  }
  return {
    lead: `${lead} The budget can't add a kit yet. Raise it or list more purchasable items.`.trim(),
    action: null,
  };
}
