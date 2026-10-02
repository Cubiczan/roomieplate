import { checkOllama } from "@/lib/ollama";
import { NextResponse } from "next/server";

export async function GET() {
  const status = await checkOllama();
  return NextResponse.json(status);
}
