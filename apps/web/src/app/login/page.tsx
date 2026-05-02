"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [companyCode, setCompanyCode] = useState("FLG");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function getNextPath() {
    if (typeof window === "undefined") return "/";
    const nextPath = new URLSearchParams(window.location.search).get("next");
    return nextPath && nextPath.startsWith("/") ? nextPath : "/";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, password, companyCode }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setError(payload.error || "Login failed");
        return;
      }

      setMessage("Login successful.");
      router.replace(getNextPath());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login service is not available.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page" style={{ maxWidth: 520, margin: "40px auto" }}>
      <div className="card">
        <h1 className="title">Cheque Writer Login</h1>
        <p className="desc">Sign in with your ERP user account before accessing the cheque writer menu.</p>
        <form className="form" onSubmit={submit} style={{ marginTop: 20 }}>
          <label className="field">
            <span className="label">Company Code</span>
            <input className="input" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">User Name</span>
            <input className="input" value={userName} onChange={(e) => setUserName(e.target.value)} autoFocus />
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
