import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import type { PlanRequest } from "@/lib/types";

export function ollamaConfig(): { baseUrl: string; model: string } {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "gemma2:2b";
  return { baseUrl, model };
}

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

export function describeOllamaFailure(error: unknown): string {
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

export async function checkOllama(timeoutMs = 1800): Promise<{
  ok: boolean;
  model: string;
  baseUrl: string;
  error: string | null;
}> {
  const { baseUrl, model } = ollamaConfig();
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/tags`, { method: "GET" }, timeoutMs);
    if (!response.ok) {
      return { ok: false, model, baseUrl, error: `Ollama responded with ${response.status}.` };
    }
    return { ok: true, model, baseUrl, error: null };
  } catch (error) {
    return {
      ok: false,
      model,
      baseUrl,
      error: describeOllamaFailure(error),
    };
  }
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Models sometimes wrap JSON in a fence or a sentence.
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]);
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("The local model did not return JSON.");
}

function messageContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as {
    choices?: { message?: { content?: unknown } }[];
    message?: { content?: unknown };
  };
  const openAi = record.choices?.[0]?.message?.content;
  const native = record.message?.content;
  const content = openAi ?? native;
  return typeof content === "string" ? content : "";
}

export async function completeWithOllama(request: PlanRequest, timeoutMs = 20000): Promise<string> {
  const { baseUrl, model } = ollamaConfig();
  const messages = [
    { role: "system", content: buildSystemPrompt(request) },
    { role: "user", content: buildUserPrompt(request) },
  ];
  const headers = { "Content-Type": "application/json" };
  const openAiUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
  const openAiResponse = await fetchWithTimeout(
    openAiUrl,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0.2,
        max_tokens: 2800,
        messages,
      }),
    },
    timeoutMs,
  );

  if (openAiResponse.ok) {
    const content = messageContent(await openAiResponse.json());
    if (content.trim()) return content;
  }

  const nativeRoot = baseUrl.replace(/\/v1$/, "");
  const nativeResponse = await fetchWithTimeout(
    `${nativeRoot}/api/chat`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages,
        options: { temperature: 0.2, num_predict: 2800 },
      }),
    },
    timeoutMs,
  );

  if (!nativeResponse.ok) {
    throw new Error(`Ollama returned ${nativeResponse.status}.`);
  }
  const content = messageContent(await nativeResponse.json());
  if (!content.trim()) throw new Error("Ollama returned an empty plan.");
  return content;
}
