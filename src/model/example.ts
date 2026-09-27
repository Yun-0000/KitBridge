import { SCHEMA_VERSION } from "../constants";
import type { Scenario } from "../types";

export const EXAMPLE_LABEL = "School supply drive template.";

/**
 * Built-in school-supply template.
 * Current stock: 8 complete kits. After a $5 notebook pack: 12 kits.
 */
export function createExampleScenario(): Scenario {
  const backpack = "item_backpack";
  const notebook = "item_notebook";
  const pencil = "item_pencil";
  const crayon = "item_crayon";
  const calculator = "item_calculator";

  return {
    version: SCHEMA_VERSION,
    label: EXAMPLE_LABEL,
    budgetCents: 1_000,
    items: [
      {
        id: backpack,
        name: "Backpack",
        stock: 12,
        buyPackSize: 0,
        buyPackPriceCents: 0,
      },
      {
        id: notebook,
        name: "Notebook",
        stock: 12,
        buyPackSize: 5,
        buyPackPriceCents: 500,
      },
      {
        id: pencil,
        name: "Pencil",
        stock: 40,
        buyPackSize: 0,
        buyPackPriceCents: 0,
      },
      {
        id: crayon,
        name: "Crayon box",
        stock: 8,
        buyPackSize: 0,
        buyPackPriceCents: 0,
      },
      {
        id: calculator,
        name: "Calculator",
        stock: 4,
        buyPackSize: 1,
        buyPackPriceCents: 400,
      },
    ],
    kits: [
      {
        id: "kit_a",
        name: "Kit A — lower grade",
        demand: 8,
        committedMin: 4,
        recipe: {
          [backpack]: 1,
          [notebook]: 1,
          [pencil]: 2,
          [crayon]: 1,
          [calculator]: 0,
        },
      },
      {
        id: "kit_b",
        name: "Kit B — upper grade",
        demand: 8,
        committedMin: 4,
        recipe: {
          [backpack]: 1,
          [notebook]: 2,
          [pencil]: 2,
          [crayon]: 0,
          [calculator]: 1,
        },
      },
    ],
  };
}

export function withBackpackStock(scenario: Scenario, stock: number): Scenario {
  return {
    ...scenario,
    label: null,
    items: scenario.items.map((item) =>
      item.id === "item_backpack" ? { ...item, stock } : item,
    ),
  };
}
