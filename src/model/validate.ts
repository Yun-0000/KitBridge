import { CAPS, SCHEMA_VERSION } from "../constants";
import type { Item, Kit, Scenario, ValidationIssue } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function checkItem(
  item: unknown,
  index: number,
  issues: ValidationIssue[],
): item is Item {
  if (!isRecord(item)) {
    issues.push({
      path: `items[${index}]`,
      message: "Item must be an object.",
    });
    return false;
  }
  const prefix = `items[${index}]`;
  if (typeof item.id !== "string" || item.id.length === 0) {
    issues.push({
      path: `${prefix}.id`,
      message: "Each item needs a non-empty id.",
    });
  }
  if (typeof item.name !== "string") {
    issues.push({
      path: `${prefix}.name`,
      message: "Item name must be a string.",
    });
  }
  if (!nonNegInt(item.stock) || item.stock > CAPS.maxStock) {
    issues.push({
      path: `${prefix}.stock`,
      message: `Stock must be an integer from 0 to ${CAPS.maxStock}.`,
    });
  }
  if (!nonNegInt(item.buyPackSize) || item.buyPackSize > CAPS.maxBuyPackSize) {
    issues.push({
      path: `${prefix}.buyPackSize`,
      message: `Buy-pack size must be an integer from 0 to ${CAPS.maxBuyPackSize}. 0 means not for sale.`,
    });
  }
  if (
    !nonNegInt(item.buyPackPriceCents) ||
    item.buyPackPriceCents > CAPS.maxBudgetCents
  ) {
    issues.push({
      path: `${prefix}.buyPackPriceCents`,
      message: `Pack price must be an integer cent amount from 0 to ${CAPS.maxBudgetCents}.`,
    });
  }
  return !issues.some(
    (issue) => issue.path === prefix || issue.path.startsWith(`${prefix}.`),
  );
}

function checkKit(
  kit: unknown,
  index: number,
  itemIds: Set<string>,
  issues: ValidationIssue[],
): kit is Kit {
  if (!isRecord(kit)) {
    issues.push({ path: `kits[${index}]`, message: "Kit must be an object." });
    return false;
  }
  const prefix = `kits[${index}]`;
  if (typeof kit.id !== "string" || kit.id.length === 0) {
    issues.push({
      path: `${prefix}.id`,
      message: "Each kit needs a non-empty id.",
    });
  }
  if (typeof kit.name !== "string") {
    issues.push({
      path: `${prefix}.name`,
      message: "Kit name must be a string.",
    });
  }
  if (!nonNegInt(kit.demand) || kit.demand > CAPS.maxDemandPacks) {
    issues.push({
      path: `${prefix}.demand`,
      message: `Demand must be an integer from 0 to ${CAPS.maxDemandPacks}.`,
    });
  }
  if (!nonNegInt(kit.committedMin)) {
    issues.push({
      path: `${prefix}.committedMin`,
      message: "Committed minimum must be a non-negative integer.",
    });
  }
  if (
    nonNegInt(kit.demand) &&
    nonNegInt(kit.committedMin) &&
    kit.committedMin > kit.demand
  ) {
    issues.push({
      path: `${prefix}.committedMin`,
      message:
        "Committed minimum cannot exceed demand. KitBridge will not lower the minimum to fake feasibility.",
    });
  }
  if (!isRecord(kit.recipe)) {
    issues.push({
      path: `${prefix}.recipe`,
      message: "Recipe must be an object of item quantities.",
    });
  } else {
    for (const [itemId, qty] of Object.entries(kit.recipe)) {
      if (!itemIds.has(itemId)) {
        issues.push({
          path: `${prefix}.recipe.${itemId}`,
          message: "Recipe refers to an item that is not in inventory.",
        });
      }
      if (!nonNegInt(qty) || qty > CAPS.maxRecipeQty) {
        issues.push({
          path: `${prefix}.recipe.${itemId}`,
          message: `Recipe quantity must be an integer from 0 to ${CAPS.maxRecipeQty}.`,
        });
      }
    }
  }
  return !issues.some(
    (issue) => issue.path === prefix || issue.path.startsWith(`${prefix}.`),
  );
}

export function validateScenario(
  value: unknown,
  allowDraft = false,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path: "", message: "Scenario must be a JSON object." }];
  }
  if (value.version !== SCHEMA_VERSION) {
    issues.push({
      path: "version",
      message: `Unsupported scenario version. Expected ${SCHEMA_VERSION}.`,
    });
  }
  if (!Array.isArray(value.items)) {
    issues.push({ path: "items", message: "items must be an array." });
    return issues;
  }
  if (!Array.isArray(value.kits)) {
    issues.push({ path: "kits", message: "kits must be an array." });
    return issues;
  }
  if (!allowDraft && value.items.length === 0) {
    issues.push({ path: "items", message: "Add at least one inventory item." });
  }
  if (value.items.length > CAPS.maxItems) {
    issues.push({
      path: "items",
      message: `At most ${CAPS.maxItems} items are allowed.`,
    });
  }
  if (!allowDraft && value.kits.length === 0) {
    issues.push({ path: "kits", message: "Add at least one kit recipe." });
  }
  if (value.kits.length > CAPS.maxKits) {
    issues.push({
      path: "kits",
      message: `At most ${CAPS.maxKits} kit types are allowed.`,
    });
  }
  if (
    !nonNegInt(value.budgetCents) ||
    value.budgetCents > CAPS.maxBudgetCents
  ) {
    issues.push({
      path: "budgetCents",
      message: `Budget must be an integer from 0 to ${CAPS.maxBudgetCents} cents ($1000.00).`,
    });
  }
  if (value.label !== null && typeof value.label !== "string") {
    issues.push({ path: "label", message: "label must be a string or null." });
  }

  const itemIds = new Set<string>();
  for (const [index, item] of value.items.entries()) {
    if (
      checkItem(item, index, issues) &&
      isRecord(item) &&
      typeof item.id === "string"
    ) {
      if (itemIds.has(item.id)) {
        issues.push({
          path: `items[${index}].id`,
          message: "Item ids must be unique.",
        });
      }
      itemIds.add(item.id);
    }
  }

  const kitIds = new Set<string>();
  let demandSum = 0;
  for (const [index, kit] of value.kits.entries()) {
    if (checkKit(kit, index, itemIds, issues) && isRecord(kit)) {
      if (typeof kit.id === "string") {
        if (kitIds.has(kit.id)) {
          issues.push({
            path: `kits[${index}].id`,
            message: "Kit ids must be unique.",
          });
        }
        kitIds.add(kit.id);
      }
      if (typeof kit.demand === "number") demandSum += kit.demand;
      if (
        !allowDraft &&
        isRecord(kit.recipe) &&
        !Object.values(kit.recipe).some(
          (qty) => typeof qty === "number" && qty > 0,
        )
      ) {
        issues.push({
          path: `kits[${index}].recipe`,
          message: `Add at least one item to ${typeof kit.name === "string" ? kit.name : "this kit"}. An empty recipe cannot count as a complete kit.`,
        });
      }
    }
  }
  if (demandSum > CAPS.maxDemandPacks) {
    issues.push({
      path: "kits",
      message: `Total demand cannot exceed ${CAPS.maxDemandPacks} packs.`,
    });
  }

  return issues;
}

export function isValidScenario(
  value: unknown,
  allowDraft = false,
): value is Scenario {
  return validateScenario(value, allowDraft).length === 0;
}

export function formatIssues(issues: ValidationIssue[]): string {
  return issues
    .map((issue) =>
      issue.path ? `${issue.path}: ${issue.message}` : issue.message,
    )
    .join(" ");
}
