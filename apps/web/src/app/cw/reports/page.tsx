"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";
import { formatMoney } from "@/lib/money";

type ApiPayload<T> = { success: boolean; data?: T; error?: string };

type PrintRegisterRow = {
  chequePrintId: number;
  voucherNo: string;
  voucherDate?: string | null;
  companyCode?: string | null;
  branchCode?: string | null;
  bankAccountCode: string;
  bankAccountName?: string | null;
  chequeNo: string;
  chequeDate?: string | null;
  payeeName: string;
  amount: number;
  amountInWords?: string | null;
  chequeBookId?: number | null;
  layoutId?: number | null;
  printStatus?: string | null;
  printCount?: number | null;
  reprintCount?: number | null;
  printedBy?: string | null;
  printedDate?: string | null;
  lastReprintedBy?: string | null;
  lastReprintedDate?: string | null;
  lastReprintReason?: string | null;
  voidedBy?: string | null;
  voidedDate?: string | null;
  voidReason?: string | null;
};

type PrintAuditRow = {
  auditLogId: number;
  chequePrintId?: number | null;
  voucherNo?: string | null;
  bankAccountCode?: string | null;
  chequeNo?: string | null;
  actionName: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  actionBy?: string | null;
  actionDate?: string | null;
  reason?: string | null;
  remarks?: string | null;
};

type ReportMode = "REGISTER" | "REPRINTED" | "VOIDED" | "AUDIT";

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function thirtyDaysAgoIso() {
  const now = new Date();
  now.setDate(now.getDate() - 30);
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 19);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statusOf(row: PrintRegisterRow) {
  return (row.printStatus || "PRINTED").toUpperCase();
}

function canReprint(row: PrintRegisterRow) {
  return statusOf(row) !== "VOIDED";
}

function canVoid(row: PrintRegisterRow) {
  return statusOf(row) !== "VOIDED";
}

export default function ReportsPage() {
  const [rows, setRows] = useState<PrintRegisterRow[]>([]);
  const [auditRows, setAuditRows] = useState<PrintAuditRow[]>([]);
  const [mode, setMode] = useState<ReportMode>("REGISTER");
  const [selectedAudit, setSelectedAudit] = useState<PrintRegisterRow | null>(null);
  const [selectedReprint, setSelectedReprint] = useState<PrintRegisterRow | null>(null);
  const [reprintReason, setReprintReason] = useState("");
  const [fromDate, setFromDate] = useState(thirtyDaysAgoIso());
  const [toDate, setToDate] = useState(todayIso());
  const [bankAccountCode, setBankAccountCode] = useState("");
  const [search, setSearch] = useState("");
  const [maxRows, setMaxRows] = useState("500");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedStatus = useMemo(() => {
    if (mode === "REPRINTED") return "REPRINTED";
    if (mode === "VOIDED") return "VOIDED";
    return "ALL";
  }, [mode]);

  async function loadRegister(nextMode: ReportMode = mode) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const params = new URLSearchParams();
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (bankAccountCode.trim()) params.set("bankAccountCode", bankAccountCode.trim());
    if (search.trim()) params.set("search", search.trim());
    if (maxRows) params.set("maxRows", maxRows);
    if (nextMode === "REPRINTED") params.set("status", "REPRINTED");
    else if (nextMode === "VOIDED") params.set("status", "VOIDED");
    else params.set("status", "ALL");

    try {
      const response = await fetch(`/api/cw/reports/print-register?${params.toString()}`, { cache: "no-store" });
      const payload: ApiPayload<PrintRegisterRow[]> = await response.json();
      if (!response.ok || !payload.success) {
        setRows([]);
        setError(payload.error || "Failed to load print register");
        return;
      }
      setRows(payload.data || []);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Failed to load print register");
    } finally {
      setLoading(false);
    }
  }

  async function loadAudit(row: PrintRegisterRow) {
    setSelectedAudit(row);
    setMode("AUDIT");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/cw/reports/print-register/${row.chequePrintId}/audit`, { cache: "no-store" });
      const payload: ApiPayload<PrintAuditRow[]> = await response.json();
      if (!response.ok || !payload.success) {
        setAuditRows([]);
        setError(payload.error || "Failed to load audit trail");
        return;
      }
      setAuditRows(payload.data || []);
    } catch (err) {
      setAuditRows([]);
      setError(err instanceof Error ? err.message : "Failed to load audit trail");
    }
  }

  function startReprint(row: PrintRegisterRow) {
    setSelectedReprint(row);
    setReprintReason("");
    setError(null);
    setMessage(null);
  }

  async function confirmReprint() {
    if (!selectedReprint) return;
    if (!reprintReason.trim()) {
      setError("Reprint reason is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/cw/reports/print-register/${selectedReprint.chequePrintId}/reprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reprintReason.trim() }),
      });
      const payload: ApiPayload<unknown> = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload.error || "Failed to confirm reprint");
        return;
      }
      setMessage(`Reprint logged for voucher ${selectedReprint.voucherNo}.`);
      setSelectedReprint(null);
      setReprintReason("");
      await loadRegister(mode === "AUDIT" ? "REGISTER" : mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm reprint");
    } finally {
      setSaving(false);
    }
  }

  async function voidCheque(row: PrintRegisterRow) {
    const reason = window.prompt(`Reason for voiding cheque ${row.chequeNo} / voucher ${row.voucherNo}`);
    if (!reason || !reason.trim()) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/cw/reports/print-register/${row.chequePrintId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const payload: ApiPayload<unknown> = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload.error || "Failed to void cheque");
        return;
      }
      setMessage(`Cheque ${row.chequeNo} was voided.`);
      await loadRegister(mode === "AUDIT" ? "REGISTER" : mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void cheque");
    } finally {
      setSaving(false);
    }
  }

  function currentReportTitle() {
    if (mode === "REPRINTED") return "Reprint Audit Report";
    if (mode === "VOIDED") return "Voided Cheque Report";
    if (mode === "AUDIT") return "Cheque Audit Trail";
    return "Printed Cheque Register";
  }

  function printReport() {
    setError(null);

    const reportTitle = currentReportTitle();
    const generatedAt = formatDateTime(new Date().toISOString());
    const period = `${fromDate || "-"} to ${toDate || "-"}`;

    let bodyHtml = "";

    if (mode === "AUDIT") {
      if (!selectedAudit) {
        setError("Select a cheque row and click Audit before printing the audit trail.");
        return;
      }

      const auditBody = auditRows.map((row) => `
        <tr>
          <td>${escapeHtml(formatDateTime(row.actionDate))}</td>
          <td>${escapeHtml(row.actionName)}</td>
          <td>${escapeHtml(row.oldStatus || "-")}</td>
          <td>${escapeHtml(row.newStatus || "-")}</td>
          <td>${escapeHtml(row.actionBy || "-")}</td>
          <td>${escapeHtml(row.reason || "-")}</td>
          <td>${escapeHtml(row.remarks || "-")}</td>
        </tr>`).join("");

      bodyHtml = `
        <section class="meta">
          <div><strong>Voucher:</strong> ${escapeHtml(selectedAudit.voucherNo)}</div>
          <div><strong>Bank:</strong> ${escapeHtml(selectedAudit.bankAccountCode)}</div>
          <div><strong>Cheque No:</strong> ${escapeHtml(selectedAudit.chequeNo)}</div>
          <div><strong>Payee:</strong> ${escapeHtml(selectedAudit.payeeName)}</div>
        </section>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Old Status</th>
              <th>New Status</th>
              <th>User</th>
              <th>Reason</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>${auditBody || `<tr><td colspan="7">No audit records found.</td></tr>`}</tbody>
        </table>`;
    } else {
      if (rows.length === 0) {
        setError("Load a report with records before printing.");
        return;
      }

      const registerBody = rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.voucherNo)}</td>
          <td>${escapeHtml(formatDateTime(row.printedDate))}</td>
          <td>${escapeHtml(row.bankAccountCode)}</td>
          <td>${escapeHtml(row.chequeNo)}</td>
          <td>${escapeHtml(row.payeeName)}</td>
          <td class="amount">${escapeHtml(formatMoney(row.amount, "LKR"))}</td>
          <td>${escapeHtml(statusOf(row))}</td>
          <td>${escapeHtml(row.printCount || 1)}${row.reprintCount ? ` (${escapeHtml(row.reprintCount)} reprint)` : ""}</td>
          <td>${escapeHtml(row.printedBy || "-")}</td>
          <td>${escapeHtml(row.lastReprintReason || row.voidReason || "-")}</td>
        </tr>`).join("");

      bodyHtml = `
        <section class="meta">
          <div><strong>Period:</strong> ${escapeHtml(period)}</div>
          <div><strong>Bank filter:</strong> ${escapeHtml(bankAccountCode || "All")}</div>
          <div><strong>Search:</strong> ${escapeHtml(search || "-")}</div>
          <div><strong>Rows:</strong> ${escapeHtml(rows.length)}</div>
        </section>
        <table>
          <thead>
            <tr>
              <th>Voucher No</th>
              <th>Printed Date</th>
              <th>Bank</th>
              <th>Cheque No</th>
              <th>Payee</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Print Count</th>
              <th>Printed By</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>${registerBody}</tbody>
          <tfoot>
            <tr>
              <td colspan="5"><strong>Total</strong></td>
              <td class="amount"><strong>${escapeHtml(formatMoney(summary.totalAmount, "LKR"))}</strong></td>
              <td colspan="4"></td>
            </tr>
          </tfoot>
        </table>`;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      setError("Print window was blocked. Allow pop-ups for this site and try again.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .subtitle { margin: 0 0 18px; color: #555; font-size: 12px; }
    .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px 16px; margin: 0 0 16px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #999; padding: 6px 7px; text-align: left; vertical-align: top; }
    th { background: #f1f1f1; }
    .amount { text-align: right; white-space: nowrap; }
    tfoot td { background: #f7f7f7; }
    @page { size: landscape; margin: 12mm; }
  </style>
</head>
<body>
  <h1>${escapeHtml(reportTitle)}</h1>
  <p class="subtitle">Generated ${escapeHtml(generatedAt)}</p>
  ${bodyHtml}
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  useEffect(() => {
    void loadRegister("REGISTER");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const voided = rows.filter((row) => statusOf(row) === "VOIDED").length;
    const reprinted = rows.filter((row) => Number(row.reprintCount || 0) > 0).length;
    return { total: rows.length, totalAmount, voided, reprinted };
  }, [rows]);

  return (
    <AppShell title="Reports" description="Printed cheque register, reprint, void, and audit reports.">
      <div className="grid">
        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert">{message}</div> : null}

        <div className="grid grid-2 no-print">
          <button className="card" type="button" onClick={() => { setMode("REGISTER"); void loadRegister("REGISTER"); }} style={{ textAlign: "left" }}>
            <h2>Printed Cheque Register</h2>
            <p className="muted">All printed cheques by date, bank, voucher, payee, amount, and printed user.</p>
          </button>
          <button className="card" type="button" onClick={() => { setMode("REPRINTED"); void loadRegister("REPRINTED"); }} style={{ textAlign: "left" }}>
            <h2>Reprint Audit Report</h2>
            <p className="muted">Cheques reprinted with reprint count, reason, user, and date.</p>
          </button>
          <button className="card" type="button" onClick={() => { setMode("VOIDED"); void loadRegister("VOIDED"); }} style={{ textAlign: "left" }}>
            <h2>Voided Cheque Report</h2>
            <p className="muted">Voided cheques with void reason, voided by, and voided date.</p>
          </button>
          <button className="card" type="button" onClick={() => setMode("AUDIT")} style={{ textAlign: "left" }}>
            <h2>Cheque Audit Trail</h2>
            <p className="muted">Select a cheque row and click Audit to view print, reprint, and void actions.</p>
          </button>
        </div>

        <div className="card no-print">
          <h2 style={{ marginTop: 0 }}>Report filters</h2>
          <div className="form-grid">
            <label>From date
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </label>
            <label>To date
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </label>
            <label>Bank account
              <input value={bankAccountCode} onChange={(event) => setBankAccountCode(event.target.value)} placeholder="Optional" />
            </label>
            <label>Status
              <select value={selectedStatus} onChange={(event) => { const value = event.target.value as "ALL" | "REPRINTED" | "VOIDED"; const nextMode = value === "REPRINTED" ? "REPRINTED" : value === "VOIDED" ? "VOIDED" : "REGISTER"; setMode(nextMode); }}>
                <option value="ALL">All</option>
                <option value="REPRINTED">Reprinted</option>
                <option value="VOIDED">Voided</option>
              </select>
            </label>
            <label>Search
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Voucher / payee / cheque no" />
            </label>
            <label>Maximum rows
              <input type="number" min="1" max="2000" value={maxRows} onChange={(event) => setMaxRows(event.target.value)} />
            </label>
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => void loadRegister(mode)} disabled={loading}>{loading ? "Loading..." : "Load Report"}</button>
            <button className="btn secondary" onClick={printReport}>Print Report</button>
          </div>
        </div>

        <div className="grid grid-2 no-print">
          <div className="card"><h2>{summary.total}</h2><p className="muted">Rows loaded</p></div>
          <div className="card"><h2>{formatMoney(summary.totalAmount, "LKR")}</h2><p className="muted">Loaded amount total</p></div>
          <div className="card"><h2>{summary.reprinted}</h2><p className="muted">Reprinted cheques</p></div>
          <div className="card"><h2>{summary.voided}</h2><p className="muted">Voided cheques</p></div>
        </div>

        {selectedReprint ? (
          <div className="card print-area">
            <div className="no-print actions" style={{ justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0 }}>Reprint Cheque</h2>
                <p className="desc">Print the cheque again first, then confirm reprint with a reason.</p>
              </div>
              <div className="actions">
                <button className="btn secondary" onClick={() => window.print()}>Print</button>
                <button className="btn" onClick={confirmReprint} disabled={saving}>{saving ? "Saving..." : "Confirm Reprint"}</button>
                <button className="btn secondary" onClick={() => setSelectedReprint(null)}>Close</button>
              </div>
            </div>
            <label className="no-print">Reprint reason
              <textarea value={reprintReason} onChange={(event) => setReprintReason(event.target.value)} placeholder="Required reason" rows={3} />
            </label>
            <div className="cheque-preview">
              <div className="cheque-field" style={{ left: 540, top: 56 }}>{formatDate(selectedReprint.chequeDate)}</div>
              <div className="cheque-field" style={{ left: 112, top: 118 }}>{selectedReprint.payeeName}</div>
              <div className="cheque-field" style={{ left: 588, top: 182 }}>{formatMoney(selectedReprint.amount, "LKR")}</div>
              <div className="cheque-field" style={{ left: 120, top: 212, maxWidth: 470, whiteSpace: "normal" }}>{selectedReprint.amountInWords || "Amount in words"}</div>
              <div className="cheque-field" style={{ left: 84, top: 74 }}>A/C PAYEE ONLY</div>
            </div>
          </div>
        ) : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Voucher No</th>
                <th>Printed Date</th>
                <th>Bank</th>
                <th>Cheque No</th>
                <th>Payee</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Print Count</th>
                <th>Printed By</th>
                <th className="no-print">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.chequePrintId}>
                  <td>{row.voucherNo}</td>
                  <td>{formatDateTime(row.printedDate)}</td>
                  <td>{row.bankAccountCode}</td>
                  <td>{row.chequeNo}</td>
                  <td>{row.payeeName}</td>
                  <td>{formatMoney(row.amount, "LKR")}</td>
                  <td><span className="badge">{statusOf(row)}</span></td>
                  <td>{row.printCount || 1}{row.reprintCount ? ` (${row.reprintCount} reprint)` : ""}</td>
                  <td>{row.printedBy || "-"}</td>
                  <td className="no-print">
                    <div className="actions">
                      <button className="btn secondary" onClick={() => void loadAudit(row)}>Audit</button>
                      <button className="btn secondary" onClick={() => startReprint(row)} disabled={!canReprint(row)}>Reprint</button>
                      <button className="btn secondary" onClick={() => void voidCheque(row)} disabled={!canVoid(row) || saving}>Void</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={10}>No records found for the selected filters.</td></tr> : null}
            </tbody>
          </table>
        </div>

        {mode === "AUDIT" ? (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Cheque Audit Trail {selectedAudit ? `- ${selectedAudit.voucherNo}` : ""}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Old Status</th>
                    <th>New Status</th>
                    <th>User</th>
                    <th>Reason</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((row) => (
                    <tr key={row.auditLogId}>
                      <td>{formatDateTime(row.actionDate)}</td>
                      <td>{row.actionName}</td>
                      <td>{row.oldStatus || "-"}</td>
                      <td>{row.newStatus || "-"}</td>
                      <td>{row.actionBy || "-"}</td>
                      <td>{row.reason || "-"}</td>
                      <td>{row.remarks || "-"}</td>
                    </tr>
                  ))}
                  {auditRows.length === 0 ? <tr><td colSpan={7}>Select a cheque row and click Audit.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
