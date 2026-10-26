import { STORAGE_KEY } from "../constants";
import type { Scenario } from "../types";
import { parseScenarioJson } from "./io";

/** A saved drive this version could not open, kept so autosave cannot erase it. */
export const UNREADABLE_KEY = `${STORAGE_KEY}.unreadable`;

export function loadStoredScenario(): Scenario | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const result = parseScenarioJson(raw);
    if ("scenario" in result) return result.scenario;
  } catch {
    // Fall through and keep whatever was read.
  }
  if (raw) {
    try {
      localStorage.setItem(UNREADABLE_KEY, raw);
    } catch {
      // Nothing more can be done without storage.
    }
  }
  return null;
}

export function loadUnreadableDrive(): string | null {
  try {
    return localStorage.getItem(UNREADABLE_KEY);
  } catch {
    return null;
  }
}

export function clearUnreadableDrive(): void {
  try {
    localStorage.removeItem(UNREADABLE_KEY);
  } catch {
    // Already unavailable.
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
