import { apiFetch } from "./apiClient";
import { clearSession, saveSession } from "./sessionService";

export type UsuarioActivo = Record<string, unknown>;

type LoginResponse = { success: boolean; data: { token: string; user: UsuarioActivo } };

export async function login(username: string, password: string): Promise<UsuarioActivo | null> {
  try {
    const response = await apiFetch<LoginResponse>("/login", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ username, password }),
    });
    if (response?.success && response?.data?.token && response?.data?.user) {
      saveSession(response.data.token, response.data.user);
      return response.data.user;
    }
    return null;
  } catch {
    clearSession();
    return null;
  }
}

export function logout() {
  clearSession();
}
