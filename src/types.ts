import type { SCHEMA_VERSION } from "./constants";

export type ItemId = string;
export type KitId = string;

export interface Item {
  id: ItemId;
  name: string;
  stock: number;
  buyPackSize: number;
  buyPackPriceCents: number;
}

export interface Kit {
  id: KitId;
  name: string;
  demand: number;
  committedMin: number;
  recipe: Record<ItemId, number>;
}

export interface Scenario {
  version: typeof SCHEMA_VERSION;
  items: Item[];
  kits: Kit[];
  budgetCents: number;
  label: string | null;
}

export type SolverStatus =
  | "Optimal"
  | "Infeasible"
  | "Timeout"
  | "LoadFailed"
  | "Error";

export type HighsPhaseStatus = string;

export interface PhaseResult {
  status: SolverStatus;
  highsStatus: HighsPhaseStatus | null;
  objective: number | null;
  message: string | null;
}

export interface SolveOutcome {
  requestId: string;
  mode: SolveMode;
  overallStatus: SolverStatus;
  message: string;
  phase1: PhaseResult;
  phase2: PhaseResult | null;
  kits: Record<KitId, number>;
  buys: Record<ItemId, number>;
  costCents: number;
  consumption: Record<ItemId, number>;
  remainder: Record<ItemId, number>;
  unmet: Record<KitId, number>;
  elapsedMs: number;
}

export type SolveMode = "current" | "restock";

export interface SolveRequest {
  requestId: string;
  scenario: Scenario;
  mode: SolveMode;
  remainingMs: number;
}

export interface WorkerHello {
  type: "ready" | "load-failed";
  message?: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface BaselinePlan {
  kits: Record<KitId, number>;
  consumption: Record<ItemId, number>;
  remainder: Record<ItemId, number>;
  unmet: Record<KitId, number>;
  totalKits: number;
  feasibleMins: boolean;
}
