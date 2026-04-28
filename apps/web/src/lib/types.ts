export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type Voucher = {
  voucherNo: string;
  voucherDate: string;
  companyCode?: string;
  branchCode?: string;
  payeeCode?: string;
  payeeName: string;
  amount: number;
  currencyCode: string;
  bankAccountCode: string;
  bankAccountName?: string;
  chequeNo: string;
  chequeDate: string;
  voucherStatus: string;
  approvedBy?: string;
  approvedDate?: string;
  printStatus?: string;
};

export type ChequeBook = {
  chequeBookId: number;
  bankAccountCode: string;
  bankAccountName?: string;
  bankName?: string;
  chequeBookNo?: string;
  startChequeNo: string;
  endChequeNo: string;
  isActive: boolean;
};

export type ChequeLayout = {
  layoutId: number;
  bankAccountCode: string;
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
  accountPayeeX?: number;
  accountPayeeY?: number;
  fontSize: number;
  isActive: boolean;
};
