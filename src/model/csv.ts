import { formatUsd } from "./money";
import { purchasable } from "./scenario";
import type { Scenario } from "../types";
import type { SolveOutcome } from "../types";

function csvEscape(value: string | number): string {
  const raw = String(value);
  const text =
    typeof value === "string" && /^[\s]*[=+@-]|^[\t\r\n]/.test(raw)
      ? `'${raw}`
      : raw;
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function buildCsv(
  scenario: Scenario,
  current: SolveOutcome | null,
  restock: SolveOutcome | null,
): string {
  const lines: string[] = [
    ["section", "name", "qty", "detail"].map(csvEscape).join(","),
  ];

  const push = (
    section: string,
    name: string,
    qty: string | number,
    detail: string,
  ) => {
    lines.push([section, name, qty, detail].map(csvEscape).join(","));
  };

  push("meta", "generated-at", new Date().toISOString(), "planning snapshot");
  if (scenario.label) push("meta", "label", "", scenario.label);
  push("meta", "budget", formatUsd(scenario.budgetCents), "planning estimate");

  if (current) {
    push("current", "status", current.overallStatus, current.message);
    if (current.overallStatus === "Optimal") {
      for (const kit of scenario.kits) {
        push(
          "current-kit",
          kit.name,
          current.kits[kit.id] ?? 0,
          `unmet ${current.unmet[kit.id] ?? 0}`,
        );
      }
      for (const item of scenario.items) {
        push(
          "current-item",
          item.name,
          current.consumption[item.id] ?? 0,
          `remain ${current.remainder[item.id] ?? 0} of stock ${item.stock}`,
        );
      }
    }
  }

  if (restock) {
    push("restock", "status", restock.overallStatus, restock.message);
    if (restock.overallStatus === "Optimal") {
      push(
        "restock",
        "purchase-cost",
        formatUsd(restock.costCents),
        "proposed; supplies not received",
      );
      for (const kit of scenario.kits) {
        push(
          "restock-kit",
          kit.name,
          restock.kits[kit.id] ?? 0,
          `unmet ${restock.unmet[kit.id] ?? 0}`,
        );
      }
      for (const item of scenario.items) {
        const packs = restock.buys[item.id] ?? 0;
        if (packs > 0 && purchasable(item)) {
          push(
            "shop",
            item.name,
            packs,
            `${packs * item.buyPackSize} units @ ${formatUsd(item.buyPackPriceCents)} per pack`,
          );
        }
      }
    }
  }

  return `${lines.join("\n")}\n`;
}
