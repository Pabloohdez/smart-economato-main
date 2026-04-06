import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Alert from "../components/ui/Alert";
import { resendVerification, verifyAccount } from "../services/authService";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";
import "../styles/login.css";

export default function VerifyAccountPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState(token ? "Verificando cuenta..." : "Introduce tu correo para reenviar el mensaje de verificación.");
  const [type, setType] = useState<"success" | "error" | "info">(token ? "info" : "info");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    setLoading(true);

    verifyAccount(token)
      .then((response) => {
        if (!active) {
          return;
        }
        setType("success");
        setVerified(true);
        setMessage(response.data?.message || response.message || "Cuenta verificada correctamente.");
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setType("error");
        setMessage(error instanceof Error ? error.message : "No se pudo verificar la cuenta.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

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
      const response = await resendVerification(normalizedEmail);
      setType("success");
      setMessage(response.data?.message || response.message || "Correo reenviado.");
    } catch (error) {
      setType("error");
      setMessage(error instanceof Error ? error.message : "No se pudo reenviar el correo de verificación.");
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
        <h2 className="form-title">Verificar cuenta</h2>
        <p className="auth-copy">
          {verified
            ? "Tu cuenta ya está lista para iniciar sesión."
            : "Puedes validar el enlace recibido o pedir que te enviemos uno nuevo."}
        </p>

        {message ? <Alert type={type === "info" ? "info" : type}>{message}</Alert> : null}

        {!verified ? (
          <form className="formulario auth-form" onSubmit={onSubmit}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Correo electrónico"
              className="user"
              required
              autoComplete="email"
              disabled={loading && Boolean(token)}
            />

            <button type="submit" className="user entrar" disabled={loading}>
              {loading && !token ? "Enviando..." : "Reenviar verificación"}
            </button>
          </form>
        ) : null}

        <div className="auth-links">
          <Link to="/login">Ir al inicio de sesión</Link>
          <br />
          <Link to="/recuperar-password">¿Necesitas recuperar la contraseña?</Link>
        </div>
      </div>

      <footer className="login-footer">© 2025 Pablo Hdez. Todos los derechos reservados.</footer>
    </div>
  );
}