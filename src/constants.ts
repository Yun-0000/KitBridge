export const CAPS = {
  maxKits: 3,
  maxItems: 12,
  maxDemandPacks: 100,
  maxBudgetCents: 100_000,
  maxStock: 10_000,
  maxRecipeQty: 100,
  maxBuyPackSize: 500,
  maxYPacks: 100,
} as const;

export const SOLVE_TIMEOUT_MS = 2_000;
export const WASM_LOAD_TIMEOUT_MS = 20_000;

export const STORAGE_KEY = "kitbridge.scenario.v1";
export const SCHEMA_VERSION = 1 as const;

export const BASELINE_RULE =
  "Greedy leftover: honor each kit’s committed minimum in list order, then pack extra kits in list order from remaining stock. Shared items are consumed as packed. This baseline never buys restock packs.";
