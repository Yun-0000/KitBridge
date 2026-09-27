import type { Scenario } from "../types";
import { formatIssues, isValidScenario, validateScenario } from "./validate";

export function exportScenarioJson(scenario: Scenario): string {
  return `${JSON.stringify(scenario, null, 2)}\n`;
}

export function parseScenarioJson(
  text: string,
): { scenario: Scenario } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      error: "That file is not valid JSON. Existing planner data was kept.",
    };
  }
  if (!isValidScenario(parsed, true)) {
    return {
      error: `Import rejected; existing planner data was kept. ${formatIssues(validateScenario(parsed, true))}`,
    };
  }
  return { scenario: parsed };
}

export function downloadText(
  filename: string,
  text: string,
  mime: string,
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
