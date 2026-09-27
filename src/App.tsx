import { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./components/ui/dropdown-menu";
import { BoxIcon } from "./components/icons";
import { Editors } from "./components/Editors";
import { PrintSheets, Results } from "./components/Results";
import { buildCsv } from "./model/csv";
import { createExampleScenario } from "./model/example";
import {
  downloadText,
  exportScenarioJson,
  parseScenarioJson,
} from "./model/io";
import {
  addItem,
  addKit,
  createBlankScenario,
  removeItem,
  removeKit,
  setRecipeQty,
  totalDemand,
  updateItem,
  updateKit,
} from "./model/scenario";
import {
  clearStoredScenario,
  loadStoredScenario,
  saveScenario,
} from "./model/storage";
import { formatIssues, validateScenario } from "./model/validate";
import { newId } from "./model/ids";
import {
  getSolverHealth,
  initSolver,
  solveScenario,
  subscribeSolverHealth,
  type SolverHealth,
} from "./solver/workerClient";
import type { Scenario, SolveOutcome } from "./types";

export function App() {
  const [step, setStep] = useState(0);
  const [view, setView] = useState("edit");
  const importRef = useRef<HTMLInputElement>(null);
  const latestSolve = useRef(0);
  const [startup] = useState(() => {
    const draft = loadStoredScenario();
    return { scenario: draft ?? createExampleScenario(), firstVisit: draft === null };
  });
  const [scenario, setScenario] = useState<Scenario>(startup.scenario);
  const startedInitialSolve = useRef(false);
  const [health, setHealth] = useState<SolverHealth>(getSolverHealth);
  const [solving, setSolving] = useState(false);
  const [stale, setStale] = useState(false);
  const [saved, setSaved] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [current, setCurrent] = useState<SolveOutcome | null>(null);
  const [restock, setRestock] = useState<SolveOutcome | null>(null);

  useEffect(() => {
    const unsub = subscribeSolverHealth(setHealth);
    void initSolver();
    return unsub;
  }, []);

  useEffect(() => {
    if (startup.firstVisit && !startedInitialSolve.current) {
      startedInitialSolve.current = true;
      void runSolve(startup.scenario);
    }
  }, []);

  useEffect(() => {
    setSaved(saveScenario(scenario));
  }, [scenario]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void runSolve();
      }
    };
    window.addEventListener("keyup", onKey);
    return () => window.removeEventListener("keyup", onKey);
  }); // rebind so Ctrl+Enter uses the latest scenario

  function invalidateStale() {
    latestSolve.current += 1;
    setSolving(false);
    setCurrent(null);
    setRestock(null);
    setStale(true);
  }

  function edit(next: Scenario) {
    invalidateStale();
    setScenario(next);
    setNotice(null);
  }

  async function runSolve(target: Scenario = scenario) {
    const issues = validateScenario(target);
    if (issues.length > 0) {
      setNotice(formatIssues(issues));
      setCurrent(null);
      setRestock(null);
      return;
    }
    const token = latestSolve.current + 1;
    latestSolve.current = token;
    setSolving(true);
    setCurrent(null);
    setRestock(null);
    setNotice(null);
    try {
      const currentResult = await solveScenario(
        target,
        "current",
        newId("cur"),
      );
      if (latestSolve.current !== token) return;
      const restockResult = await solveScenario(
        target,
        "restock",
        newId("rst"),
      );
      if (latestSolve.current !== token) return;
      setCurrent(currentResult);
      setRestock(restockResult);
      setStale(false);
    } catch {
      if (latestSolve.current === token)
        setNotice(
          "The planner could not finish. Your inputs are kept. Try again or reload the page.",
        );
    } finally {
      if (latestSolve.current === token) setSolving(false);
    }
  }

  function loadExample() {
    const next = createExampleScenario();
    setScenario(next);
    setStale(false);
    setNotice(null);
    void runSolve(next);
  }

  function startBlank() {
    setView("edit");
    setStep(0);
    edit(createBlankScenario());
    setNotice(
      "Add items and kits, or use a template.",
    );
  }

  function resetAll() {
    if (
      !window.confirm(
        "Reset clears saved planner data in this browser and returns to a blank start.",
      )
    ) {
      return;
    }
    clearStoredScenario();
    startBlank();
    setNotice("Local storage cleared.");
  }

  function onImport(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseScenarioJson(text);
      if ("error" in parsed) {
        setNotice(parsed.error);
        return;
      }
      edit(parsed.scenario);
      setNotice(
        "Import accepted. Previous results were cleared. Solve to recompute.",
      );
    };
    reader.onerror = () =>
      setNotice(
        "That file could not be read. Your current planner is unchanged.",
      );
    reader.readAsText(file);
  }

  const demand = totalDemand(scenario);
  const canExport =
    !stale &&
    !solving &&
    (current?.overallStatus === "Optimal" ||
      restock?.overallStatus === "Optimal");
  const hasInput = scenario.items.length > 0 && scenario.kits.length > 0;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to planner
      </a>
      <header className="app-header no-print">
        <a className="brand" href="#main" aria-label="KitBridge planner">
          <BoxIcon aria-hidden="true" />
          KitBridge
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Drive options</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={loadExample} disabled={solving}>
              Use template
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={startBlank}>
              Start a blank drive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                downloadText(
                  "kitbridge-scenario.json",
                  exportScenarioJson(scenario),
                  "application/json",
                )
              }
            >
              Save backup
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => importRef.current?.click()}>
              Import backup
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={resetAll}>
              Reset saved data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          ref={importRef}
          hidden
          tabIndex={-1}
          type="file"
          accept="application/json,.json"
          aria-label="Import backup file"
          onChange={(event) => {
            onImport(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </header>
      <main id="main" className="wrap no-print">
        <Tabs value={view} onValueChange={setView}>
          <div className="workspace-bar">
            <div>
              <h1>School supply drive</h1>
              <p className="workspace-meta">
                {demand} kits requested
              </p>
            </div>
            <TabsList aria-label="Planner view">
              <TabsTrigger value="edit">Edit drive</TabsTrigger>
              <TabsTrigger value="packing">Packing lists</TabsTrigger>
            </TabsList>
          </div>
          {!saved ? (
            <div className="banner warn" role="alert">
              This browser could not save your draft. Use Drive options → Save
              backup before closing.
            </div>
          ) : null}
          {notice ? (
            <div className="banner warn" role="alert">
              {notice}
            </div>
          ) : null}
          <TabsContent value="edit" forceMount hidden={view !== "edit"}>
            <div className="layout">
              <Card className="editor-card">
                <Editors
                  step={step}
                  onStep={setStep}
                  scenario={scenario}
                  onAddItem={() => edit(addItem(scenario))}
                  onAddKit={() => edit(addKit(scenario))}
                  onRemoveItem={(id) => edit(removeItem(scenario, id))}
                  onRemoveKit={(id) => edit(removeKit(scenario, id))}
                  onItemName={(id, name) =>
                    edit(updateItem(scenario, id, { name }))
                  }
                  onItemStock={(id, stock) =>
                    edit(updateItem(scenario, id, { stock }))
                  }
                  onItemPack={(id, buyPackSize) =>
                    edit(updateItem(scenario, id, { buyPackSize }))
                  }
                  onItemPrice={(id, buyPackPriceCents) =>
                    edit(updateItem(scenario, id, { buyPackPriceCents }))
                  }
                  onKitName={(id, name) =>
                    edit(updateKit(scenario, id, { name }))
                  }
                  onKitDemand={(id, demandValue) =>
                    edit(updateKit(scenario, id, { demand: demandValue }))
                  }
                  onKitMin={(id, committedMin) =>
                    edit(updateKit(scenario, id, { committedMin }))
                  }
                  onRecipe={(kitId, itemId, qty) =>
                    edit(setRecipeQty(scenario, kitId, itemId, qty))
                  }
                  onBudget={(budgetCents) =>
                    edit({ ...scenario, budgetCents, label: null })
                  }
                  onDirty={invalidateStale}
                />
                <div className="editor-actions">
                  <p className="save-status" role="status" aria-live="polite">
                    {health.state === "loading"
                      ? "Getting the planner ready…"
                      : health.state === "load-failed"
                        ? "Planner unavailable. Reload to try again."
                        : solving
                          ? "Finding your packing plan…"
                          : stale
                            ? "Inputs changed. Update your plan."
                            : saved
                              ? "Saved on this device"
                              : "Draft not saved."}
                  </p>
                  <Button
                    size="lg"
                    disabled={solving || !hasInput || health.state !== "ready"}
                    onClick={() => void runSolve()}
                  >
                    {solving ? "Planning…" : "Update plan"}
                  </Button>
                </div>
              </Card>
              <Results
                scenario={scenario}
                current={current}
                restock={restock}
                stale={stale}
                view="summary"
                onPacking={() => setView("packing")}
                onUseTemplate={loadExample}
              />
            </div>
          </TabsContent>
          <TabsContent value="packing" forceMount hidden={view !== "packing"}>
            <div className="packing-toolbar">
              <h2>Packing lists</h2>
              <div className="action-buttons">
                <Button
                  variant="secondary"
                  disabled={!canExport}
                  onClick={() =>
                    downloadText(
                      "kitbridge-plan.csv",
                      buildCsv(scenario, current, restock),
                      "text/csv",
                    )
                  }
                >
                  Export CSV
                </Button>
                <Button disabled={!canExport} onClick={() => window.print()}>
                  Print lists
                </Button>
              </div>
            </div>
            <Results
              scenario={scenario}
              current={current}
              restock={restock}
              stale={stale}
              view="packing"
              onPacking={() => setView("edit")}
              onUseTemplate={loadExample}
            />
          </TabsContent>
        </Tabs>
      </main>
      <PrintSheets scenario={scenario} current={current} restock={restock} />
    </>
  );
}
