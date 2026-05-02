import { NextRequest, NextResponse } from "next/server";
import { erpFetch } from "@/lib/csharp-client";

type ChequeBookRouteParams = { chequeBookId: string };
type ChequeBookRouteContext = { params: ChequeBookRouteParams | Promise<ChequeBookRouteParams> };

export async function PUT(request: NextRequest, context: ChequeBookRouteContext) {
  const { chequeBookId } = await context.params;

  try {
    const body = await request.text();
    const payload = await erpFetch(`/api/cheque-writer/cheque-books/${encodeURIComponent(chequeBookId)}`, {
      method: "PUT",
      headers: { "Content-Type": request.headers.get("content-type") || "application/json" },
      body,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update cheque book",
      },
      { status: 500 },
    );
  }
}
