import { NextRequest, NextResponse } from "next/server";
import { erpFetch } from "@/lib/csharp-client";

function buildBankAccountsPath(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return query
    ? `/api/cheque-writer/bank-accounts?${query}`
    : "/api/cheque-writer/bank-accounts";
}

export async function GET(request: NextRequest) {
  try {
    const payload = await erpFetch(buildBankAccountsPath(request));
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load bank accounts",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const payload = await erpFetch("/api/cheque-writer/bank-accounts/refresh", {
      method: "POST",
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to refresh bank accounts",
      },
      { status: 500 }
    );
  }
}
