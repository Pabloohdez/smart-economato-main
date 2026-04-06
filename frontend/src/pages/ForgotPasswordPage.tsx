import { useState } from "react";
import { Link } from "react-router-dom";
import Alert from "../components/ui/Alert";
import { requestPasswordReset } from "../services/authService";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";
import "../styles/login.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    const normalizedEmail = normalizeOptionalEmail(email);
    if (!normalizedEmail || !isValidOptionalEmail(normalizedEmail)) {
      setType("error");
      setMessage("Introduce un correo electrónico válido.");
      return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordReset(normalizedEmail);
      setType("success");
      setMessage(response.data?.message || response.message || "Revisa tu correo para continuar.");
    } catch (error) {
      setType("error");
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el correo de recuperación.");
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
        <h2 className="form-title">Recuperar contraseña</h2>
        <p className="auth-copy">Introduce tu correo y te enviaremos un enlace real para restablecer la contraseña.</p>

        <form className="formulario auth-form" onSubmit={onSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo electrónico"
            className="user"
            required
            autoComplete="email"
          />

          {message ? <Alert type={type}>{message}</Alert> : null}

          <button type="submit" className="user entrar" disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Volver al inicio de sesión</Link>
          <br />
          <Link to="/verificar-cuenta">¿Necesitas reenviar el correo de verificación?</Link>
        </div>
      </div>

      <footer className="login-footer">© 2025 Pablo Hdez. Todos los derechos reservados.</footer>
    </div>
  );
}