import { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./components/ui/dropdown-menu";
import { BoxIcon, NavArrowDownIcon } from "./components/icons";
import { AnswerBand, type PlanStatus } from "./components/AnswerBand";
import { DriveSheet } from "./components/DriveSheet";
import { PackingView, PrintSheets } from "./components/Packing";
import { buildCsv } from "./model/csv";
import { createExampleScenario } from "./model/example";
import { downloadText, exportScenarioJson, parseScenarioJson } from "./model/io";
import { newId } from "./model/ids";
import { limitingItems, purchasesFor } from "./model/insights";
import { createBlankScenario } from "./model/scenario";
import { loadStoredScenario, saveScenario } from "./model/storage";
import { describeIssues, validateScenario } from "./model/validate";
import {
  getSolverHealth,
  initSolver,
  solveScenario,
  subscribeSolverHealth,
  type SolverHealth,
} from "./solver/workerClient";
import type { Scenario, SolveOutcome } from "./types";

/** Results always remember the exact inputs they were computed from. */
type Solved = {
  scenario: Scenario;
  current: SolveOutcome | null;
  restock: SolveOutcome | null;
  issues: string[];
};

const SOLVE_DELAY_MS = 250;

export function App() {
  const [view, setView] = useState<"plan" | "packing">("plan");
  const [scenario, setScenario] = useState<Scenario>(
    () => loadStoredScenario() ?? createExampleScenario(),
  );
  const [health, setHealth] = useState<SolverHealth>(getSolverHealth);
  const [solved, setSolved] = useState<Solved | null>(null);
  const [saved, setSaved] = useState(true);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const latestSolve = useRef(0);

  useEffect(() => {
    const unsub = subscribeSolverHealth(setHealth);
    void initSolver();
    return unsub;
  }, []);

  useEffect(() => {
    setSaved(saveScenario(scenario));
  }, [scenario]);

  // Re-plan shortly after every edit. A finished attempt (even a timeout) is
  // not retried for the same inputs, so a worker restart cannot loop.
  useEffect(() => {
    if (health.state !== "ready" || solved?.scenario === scenario) return;
    const timer = window.setTimeout(() => void runSolve(scenario), SOLVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [scenario, health.state, solved]);

  async function runSolve(target: Scenario) {
    const token = ++latestSolve.current;
    const empty = target.items.length === 0 || target.kits.length === 0;
    const issues = empty ? [] : describeIssues(target, validateScenario(target));
    if (empty || issues.length) {
      setSolved({ scenario: target, current: null, restock: null, issues });
      return;
    }
    try {
      const current = await solveScenario(target, "current", newId("cur"));
      const restock = await solveScenario(target, "restock", newId("rst"));
      if (latestSolve.current === token) {
        setSolved({ scenario: target, current, restock, issues: [] });
      }
    } catch {
      if (latestSolve.current === token) {
        setSolved({
          scenario: target,
          current: null,
          restock: null,
          issues: ["The planner could not finish. Your inputs are kept; edit a value to try again."],
        });
      }
    }
  }

  function edit(next: Scenario) {
    setScenario(next);
    setMessage(null);
  }

  function loadSample() {
    edit(createExampleScenario());
    setMessage({ tone: "info", text: "Sample drive loaded." });
  }

  function startBlank() {
    if (!window.confirm("Start a new blank drive? This replaces the drive saved in this browser.")) {
      return;
    }
    setView("plan");
    edit(createBlankScenario());
  }

  function onImport(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseScenarioJson(typeof reader.result === "string" ? reader.result : "");
      if ("error" in parsed) {
        setMessage({ tone: "error", text: parsed.error });
        return;
      }
      edit(parsed.scenario);
      setMessage({ tone: "info", text: "Backup restored." });
    };
    reader.onerror = () =>
      setMessage({ tone: "error", text: "That file could not be read. Your drive is unchanged." });
    reader.readAsText(file);
  }

  const fresh = solved?.scenario === scenario;
  const current = solved?.current ?? null;
  const restock = solved?.restock ?? null;
  const now = current?.overallStatus === "Optimal" ? current : null;
  const after = restock?.overallStatus === "Optimal" ? restock : null;
  const canExport = fresh && (now !== null || after !== null);
  const status: PlanStatus =
    health.state === "load-failed"
      ? "failed"
      : health.state === "loading" && !solved
        ? "loading"
        : fresh
          ? "ready"
          : "updating";

  const shown = solved?.scenario ?? scenario;
  const limiting = new Set(now ? limitingItems(shown, now).map((item) => item.id) : []);
  const buys = new Map(
    after ? purchasesFor(shown, after).map((purchase) => [purchase.item.id, purchase]) : [],
  );
  const exportCsv = () =>
    downloadText("kitbridge-plan.csv", buildCsv(scenario, current, restock), "text/csv");

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to planner
      </a>
      <header className="app-header no-print">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <BoxIcon />
          </span>
          <span className="brand-name">KitBridge</span>
          <span className="brand-sep" aria-hidden="true">
            /
          </span>
          <span className="brand-drive">School supply drive</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">
              Drive
              <NavArrowDownIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={loadSample}>Load sample drive</DropdownMenuItem>
            <DropdownMenuItem onSelect={startBlank}>New blank drive</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                downloadText("kitbridge-drive.json", exportScenarioJson(scenario), "application/json")
              }
            >
              Download backup
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => importRef.current?.click()}>
              Restore from backup…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={importRef}
          hidden
          tabIndex={-1}
          type="file"
          accept="application/json,.json"
          aria-label="Backup file"
          onChange={(event) => {
            onImport(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </header>

      <main id="main" className="wrap no-print">
        {!saved ? (
          <div className="banner error" role="alert">
            This browser could not save your drive. Use Drive → Download backup before closing.
          </div>
        ) : null}
        {message ? (
          <div className={`banner ${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
            {message.text}
          </div>
        ) : null}

        {view === "plan" ? (
          <>
            <div className={fresh ? undefined : "is-stale"}>
              <AnswerBand
                scenario={shown}
                current={current}
                restock={restock}
                status={status}
                issues={solved?.issues ?? []}
                canExport={canExport}
                onOpenPacking={() => setView("packing")}
                onExportCsv={exportCsv}
                onLoadSample={loadSample}
              />
            </div>
            <DriveSheet scenario={scenario} limiting={limiting} buys={buys} onEdit={edit} />
          </>
        ) : (
          <PackingView
            scenario={shown}
            now={now}
            after={after}
            canExport={canExport}
            onExportCsv={exportCsv}
            onBack={() => setView("plan")}
          />
        )}
      </main>
      {canExport ? <PrintSheets scenario={scenario} now={now} after={after} /> : null}
    </>
  );
}
