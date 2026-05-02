"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AppShell from "@/components/app-shell";
import type { ChequeLayout } from "@/lib/types";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error?: string; message?: string };

type BankAccount = {
  bankAccountCode: string;
  bankAccountName?: string | null;
  bankName?: string | null;
  branchCode?: string | null;
  branchName?: string | null;
  currencyCode?: string | null;
  isActive?: boolean;
};

type ChequeLayoutRow = ChequeLayout & {
  layoutId: number;
  bankAccountName?: string | null;
  bankName?: string | null;
  accountPayeeX?: number | null;
  accountPayeeY?: number | null;
  fontSize?: number | null;
  isActive?: boolean;
};

type LayoutFormState = {
  layoutId?: number | null;
  bankAccountCode: string;
  bankAccountName?: string | null;
  bankName?: string | null;
  layoutName: string;
  pageWidthMm: number;
  pageHeightMm: number;
  dateX: number;
  dateY: number;
  payeeX: number;
  payeeY: number;
  amountNumberX: number;
  amountNumberY: number;
  amountWordsX: number;
  amountWordsY: number;
  accountPayeeX: number;
  accountPayeeY: number;
  fontSize: number;
  isActive?: boolean;
};

const initial: LayoutFormState = {
  layoutId: null,
  bankAccountCode: "",
  bankAccountName: null,
  bankName: null,
  layoutName: "",
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
  isActive: true,
};

function accountLabel(account: BankAccount): string {
  return [account.bankAccountCode, account.bankName, account.branchName, account.bankAccountName]
    .filter(Boolean)
    .join(" - ");
}

async function readList<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as ApiResponse<T[]> | T[];

  if (!response.ok) {
    const message = typeof payload === "object" && payload && "error" in payload
      ? String((payload as { error?: string }).error || (payload as { message?: string }).message || "Request failed.")
      : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  if (typeof payload === "object" && payload && "success" in payload) {
    if ((payload as ApiResponse<T[]>).success) return (payload as { success: true; data: T[] }).data || [];
    throw new Error((payload as { success: false; error?: string; message?: string }).error || (payload as { success: false; error?: string; message?: string }).message || "Request failed.");
  }

  return Array.isArray(payload) ? payload : [];
}

async function writeApi(url: string, method: "POST" | "PUT", body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `Request failed: ${response.status}`);
  }

  return payload;
}

export default function LayoutsPage() {
  const [rows, setRows] = useState<ChequeLayoutRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [form, setForm] = useState<LayoutFormState>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(form.layoutId);

  const selectedAccount = useMemo(
    () => bankAccounts.find((account) => account.bankAccountCode === form.bankAccountCode),
    [bankAccounts, form.bankAccountCode],
  );

  async function loadLayouts() {
    const data = await readList<ChequeLayoutRow>("/api/cw/layouts");
    setRows(data);
  }

  async function loadBankAccounts(layoutId?: number | null) {
    const params = new URLSearchParams({ availableForLayout: "true" });
    if (layoutId) params.set("layoutId", String(layoutId));
    const data = await readList<BankAccount>(`/api/bank-accounts?${params.toString()}`);
    setBankAccounts(data);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadLayouts(), loadBankAccounts(null)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cheque layouts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function startNew() {
    setMessage(null);
    setError(null);
    setForm(initial);
    await loadBankAccounts(null);
  }

  async function editLayout(layout: ChequeLayoutRow) {
    setMessage(null);
    setError(null);
    await loadBankAccounts(layout.layoutId);
    setForm({
      layoutId: layout.layoutId,
      bankAccountCode: layout.bankAccountCode ?? "",
      bankAccountName: layout.bankAccountName ?? null,
      bankName: layout.bankName ?? null,
      layoutName: layout.layoutName ?? "",
      pageWidthMm: Number(layout.pageWidthMm ?? 180),
      pageHeightMm: Number(layout.pageHeightMm ?? 90),
      dateX: Number(layout.dateX ?? 135),
      dateY: Number(layout.dateY ?? 14),
      payeeX: Number(layout.payeeX ?? 28),
      payeeY: Number(layout.payeeY ?? 30),
      amountNumberX: Number(layout.amountNumberX ?? 145),
      amountNumberY: Number(layout.amountNumberY ?? 45),
      amountWordsX: Number(layout.amountWordsX ?? 30),
      amountWordsY: Number(layout.amountWordsY ?? 53),
      accountPayeeX: Number(layout.accountPayeeX ?? 22),
      accountPayeeY: Number(layout.accountPayeeY ?? 18),
      fontSize: Number(layout.fontSize ?? 10),
      isActive: layout.isActive ?? true,
    });
  }

  function updateField(key: keyof LayoutFormState, value: string) {
    const currentValue = form[key];
    setForm({
      ...form,
      [key]: typeof currentValue === "number" ? Number(value) : value,
    });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    if (!form.bankAccountCode.trim()) {
      setSaving(false);
      setError("Bank account is required.");
      return;
    }

    const payload = {
      ...form,
      bankAccountCode: form.bankAccountCode,
      bankAccountName: selectedAccount?.bankAccountName ?? form.bankAccountName ?? null,
      bankName: selectedAccount?.bankName ?? form.bankName ?? null,
    };

    try {
      if (form.layoutId) {
        await writeApi(`/api/cw/layouts/${form.layoutId}`, "PUT", payload);
        setMessage("Layout updated.");
      } else {
        await writeApi("/api/cw/layouts", "POST", payload);
        setMessage("Layout saved.");
      }
      await loadLayouts();
      await startNew();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save layout.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Bank Cheque Layout Setup" description="Maintain bank-specific print coordinates for pre-printed cheque leaves.">
      <div className="grid">
        <div className="card">
          <div className="actions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <strong>{isEditing ? "Edit cheque layout" : "Add new cheque layout"}</strong>
            <button type="button" className="btn secondary" onClick={() => void startNew()} disabled={saving}>Add New / Clear</button>
          </div>

          <form className="form" onSubmit={submit}>
            <div className="grid grid-3">
              <label className="field">
                <span className="label">Bank account</span>
                <select
                  className="input"
                  value={form.bankAccountCode}
                  required
                  onChange={(event) => {
                    const account = bankAccounts.find((item) => item.bankAccountCode === event.target.value);
                    setForm({
                      ...form,
                      bankAccountCode: event.target.value,
                      bankAccountName: account?.bankAccountName ?? null,
                      bankName: account?.bankName ?? null,
                    });
                  }}
                >
                  <option value="">Select bank account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.bankAccountCode} value={account.bankAccountCode}>{accountLabel(account)}</option>
                  ))}
                </select>
                <small className="muted">
                  {isEditing ? "Edit mode includes this layout's current bank account." : "New mode hides accounts already used by active layouts."}
                </small>
              </label>

              <label className="field">
                <span className="label">Layout name</span>
                <input className="input" value={form.layoutName} onChange={(e) => updateField("layoutName", e.target.value)} required />
              </label>

              <label className="field">
                <span className="label">Active</span>
                <select className="input" value={form.isActive ? "true" : "false"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>

              {([
                ["pageWidthMm", "Page width mm"],
                ["pageHeightMm", "Page height mm"],
                ["dateX", "Date X"],
                ["dateY", "Date Y"],
                ["payeeX", "Payee X"],
                ["payeeY", "Payee Y"],
                ["amountNumberX", "Amount number X"],
                ["amountNumberY", "Amount number Y"],
                ["amountWordsX", "Amount words X"],
                ["amountWordsY", "Amount words Y"],
                ["accountPayeeX", "Account payee X"],
                ["accountPayeeY", "Account payee Y"],
                ["fontSize", "Font size"],
              ] as Array<[keyof LayoutFormState, string]>).map(([key, label]) => (
                <label className="field" key={String(key)}>
                  <span className="label">{label}</span>
                  <input className="input" type="number" value={String(form[key] ?? "")} onChange={(e) => updateField(key, e.target.value)} />
                </label>
              ))}
            </div>
            {error ? <div className="alert error">{error}</div> : null}
            {message ? <div className="alert">{message}</div> : null}
            <button className="btn" disabled={saving}>{saving ? "Saving..." : isEditing ? "Update Layout" : "Save Layout"}</button>
          </form>
        </div>
        <div className="table-wrap">
          {loading ? <div className="alert">Loading layouts...</div> : null}
          <table>
            <thead><tr><th>Bank Account</th><th>Layout</th><th>Page</th><th>Date XY</th><th>Payee XY</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.layoutId}>
                  <td>{r.bankAccountCode}</td>
                  <td>{r.layoutName}</td>
                  <td>{r.pageWidthMm} x {r.pageHeightMm}</td>
                  <td>{r.dateX}, {r.dateY}</td>
                  <td>{r.payeeX}, {r.payeeY}</td>
                  <td>{r.isActive ? "Active" : "Inactive"}</td>
                  <td><button type="button" className="btn secondary" onClick={() => void editLayout(r)}>Edit</button></td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? <tr><td colSpan={7}>No layouts found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
