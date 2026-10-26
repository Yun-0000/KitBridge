import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "../constants";
import { createExampleScenario } from "./example";
import {
  UNREADABLE_KEY,
  clearUnreadableDrives,
  loadStoredDrive,
  loadUnreadableDrives,
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

const newer = (marker: string) =>
  JSON.stringify({ ...createExampleScenario(), version: 2, label: marker });

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
    expect(loadStoredDrive()).toEqual({ scenario, unreadable: null, kept: false });
    expect(loadUnreadableDrives()).toEqual([]);
  });

  it("reopens drafts the editor can save", () => {
    const promiseAboveWant = createExampleScenario();
    promiseAboveWant.kits[0].demand = 2;
    const overTotal = createExampleScenario();
    overTotal.kits[0].demand = 100;
    for (const draft of [promiseAboveWant, overTotal]) {
      saveScenario(draft);
      expect(loadStoredDrive().scenario).toEqual(draft);
    }
    expect(loadUnreadableDrives()).toEqual([]);
  });

  it("keeps a drive it cannot open before autosave replaces it", () => {
    localStorage.setItem(STORAGE_KEY, newer("A"));

    expect(loadStoredDrive()).toEqual({ scenario: null, unreadable: newer("A"), kept: true });
    saveScenario(createExampleScenario());

    expect(loadStoredDrive().unreadable).toBeNull();
    expect(loadUnreadableDrives()).toEqual([newer("A")]);

    clearUnreadableDrives();
    expect(localStorage.getItem(UNREADABLE_KEY)).toBeNull();
  });

  it("keeps text that is not JSON at all", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadStoredDrive().unreadable).toBe("{not json");
    expect(loadUnreadableDrives()).toEqual(["{not json"]);
  });

  it("keeps both drives when a second one fails before the first is handled", () => {
    localStorage.setItem(STORAGE_KEY, newer("A"));
    loadStoredDrive();
    localStorage.setItem(STORAGE_KEY, newer("B"));
    loadStoredDrive();
    expect(loadUnreadableDrives()).toEqual([newer("A"), newer("B")]);
  });

  it("does not file the same drive twice when loading repeats", () => {
    localStorage.setItem(STORAGE_KEY, newer("A"));
    loadStoredDrive();
    loadStoredDrive();
    expect(loadUnreadableDrives()).toEqual([newer("A")]);
  });

  it("reads a single copy saved in the earlier format", () => {
    localStorage.setItem(UNREADABLE_KEY, "{not json");
    expect(loadUnreadableDrives()).toEqual(["{not json"]);
    localStorage.setItem(STORAGE_KEY, newer("B"));
    loadStoredDrive();
    expect(loadUnreadableDrives()).toEqual(["{not json", newer("B")]);
  });

  it("still returns the text when the copy cannot be stored", () => {
    localStorage.setItem(STORAGE_KEY, newer("A"));
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(loadStoredDrive()).toEqual({ scenario: null, unreadable: newer("A"), kept: false });
    setItem.mockRestore();
  });

  it("starts empty without filing anything", () => {
    expect(loadStoredDrive()).toEqual({ scenario: null, unreadable: null, kept: false });
    expect(loadUnreadableDrives()).toEqual([]);
  });
});
