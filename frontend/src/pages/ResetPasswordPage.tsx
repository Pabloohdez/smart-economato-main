import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Alert from "../components/ui/Alert";
import { resetPassword } from "../services/authService";
import "../styles/login.css";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!token) {
      setType("error");
      setMessage("Falta el token de recuperación. Abre el enlace recibido por correo.");
      return;
    }

    if (password.trim().length < 8) {
      setType("error");
      setMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setType("error");
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(token, password);
      setType("success");
      setMessage(response.data?.message || response.message || "Contraseña actualizada.");
      window.setTimeout(() => navigate("/login"), 1400);
    } catch (error) {
      setType("error");
      setMessage(error instanceof Error ? error.message : "No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="header">
        <img src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png" alt="Virgen de la Candelaria" className="logo" />
      </div>

      <div className="container auth-container">
        <h2 className="form-title">Restablecer contraseña</h2>
        <p className="auth-copy">Define una nueva contraseña para tu cuenta.</p>

        <form className="formulario auth-form" onSubmit={onSubmit}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nueva contraseña"
            className="user"
            required
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repite la nueva contraseña"
            className="user"
            required
            autoComplete="new-password"
          />

          {message ? <Alert type={type}>{message}</Alert> : null}

          <button type="submit" className="user entrar" disabled={loading}>
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/recuperar-password">Solicitar otro enlace</Link>
          <br />
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </div>

      <footer className="login-footer">© 2025 Pablo Hdez. Todos los derechos reservados.</footer>
    </div>
  );
}