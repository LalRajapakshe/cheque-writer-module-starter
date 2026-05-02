"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app-shell";
import { formatMoney } from "@/lib/money";
import { amountToWords } from "@/lib/amount-to-words";
import type { Voucher } from "@/lib/types";

type QueueVoucher = Voucher & {
  bankAccountSetupStatus?: string | null;
  canPrint?: boolean | null;
};

type Payload = { success: boolean; data?: QueueVoucher[]; error?: string };

function getVoucherSetupStatus(voucher: QueueVoucher): string {
  return voucher.bankAccountSetupStatus?.trim() || "UNKNOWN";
}

function isVoucherReadyToPrint(voucher: QueueVoucher): boolean {
  return voucher.canPrint === true && getVoucherSetupStatus(voucher) === "READY";
}

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<QueueVoucher[]>([]);
  const [selected, setSelected] = useState<QueueVoucher | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState("");
  const [bankAccountCode, setBankAccountCode] = useState("");
  const [search, setSearch] = useState("");
  const [maxRows, setMaxRows] = useState("200");

  const filteredVouchers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vouchers;
    return vouchers.filter((v) =>
      [v.voucherNo, v.payeeName, v.chequeNo, v.bankAccountCode, v.bankAccountName]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(term))
    );
  }, [search, vouchers]);

  async function load() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const params = new URLSearchParams();
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (bankAccountCode.trim()) params.set("bankAccountCode", bankAccountCode.trim());
    if (maxRows) params.set("maxRows", maxRows);

    try {
      const response = await fetch(`/api/cw/vouchers?${params.toString()}`, { cache: "no-store" });
      const payload: Payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload.error || "Failed to load vouchers");
        setVouchers([]);
        return;
      }
      setVouchers(payload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vouchers");
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmPrint() {
    if (!selected) return;
    if (!isVoucherReadyToPrint(selected)) {
      setError(`Voucher is not ready for printing: ${getVoucherSetupStatus(selected)}`);
      return;
    }
    setMessage(null);
    setError(null);
    const response = await fetch("/api/cw/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voucherNo: selected.voucherNo,
        printedSuccessfully: true,
        amountInWords: amountToWords(selected.amount),
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload.error || "Could not confirm print");
      return;
    }
    setMessage(`Cheque print confirmed for voucher ${selected.voucherNo}.`);
    setSelected(null);
    void load();
  }

  return (
    <AppShell title="Pending Cheque Vouchers" description="Approved cheque payment vouchers retrieved from ERP.">
      <div className="grid">
        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert">{message}</div> : null}

        <div className="card no-print">
          <h2 style={{ marginTop: 0 }}>Voucher filters</h2>
          <div className="form-grid">
            <label>From date
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label>To date
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
            <label>Bank account
              <input value={bankAccountCode} onChange={(e) => setBankAccountCode(e.target.value)} placeholder="Optional" />
            </label>
            <label>Maximum rows
              <input type="number" min="1" max="1000" value={maxRows} onChange={(e) => setMaxRows(e.target.value)} />
            </label>
            <label>Search loaded rows
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Voucher / payee / cheque no" />
            </label>
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn" onClick={load} disabled={loading}>{loading ? "Loading..." : "Load Vouchers"}</button>
            <button className="btn secondary" onClick={() => { setFromDate(todayIso()); setToDate(""); setBankAccountCode(""); setSearch(""); setMaxRows("200"); }}>Reset Filters</button>
          </div>
          <p className="muted">Default load is from today only. Use a date range only when needed to avoid loading a very large voucher history.</p>
        </div>

        <div className="table-wrap no-print">
          <table>
            <thead>
              <tr>
                <th>Voucher No</th>
                <th>Date</th>
                <th>Payee</th>
                <th>Amount</th>
                <th>Bank</th>
                <th>Cheque No</th>
                <th>Cheque Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.map((v, index) => (
                <tr key={`${v.voucherNo}-${v.bankAccountCode || ""}-${v.chequeNo || ""}-${index}`}>
                  <td>{v.voucherNo}</td>
                  <td>{v.voucherDate}</td>
                  <td>{v.payeeName}</td>
                  <td>{formatMoney(v.amount, v.currencyCode)}</td>
                  <td>{v.bankAccountCode}</td>
                  <td>{v.chequeNo}</td>
                  <td>{v.chequeDate}</td>
                  <td>
                    <span className="badge">{getVoucherSetupStatus(v)}</span>
                  </td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => setSelected(v)}
                      disabled={!isVoucherReadyToPrint(v)}
                      title={isVoucherReadyToPrint(v) ? "Preview / Print" : getVoucherSetupStatus(v)}
                    >
                      Preview / Print
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVouchers.length === 0 ? (
                <tr><td colSpan={9}>No pending approved cheque vouchers found for the selected filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="muted no-print">Loaded {filteredVouchers.length} of {vouchers.length} voucher(s).</p>

        {selected ? (
          <div className="card print-area">
            <div className="no-print actions" style={{ justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0 }}>Cheque Preview</h2>
                <p className="desc">Print on pre-printed cheque leaf, then confirm only after successful print.</p>
              </div>
              <div className="actions">
                <button className="btn secondary" onClick={() => window.print()}>Print</button>
                <button className="btn" onClick={confirmPrint}>Confirm Printed</button>
                <button className="btn secondary" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
            <div className="cheque-preview">
              <div className="cheque-field" style={{ left: 540, top: 56 }}>{selected.chequeDate}</div>
              <div className="cheque-field" style={{ left: 112, top: 118 }}>{selected.payeeName}</div>
              <div className="cheque-field" style={{ left: 588, top: 182 }}>{formatMoney(selected.amount, selected.currencyCode)}</div>
              <div className="cheque-field" style={{ left: 120, top: 212, maxWidth: 470, whiteSpace: "normal" }}>{amountToWords(selected.amount)}</div>
              <div className="cheque-field" style={{ left: 84, top: 74 }}>A/C PAYEE ONLY</div>
            </div>
            <p className="muted no-print">Layout coordinates are sample values. Adjust them in Bank Layout Setup per bank.</p>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
