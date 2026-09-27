import { STORAGE_KEY } from "../constants";
import type { Scenario } from "../types";
import { parseScenarioJson } from "./io";

export function loadStoredScenario(): Scenario | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const result = parseScenarioJson(raw);
    return "scenario" in result ? result.scenario : null;
  } catch {
    return null;
  }
}

export function saveScenario(scenario: Scenario): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario));
    return true;
  } catch {
    // Keep editing available, but let the UI warn that backup is needed.
    return false;
  }
}

export function clearStoredScenario(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
