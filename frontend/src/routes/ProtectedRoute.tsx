import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem("usuarioActivo"));
}

type Props = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
