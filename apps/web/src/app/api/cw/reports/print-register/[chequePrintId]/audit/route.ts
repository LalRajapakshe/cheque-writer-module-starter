import { NextRequest, NextResponse } from "next/server";
import { erpFetch } from "@/lib/csharp-client";

type RouteParams = { chequePrintId: string };
type RouteContext = { params: RouteParams | Promise<RouteParams> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { chequePrintId } = await context.params;

  try {
    const payload = await erpFetch(
      `/api/cheque-writer/print-register/${encodeURIComponent(chequePrintId)}/audit`,
    );
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load print audit" },
      { status: 500 },
    );
  }
}
