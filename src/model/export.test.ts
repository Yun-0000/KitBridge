import { describe, expect, it } from "vitest";
import loadHighs from "highs";
import { createExampleScenario, withBackpackStock } from "./example";
import { createBlankScenario, addItem } from "./scenario";
import { exportScenarioJson, parseScenarioJson } from "./io";
import { validateScenario } from "./validate";
import { buildCsv } from "./csv";
import { runTwoPhase } from "../solver/runTwoPhase";
const highs = await loadHighs();

describe("usable exports and drafts", () => {
  it("preserves inventory and drive labels when importing a backup", () => {
    const template = createExampleScenario();
    expect(parseScenarioJson(exportScenarioJson(template))).toEqual({ scenario: template });
    const custom = { ...template, label: "September supply drive" };
    expect(parseScenarioJson(exportScenarioJson(custom))).toEqual({ scenario: custom });
  });
  it("round-trips an unfinished draft but blocks solving it", () => {
    const draft = addItem(createBlankScenario());
    expect(parseScenarioJson(exportScenarioJson(draft))).toEqual({
      scenario: draft,
    });
    expect(validateScenario(draft).length).toBeGreaterThan(0);
  });
  it("neutralizes spreadsheet formulas and quotes multiline names", () => {
    const scenario = createExampleScenario();
    scenario.items[0].name = "=1+1";
    scenario.kits[0].name = 'Grade "A",\r\nclass';
    const result = runTwoPhase(highs, {
      scenario,
      mode: "current",
      requestId: "csv",
      remainingMs: 2000,
    });
    const csv = buildCsv(scenario, result, null);
    expect(csv).toContain("current-item,'=1+1,");
    expect(csv).toContain('"Grade ""A"",\r\nclass"');
  });
  it("exports failure status without fabricating zero-kit packing rows", () => {
    const scenario = withBackpackStock(createExampleScenario(), 7);
    const result = runTwoPhase(highs, {
      scenario,
      mode: "current",
      requestId: "bad-csv",
      remainingMs: 2000,
    });
    const csv = buildCsv(scenario, result, null);
    expect(csv).toContain("Infeasible");
    expect(csv).not.toContain("current-kit");
    expect(csv).not.toContain("current-item");
  });
});
