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
