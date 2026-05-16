import Link from "next/link";
import { BookOpen, FileText, LayoutDashboard, Printer, Settings } from "lucide-react";
import LogoutButton from "@/components/logout-button";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vouchers", label: "Voucher Queue", icon: FileText },
  { href: "/cheque-books", label: "Cheque Books", icon: BookOpen },
  { href: "/layouts", label: "Bank Layouts", icon: Settings },
  { href: "/cw/reports", label: "Reports", icon: Printer },
];

export default function AppShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Cheque Writer</div>
        <div className="brand-sub">Separate ERP-integrated cheque printing and audit module.</div>
        <nav className="nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <LogoutButton />
        </nav>
      </aside>
      <main className="main">
        <header className="header">
          <div>
            <h1 className="title">{title}</h1>
            {description ? <p className="desc">{description}</p> : null}
          </div>
          <span className="badge">ERP Integrated</span>
        </header>
        <section className="page">{children}</section>
      </main>
    </div>
  );
}
