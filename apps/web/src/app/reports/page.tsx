import AppShell from "@/components/app-shell";

export default function ReportsPage() {
  return (
    <AppShell title="Reports" description="Initial placeholders for cheque register and audit reports.">
      <div className="grid grid-2">
        <div className="card"><h2>Cheque Print Register</h2><p className="muted">Voucher no, cheque no, bank, payee, amount, printed by, printed date.</p></div>
        <div className="card"><h2>Audit Log</h2><p className="muted">Preview, print, reprint, void, cancel, failed print actions.</p></div>
        <div className="card"><h2>Cheque Book Usage</h2><p className="muted">Used, unused, printed, and voided cheque leaf ranges.</p></div>
        <div className="card"><h2>Bank-wise Register</h2><p className="muted">Cheque register by bank account and date range.</p></div>
      </div>
    </AppShell>
  );
}
