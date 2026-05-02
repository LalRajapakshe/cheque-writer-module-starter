"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";
import type { ChequeLayout } from "@/lib/types";

const initial = {
  bankAccountCode: "BOC-CURRENT-001",
  layoutName: "BOC Standard Cheque",
  pageWidthMm: 180,
  pageHeightMm: 90,
  dateX: 135,
  dateY: 14,
  payeeX: 28,
  payeeY: 30,
  amountNumberX: 145,
  amountNumberY: 45,
  amountWordsX: 30,
  amountWordsY: 53,
  accountPayeeX: 22,
  accountPayeeY: 18,
  fontSize: 10,
};

export default function LayoutsPage() {
  const [rows, setRows] = useState<ChequeLayout[]>([]);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/cw/layouts", { cache: "no-store" });
    const payload = await response.json();
    if (payload.success) setRows(payload.data || []);
  }

  useEffect(() => { void load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/cw/layouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json();
    setMessage(payload.success ? "Layout saved." : payload.error || "Failed to save layout.");
    void load();
  }

  return (
    <AppShell title="Bank Cheque Layout Setup" description="Maintain bank-specific print coordinates for pre-printed cheque leaves.">
      <div className="grid">
        <div className="card">
          <form className="form" onSubmit={submit}>
            <div className="grid grid-3">
              {Object.entries(form).map(([key, value]) => (
                <label className="field" key={key}>
                  <span className="label">{key}</span>
                  <input className="input" type={typeof value === "number" ? "number" : "text"} value={String(value)} onChange={(e) => setForm({ ...form, [key]: typeof value === "number" ? Number(e.target.value) : e.target.value })} />
                </label>
              ))}
            </div>
            {message ? <div className="alert">{message}</div> : null}
            <button className="btn">Save Layout</button>
          </form>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Bank Account</th><th>Layout</th><th>Page</th><th>Date XY</th><th>Payee XY</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.layoutId}><td>{r.bankAccountCode}</td><td>{r.layoutName}</td><td>{r.pageWidthMm} x {r.pageHeightMm}</td><td>{r.dateX}, {r.dateY}</td><td>{r.payeeX}, {r.payeeY}</td><td>{r.isActive ? "Active" : "Inactive"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
