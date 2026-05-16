import { NextRequest, NextResponse } from "next/server";
import { erpFetch } from "@/lib/csharp-client";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.toString();
    const path = query
      ? `/api/cheque-writer/print-register?${query}`
      : "/api/cheque-writer/print-register";
    const payload = await erpFetch(path);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load print register" },
      { status: 500 },
    );
  }
}
