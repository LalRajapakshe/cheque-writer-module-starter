"use client";

import { useState } from "react";

export default function LoginPage() {
  const [userName, setUserName] = useState("lal");
  const [password, setPassword] = useState("demo123");
  const [companyCode, setCompanyCode] = useState("DEMO");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, password, companyCode }),
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok || !payload.success) {
      setError(payload.error || "Login failed");
      return;
    }
    setMessage("Login successful. Open Voucher Queue to continue.");
  }

  return (
    <main className="page" style={{ maxWidth: 520, margin: "40px auto" }}>
      <div className="card">
        <h1 className="title">Cheque Writer Login</h1>
        <p className="desc">Demo mode uses ERP-style login through the C# middle layer.</p>
        <form className="form" onSubmit={submit} style={{ marginTop: 20 }}>
          <label className="field">
            <span className="label">Company Code</span>
            <input className="input" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">User Name</span>
            <input className="input" value={userName} onChange={(e) => setUserName(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {message ? <div className="alert">{message}</div> : null}
          {error ? <div className="alert error">{error}</div> : null}
          <button className="btn" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>
      </div>
    </main>
  );
}
