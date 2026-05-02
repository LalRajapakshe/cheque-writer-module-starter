"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiListResponse, BankAccountDto } from "@/types/bank-account";
import { formatBankAccountLabel } from "@/types/bank-account";

type BankAccountComboProps = {
  value?: string | null;
  onChange: (bankAccountCode: string, account?: BankAccountDto) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /**
   * Use true on the Bank Layout screen.
   * New layout: layoutId undefined/null -> excludes accounts already used by an active layout.
   * Edit layout: pass current layoutId -> includes current layout account.
   */
  availableForLayout?: boolean;
  layoutId?: number | string | null;
  includeRefreshButton?: boolean;
  helperText?: string;
};

export function BankAccountCombo({
  value,
  onChange,
  label = "Bank account",
  required = true,
  disabled = false,
  availableForLayout = false,
  layoutId,
  includeRefreshButton = true,
  helperText,
}: BankAccountComboProps) {
  const [accounts, setAccounts] = useState<BankAccountDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (availableForLayout) params.set("availableForLayout", "true");
    if (availableForLayout && layoutId !== undefined && layoutId !== null && `${layoutId}`.trim() !== "") {
      params.set("layoutId", `${layoutId}`);
    }
    const query = params.toString();
    return query ? `/api/bank-accounts?${query}` : "/api/bank-accounts";
  }, [availableForLayout, layoutId]);

  async function loadAccounts() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(url, { cache: "no-store" });
      const payload = (await response.json()) as ApiListResponse<BankAccountDto>;
      if (!response.ok || !payload.success) {
        setAccounts([]);
        setMessage(payload.error || payload.message || "Unable to load bank accounts.");
        return;
      }
      setAccounts(payload.data ?? []);
    } catch {
      setAccounts([]);
      setMessage("Unable to load bank accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAccounts() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/bank-accounts", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        setMessage(payload?.error || payload?.message || "Unable to refresh bank accounts.");
        return;
      }
      await loadAccounts();
    } catch {
      setMessage("Unable to refresh bank accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, [url]);

  const selectedAccount = accounts.find((account) => account.bankAccountCode === value);

  return (
    <div className="field">
      <label className="label">
        {label}
        {required ? " *" : ""}
      </label>
      <div className="actions" style={{ alignItems: "stretch" }}>
        <select
          className="input"
          value={value ?? ""}
          disabled={disabled || loading}
          required={required}
          onChange={(event) => {
            const code = event.target.value;
            const account = accounts.find((item) => item.bankAccountCode === code);
            onChange(code, account);
          }}
        >
          <option value="">{loading ? "Loading bank accounts..." : "Select bank account"}</option>
          {accounts.map((account) => (
            <option key={account.bankAccountCode} value={account.bankAccountCode}>
              {formatBankAccountLabel(account)}
            </option>
          ))}
        </select>
        {includeRefreshButton ? (
          <button type="button" className="btn secondary" onClick={() => void refreshAccounts()} disabled={disabled || loading}>
            Refresh
          </button>
        ) : null}
      </div>
      {selectedAccount ? (
        <p className="muted" style={{ margin: 0 }}>
          {selectedAccount.bankName || "Bank"}
          {selectedAccount.branchName ? ` / ${selectedAccount.branchName}` : ""}
          {selectedAccount.currencyCode ? ` / ${selectedAccount.currencyCode}` : ""}
        </p>
      ) : helperText ? (
        <p className="muted" style={{ margin: 0 }}>{helperText}</p>
      ) : null}
      {message ? <div className="alert error">{message}</div> : null}
    </div>
  );
}
