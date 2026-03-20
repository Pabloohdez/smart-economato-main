import { clearSession, getToken } from "./sessionService";

const API_URL = (import.meta.env.VITE_API_URL as string) || "/api";

type ApiError = {
  error?: string;
  message?: string;
  [key: string]: unknown;
};

export type ApiRequestError = Error & {
  status?: number;
  payload?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const token = getToken();
  const optionHeaders = (options.headers ?? {}) as HeadersInit;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...optionHeaders,
    },
  });

  const text = await res.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const errObj = (typeof data === "object" && data !== null) ? (data as ApiError) : {};
    const msg = errObj.error ?? errObj.message ?? `HTTP ${res.status}`;
    if (res.status === 401) {
      clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    throw Object.assign(new Error(msg), {
      status: res.status,
      payload: data,
    }) as ApiRequestError;
  }

  return data as T;
}
