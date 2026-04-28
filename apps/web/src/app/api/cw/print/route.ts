import { NextRequest, NextResponse } from "next/server";
import { erpFetch } from "@/lib/csharp-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = await erpFetch("/api/cheque-writer/print-confirmations", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to confirm print" }, { status: 500 });
  }
}
