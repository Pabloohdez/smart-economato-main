const API_URL = import.meta.env.VITE_API_URL as string;

export type UsuarioActivo = Record<string, unknown>;

export async function login(username: string, password: string): Promise<UsuarioActivo | null> {
  try {
    const res = await fetch(`${API_URL}/login.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) return null;

    const response = await res.json();
    if (response?.success && response?.data) return response.data;

    return null;
  } catch {
    return null;
  }
}
