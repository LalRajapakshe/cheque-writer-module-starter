import { NextRequest, NextResponse } from "next/server";
import { erpFetch } from "@/lib/csharp-client";

export async function GET(request: NextRequest) {
  try {
    const incoming = request.nextUrl.searchParams;
    const params = new URLSearchParams();

    for (const key of ["bankAccountCode", "fromDate", "toDate", "maxRows"]) {
      const value = incoming.get(key);
      if (value && value.trim()) params.set(key, value.trim());
    }

    const query = params.toString();
    const payload = await erpFetch(`/api/cheque-writer/vouchers${query ? `?${query}` : ""}`);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load vouchers" },
      { status: 500 }
    );
  }
}
