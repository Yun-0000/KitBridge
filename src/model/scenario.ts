import { CAPS, SCHEMA_VERSION } from "../constants";
import type { Item, ItemId, Kit, Scenario } from "../types";
import { newId } from "./ids";

export function emptyRecipe(items: Item[]): Record<ItemId, number> {
  const recipe: Record<ItemId, number> = {};
  for (const item of items) recipe[item.id] = 0;
  return recipe;
}

export function createBlankScenario(): Scenario {
  return {
    version: SCHEMA_VERSION,
    items: [],
    kits: [],
    budgetCents: 0,
    label: null,
  };
}

export function createItem(partial?: Partial<Item>): Item {
  return {
    id: partial?.id ?? newId("item"),
    name: partial?.name ?? "",
    stock: partial?.stock ?? 0,
    buyPackSize: partial?.buyPackSize ?? 0,
    buyPackPriceCents: partial?.buyPackPriceCents ?? 0,
  };
}

export function createKit(items: Item[], partial?: Partial<Kit>): Kit {
  return {
    id: partial?.id ?? newId("kit"),
    name: partial?.name ?? "",
    demand: partial?.demand ?? 0,
    committedMin: partial?.committedMin ?? 0,
    recipe: { ...emptyRecipe(items), ...partial?.recipe },
  };
}

export function addItem(scenario: Scenario): Scenario {
  if (scenario.items.length >= CAPS.maxItems) return scenario;
  const item = createItem({ name: `Item ${scenario.items.length + 1}` });
  return {
    ...scenario,
    label: null,
    items: [...scenario.items, item],
    kits: scenario.kits.map((kit) => ({
      ...kit,
      recipe: { ...kit.recipe, [item.id]: 0 },
    })),
  };
}

export function addKit(scenario: Scenario): Scenario {
  if (scenario.kits.length >= CAPS.maxKits) return scenario;
  return {
    ...scenario,
    label: null,
    kits: [
      ...scenario.kits,
      createKit(scenario.items, { name: `Kit ${scenario.kits.length + 1}` }),
    ],
  };
}

export function removeItem(scenario: Scenario, itemId: ItemId): Scenario {
  return {
    ...scenario,
    label: null,
    items: scenario.items.filter((item) => item.id !== itemId),
    kits: scenario.kits.map((kit) => {
      const recipe = { ...kit.recipe };
      delete recipe[itemId];
      return { ...kit, recipe };
    }),
  };
}

export function removeKit(scenario: Scenario, kitId: string): Scenario {
  return {
    ...scenario,
    label: null,
    kits: scenario.kits.filter((kit) => kit.id !== kitId),
  };
}

export function updateItem(
  scenario: Scenario,
  itemId: ItemId,
  patch: Partial<Omit<Item, "id">>,
): Scenario {
  return {
    ...scenario,
    label: null,
    items: scenario.items.map((item) =>
      item.id === itemId ? { ...item, ...patch } : item,
    ),
  };
}

export function updateKit(
  scenario: Scenario,
  kitId: string,
  patch: Partial<Omit<Kit, "id">>,
): Scenario {
  return {
    ...scenario,
    label: null,
    kits: scenario.kits.map((kit) =>
      kit.id === kitId ? { ...kit, ...patch } : kit,
    ),
  };
}

export function setRecipeQty(
  scenario: Scenario,
  kitId: string,
  itemId: ItemId,
  qty: number,
): Scenario {
  return {
    ...scenario,
    label: null,
    kits: scenario.kits.map((kit) =>
      kit.id === kitId
        ? { ...kit, recipe: { ...kit.recipe, [itemId]: qty } }
        : kit,
    ),
  };
}

export function cloneScenario(scenario: Scenario): Scenario {
  return structuredClone(scenario);
}

export function totalDemand(scenario: Scenario): number {
  return scenario.kits.reduce((sum, kit) => sum + kit.demand, 0);
}

export function totalCommitted(scenario: Scenario): number {
  return scenario.kits.reduce((sum, kit) => sum + kit.committedMin, 0);
}

export function purchasable(item: Item): boolean {
  return item.buyPackSize > 0 && item.buyPackPriceCents >= 0;
}
