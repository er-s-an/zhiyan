import { normalizeDesign } from "../compile";
import type { ResearchDesign } from "../types";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export async function readGate(request: Request): Promise<{ design: ResearchDesign; record: Record<string, unknown> } | Response> {
  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  if (record.confirmed !== true) {
    return json({ error: "Confirm the design before retrieval.", code: "CONFIRM_REQUIRED" }, 400);
  }
  try {
    const design = normalizeDesign(record.design as ResearchDesign);
    return { design, record };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DESIGN_INVALID";
    return json({ error: message, code: message }, 400);
  }
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
