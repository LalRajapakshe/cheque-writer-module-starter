import AppShell from "@/components/app-shell";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" description="Initial cheque writer system module starter.">
      <div className="grid grid-3">
        <div className="card">
          <div className="muted">Pending vouchers</div>
          <div className="kpi">ERP</div>
          <p className="muted">Loaded from approved cheque payment vouchers through the C# ERP API.</p>
        </div>
        <div className="card">
          <div className="muted">Print control</div>
          <div className="kpi">cw.*</div>
          <p className="muted">Cheque book, layout, print register, and audit records are stored separately.</p>
        </div>
        <div className="card">
          <div className="muted">Login</div>
          <div className="kpi">ERP User</div>
          <p className="muted">Same ERP login/user table through a controlled stored procedure.</p>
        </div>
      </div>
    </AppShell>
  );
}
