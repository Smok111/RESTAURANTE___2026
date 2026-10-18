export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api").replace(/\/$/, "");

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("token") || "";
}

export function getUser<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("token", token);
  window.localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("user");
}

function withAuth(headers?: HeadersInit): HeadersInit {
  const merged: Record<string, string> = {};
  if (headers) {
    new Headers(headers).forEach((value, key) => {
      merged[key] = value;
    });
  }
  const token = getToken();
  if (token && !merged["Authorization"]) {
    merged["Authorization"] = `Bearer ${token}`;
  }
  return merged;
}

// Envoltorio de fetch que antepone la URL base del backend y adjunta el JWT.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = /^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`;
  return fetch(url, { ...options, headers: withAuth(options.headers) });
}
