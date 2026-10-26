import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "../constants";
import { createExampleScenario } from "./example";
import {
  UNREADABLE_KEY,
  clearUnreadableDrive,
  loadStoredScenario,
  loadUnreadableDrive,
  saveScenario,
} from "./storage";

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

describe("saved drive", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", fakeStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips a valid drive and keeps no spare copy", () => {
    const scenario = createExampleScenario();
    expect(saveScenario(scenario)).toBe(true);
    expect(loadStoredScenario()).toEqual(scenario);
    expect(loadUnreadableDrive()).toBeNull();
  });

  it("keeps a drive it cannot open before autosave replaces it", () => {
    const newer = JSON.stringify({ ...createExampleScenario(), version: 2 });
    localStorage.setItem(STORAGE_KEY, newer);

    expect(loadStoredScenario()).toBeNull();
    saveScenario(createExampleScenario());

    expect(loadUnreadableDrive()).toBe(newer);
    expect(loadStoredScenario()).not.toBeNull();
    expect(loadUnreadableDrive()).toBe(newer);

    clearUnreadableDrive();
    expect(localStorage.getItem(UNREADABLE_KEY)).toBeNull();
  });

  it("keeps text that is not JSON at all", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadStoredScenario()).toBeNull();
    expect(loadUnreadableDrive()).toBe("{not json");
  });

  it("starts empty without filing anything", () => {
    expect(loadStoredScenario()).toBeNull();
    expect(loadUnreadableDrive()).toBeNull();
  });
});
