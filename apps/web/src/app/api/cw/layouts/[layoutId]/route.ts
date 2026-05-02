import { NextRequest, NextResponse } from "next/server";
import { erpFetch } from "@/lib/csharp-client";

type LayoutRouteParams = { layoutId: string };
type LayoutRouteContext = { params: LayoutRouteParams | Promise<LayoutRouteParams> };

export async function PUT(request: NextRequest, context: LayoutRouteContext) {
  const { layoutId } = await context.params;

  try {
    const body = await request.text();
    const payload = await erpFetch(`/api/cheque-writer/layouts/${encodeURIComponent(layoutId)}`, {
      method: "PUT",
      headers: { "Content-Type": request.headers.get("content-type") || "application/json" },
      body,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update cheque layout",
      },
      { status: 500 },
    );
  }
}
