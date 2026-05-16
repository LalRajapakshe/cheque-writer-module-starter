import { NextRequest, NextResponse } from "next/server";
import { erpFetch } from "@/lib/csharp-client";

type RouteParams = { chequePrintId: string };
type RouteContext = { params: RouteParams | Promise<RouteParams> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { chequePrintId } = await context.params;

  try {
    const body = await request.text();
    const payload = await erpFetch(
      `/api/cheque-writer/print-register/${encodeURIComponent(chequePrintId)}/void`,
      {
        method: "POST",
        headers: { "Content-Type": request.headers.get("content-type") || "application/json" },
        body,
      },
    );
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to void cheque" },
      { status: 500 },
    );
  }
}
