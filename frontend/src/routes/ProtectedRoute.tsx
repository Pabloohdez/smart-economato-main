import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem("usuarioActivo"));
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
