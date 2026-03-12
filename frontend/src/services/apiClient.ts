const API_URL = import.meta.env.VITE_API_URL as string;

type ApiError = {
  error?: string;
  message?: string;
  [key: string]: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
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
    throw new Error(msg);
  }

  return data as T;
}
