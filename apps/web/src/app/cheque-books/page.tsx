"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AppShell from "@/components/app-shell";
import type { ChequeBook } from "@/lib/types";

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

type ChequeBookRow = ChequeBook & {
  chequeBookId: number;
  bankAccountName?: string | null;
  bankName?: string | null;
  isUsed?: boolean;
  printCount?: number;
  isActive?: boolean;
};

type ChequeBookFormState = {
  chequeBookId?: number | null;
  bankAccountCode: string;
  bankAccountName?: string | null;
  bankName?: string | null;
  chequeBookNo: string;
  startChequeNo: string;
  endChequeNo: string;
  isActive: boolean;
  isUsed: boolean;
};

const initial: ChequeBookFormState = {
  chequeBookId: null,
  bankAccountCode: "",
  bankAccountName: null,
  bankName: null,
  chequeBookNo: "",
  startChequeNo: "",
  endChequeNo: "",
  isActive: true,
  isUsed: false,
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

export default function ChequeBooksPage() {
  const [rows, setRows] = useState<ChequeBookRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [form, setForm] = useState<ChequeBookFormState>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(form.chequeBookId);
  const lockBankAccount = Boolean(form.chequeBookId && form.isUsed);

  const selectedAccount = useMemo(
    () => bankAccounts.find((account) => account.bankAccountCode === form.bankAccountCode),
    [bankAccounts, form.bankAccountCode],
  );

  async function loadChequeBooks() {
    const data = await readList<ChequeBookRow>("/api/cw/cheque-books");
    setRows(data);
  }

  async function loadBankAccounts() {
    const data = await readList<BankAccount>("/api/bank-accounts");
    setBankAccounts(data);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadChequeBooks(), loadBankAccounts()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cheque books.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function startNew() {
    setMessage(null);
    setError(null);
    setForm(initial);
    await loadBankAccounts();
  }

  function editChequeBook(book: ChequeBookRow) {
    setMessage(null);
    setError(null);
    setForm({
      chequeBookId: book.chequeBookId,
      bankAccountCode: book.bankAccountCode ?? "",
      bankAccountName: book.bankAccountName ?? null,
      bankName: book.bankName ?? null,
      chequeBookNo: book.chequeBookNo ?? "",
      startChequeNo: String(book.startChequeNo ?? ""),
      endChequeNo: String(book.endChequeNo ?? ""),
      isActive: book.isActive ?? true,
      isUsed: Boolean(book.isUsed ?? ((book.printCount ?? 0) > 0)),
    });
  }

  function updateField(key: keyof ChequeBookFormState, value: string | boolean) {
    setForm({ ...form, [key]: value });
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
      bankAccountCode: form.bankAccountCode,
      bankAccountName: selectedAccount?.bankAccountName ?? form.bankAccountName ?? null,
      bankName: selectedAccount?.bankName ?? form.bankName ?? null,
      chequeBookNo: form.chequeBookNo.trim() || null,
      startChequeNo: form.startChequeNo.trim(),
      endChequeNo: form.endChequeNo.trim(),
      isActive: form.isActive,
    };

    try {
      if (form.chequeBookId) {
        await writeApi(`/api/cw/cheque-books/${form.chequeBookId}`, "PUT", payload);
        setMessage("Cheque book updated.");
      } else {
        await writeApi("/api/cw/cheque-books", "POST", payload);
        setMessage("Cheque book saved.");
      }
      await loadChequeBooks();
      await startNew();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cheque book.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Cheque Book Master" description="Maintain cheque book ranges for bank accounts.">
      <div className="grid grid-2">
        <div className="card">
          <div className="actions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <strong>{isEditing ? "Edit cheque book" : "Add new cheque book"}</strong>
            <button type="button" className="btn secondary" onClick={() => void startNew()} disabled={saving}>Add New / Clear</button>
          </div>

          <form className="form" onSubmit={submit}>
            <label className="field">
              <span className="label">Bank account</span>
              <select
                className="input"
                value={form.bankAccountCode}
                disabled={lockBankAccount}
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
                {lockBankAccount ? "This cheque book has print history, so the bank account cannot be changed." : "Select the active bank account for this cheque book."}
              </small>
            </label>

            <label className="field">
              <span className="label">Cheque book no</span>
              <input className="input" value={form.chequeBookNo} onChange={(e) => updateField("chequeBookNo", e.target.value)} />
            </label>

            <label className="field">
              <span className="label">Start cheque no</span>
              <input className="input" value={form.startChequeNo} onChange={(e) => updateField("startChequeNo", e.target.value)} required />
            </label>

            <label className="field">
              <span className="label">End cheque no</span>
              <input className="input" value={form.endChequeNo} onChange={(e) => updateField("endChequeNo", e.target.value)} required />
            </label>

            <label className="field">
              <span className="label">Active</span>
              <select className="input" value={form.isActive ? "true" : "false"} onChange={(e) => updateField("isActive", e.target.value === "true")}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>

            {error ? <div className="alert error">{error}</div> : null}
            {message ? <div className="alert">{message}</div> : null}
            <button className="btn" disabled={saving}>{saving ? "Saving..." : isEditing ? "Update Cheque Book" : "Save Cheque Book"}</button>
          </form>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Existing Books</h2>
          {loading ? <div className="alert">Loading cheque books...</div> : null}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Bank Account</th><th>Book</th><th>Range</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.chequeBookId}>
                    <td>{r.bankAccountCode}</td>
                    <td>{r.chequeBookNo}</td>
                    <td>{r.startChequeNo} - {r.endChequeNo}</td>
                    <td>{r.isActive ? "Active" : "Inactive"}</td>
                    <td><button type="button" className="btn secondary" onClick={() => editChequeBook(r)}>Edit</button></td>
                  </tr>
                ))}
                {!loading && rows.length === 0 ? <tr><td colSpan={5}>No cheque books found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
