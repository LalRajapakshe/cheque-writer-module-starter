export type BankAccountDto = {
  bankAccountCode: string;
  bankAccountName?: string | null;
  bankName?: string | null;
  branchCode?: string | null;
  branchName?: string | null;
  currencyCode?: string | null;
  companyCode?: string | null;
  isActive?: boolean;
  lastSyncedDate?: string | null;
};

export type ApiListResponse<T> = {
  success: boolean;
  data?: T[];
  error?: string;
  message?: string;
};

export function formatBankAccountLabel(account: BankAccountDto) {
  const parts = [
    account.bankAccountCode,
    account.bankName,
    account.branchName,
    account.bankAccountName,
  ].filter(Boolean);

  return parts.join(" - ");
}
