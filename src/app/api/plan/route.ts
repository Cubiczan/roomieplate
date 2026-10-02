import { createMealPlan } from "@/lib/create-plan";
import { PlanInputError, parsePlanRequest } from "@/lib/parse";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Send a JSON body." }, { status: 400 });
  }

  try {
    const planRequest = parsePlanRequest(body);
    const result = await createMealPlan(planRequest);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof PlanInputError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Could not build a meal plan.";
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
