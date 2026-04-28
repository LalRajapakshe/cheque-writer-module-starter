import { NextRequest, NextResponse } from "next/server";
import { erpFetch } from "@/lib/csharp-client";

export async function GET() {
  try {
    const payload = await erpFetch("/api/cheque-writer/cheque-books");
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to load cheque books" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = await erpFetch("/api/cheque-writer/cheque-books", { method: "POST", body: JSON.stringify(body) });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to save cheque book" }, { status: 500 });
  }
}
