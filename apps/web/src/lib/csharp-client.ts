import { cookies } from "next/headers";

export function erpApiBaseUrl() {
  return process.env.ERP_API_BASE_URL || "http://localhost:5015";
}

export async function getSessionToken() {
  const store = await cookies();
  return store.get("cw_session")?.value;
}

export async function erpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${erpApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `ERP API failed with status ${response.status}`);
  }

  return payload as T;
}
