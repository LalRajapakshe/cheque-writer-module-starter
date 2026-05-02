"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";
import type { ChequeBook } from "@/lib/types";

export default function ChequeBooksPage() {
  const [rows, setRows] = useState<ChequeBook[]>([]);
  const [form, setForm] = useState({ bankAccountCode: "BOC-CURRENT-001", bankAccountName: "BOC Current Account", bankName: "Bank of Ceylon", chequeBookNo: "CB-2026-001", startChequeNo: "000100", endChequeNo: "000199" });
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/cw/cheque-books", { cache: "no-store" });
    const payload = await response.json();
    if (payload.success) setRows(payload.data || []);
  }

  useEffect(() => { void load(); }, []);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/cw/cheque-books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json();
    setMessage(payload.success ? "Cheque book saved." : payload.error || "Failed to save cheque book.");
    void load();
  }


  return (
    <AppShell title="Cheque Book Master" description="Maintain cheque book ranges for bank accounts.">
      <div className="grid grid-2">
        <div className="card">
          <form className="form" onSubmit={submit}>
            {Object.entries(form).map(([key, value]) => (
              <label className="field" key={key}>
                <span className="label">{key}</span>
                <input className="input" value={value} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </label>
            ))}
            {message ? <div className="alert">{message}</div> : null}
            <button className="btn">Save Cheque Book</button>
          </form>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Existing Books</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Bank Account</th><th>Book</th><th>Range</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.chequeBookId}><td>{r.bankAccountCode}</td><td>{r.chequeBookNo}</td><td>{r.startChequeNo} - {r.endChequeNo}</td><td>{r.isActive ? "Active" : "Inactive"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
