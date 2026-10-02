import { DISCLAIMER } from "@/lib/types";
import { ollamaConfig, completeWithOllama, extractJson } from "@/lib/ollama";
import { assertPlanIsSafe, buildFixturePlan } from "@/lib/planner";
import { repairOllamaPlan } from "@/lib/repair";
import type { PlanOrigin, PlanRequest, WeekPlan } from "@/lib/types";

export interface PlanResult {
  plan: WeekPlan;
  source: PlanOrigin;
  model: string;
  baseUrl: string;
  ollamaError: string | null;
  disclaimer: string;
}

function fixtureResult(request: PlanRequest, model: string, baseUrl: string, ollamaError: string): PlanResult {
  const plan = buildFixturePlan(request);
  plan.model = model;
  assertPlanIsSafe(plan, request.profile);
  return {
    plan,
    source: "offline-fixtures",
    model,
    baseUrl,
    ollamaError,
    disclaimer: DISCLAIMER,
  };
}

export async function createMealPlan(request: PlanRequest): Promise<PlanResult> {
  const { model, baseUrl } = ollamaConfig();
  try {
    const content = await completeWithOllama(request);
    const repaired = repairOllamaPlan(extractJson(content), request, model);
    if (!repaired) {
      return fixtureResult(request, model, baseUrl, "The local model did not return a usable allergen-safe plan.");
    }
    assertPlanIsSafe(repaired, request.profile);
    return {
      plan: repaired,
      source: "ollama",
      model,
      baseUrl,
      ollamaError: null,
      disclaimer: DISCLAIMER,
    };
  } catch (error) {
    return fixtureResult(request, model, baseUrl, friendlyOllamaError(error));
  }
}

function friendlyOllamaError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const cause = error instanceof Error ? error.cause : undefined;
  const causeMessage = cause instanceof Error ? cause.message : "";
  const causeCode =
    cause && typeof cause === "object" && "code" in cause ? String((cause as { code?: unknown }).code ?? "") : "";
  const combined = `${message} ${causeMessage} ${causeCode}`;
  if (/abort/i.test(combined)) return "Ollama took too long to answer.";
  if (/ECONNREFUSED|ENOTFOUND|fetch failed|network/i.test(combined)) {
    return "Ollama is not running on this machine.";
  }
  return message || "Ollama is unreachable.";
}
