import { STORAGE_KEY } from "../constants";
import type { Scenario } from "../types";
import { parseScenarioJson } from "./io";

/** Saved drives this version could not open, kept so autosave cannot erase them. */
export const UNREADABLE_KEY = `${STORAGE_KEY}.unreadable`;
const MAX_UNREADABLE = 5;

export interface StoredDrive {
  scenario: Scenario | null;
  /** The raw text of a drive that failed to open on this load. */
  unreadable: string | null;
  /** Whether that text was copied to UNREADABLE_KEY. */
  kept: boolean;
}

export function loadStoredDrive(): StoredDrive {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { scenario: null, unreadable: null, kept: false };
    const result = parseScenarioJson(raw);
    if ("scenario" in result) return { scenario: result.scenario, unreadable: null, kept: false };
  } catch {
    // Fall through and keep whatever was read.
  }
  if (!raw) return { scenario: null, unreadable: null, kept: false };
  const copies = loadUnreadableDrives().filter((copy) => copy !== raw);
  try {
    localStorage.setItem(UNREADABLE_KEY, JSON.stringify([...copies, raw].slice(-MAX_UNREADABLE)));
    return { scenario: null, unreadable: raw, kept: true };
  } catch {
    return { scenario: null, unreadable: raw, kept: false };
  }
}

export function loadUnreadableDrives(): string[] {
  let stored: string | null;
  try {
    stored = localStorage.getItem(UNREADABLE_KEY);
  } catch {
    return [];
  }
  if (stored === null) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every((copy) => typeof copy === "string")) return parsed;
  } catch {
    // A single copy saved before copies were kept as a list.
  }
  return [stored];
}

export function clearUnreadableDrives(): void {
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
