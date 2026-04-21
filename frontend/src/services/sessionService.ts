const USER_KEY = "usuarioActivo";
const TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export type SessionUser = Record<string, unknown>;

function normalizeStoredUser(user: SessionUser): SessionUser {
  const roleRaw = String(user.role ?? user.rol ?? "").trim().toLowerCase();

  let normalizedRole = "usuario";
  if (roleRaw === "admin" || roleRaw === "administrador") normalizedRole = "administrador";
  else if (roleRaw === "profesor" || roleRaw === "teacher") normalizedRole = "profesor";
  else if (roleRaw === "alumno" || roleRaw === "student") normalizedRole = "alumno";
  else if (roleRaw === "usuario" || roleRaw === "user") normalizedRole = "usuario";

  return {
    ...user,
    username: user.username ?? user.usuario ?? "",
    usuario: user.usuario ?? user.username ?? "",
    role: normalizedRole,
    rol: normalizedRole,
    nombre: user.nombre ?? "",
    apellidos: user.apellidos ?? "",
    email: user.email ?? "",
  };
}

export function saveSession(token: string, user: SessionUser, refreshToken?: string) {
  const normalizedUser = normalizeStoredUser(user);

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionUser;
    return normalizeStoredUser(parsed);
  } catch {
    return null;
  }
}

export function hasActiveSession() {
  return Boolean(getToken() && getStoredUser());
}