import { useState } from "react";
import "../styles/login.css";
import { login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      await login(username.trim(), password.trim());
      nav("/inicio");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="header">
        <img
          src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
          alt="Virgen de la Candelaria"
          className="logo"
        />
      </div>

      <div className="container">
        <h2 className="form-title">Bienvenido</h2>

        <form className="formulario" onSubmit={onSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="username" className="sr-only">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              className="user"
              required
              autoComplete="username"
              aria-describedby={msg ? "login-error" : undefined}
              aria-invalid={!!msg || undefined}
            />
          </div>

          <div className="field-group">
            <label htmlFor="password" className="sr-only">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="user"
              required
              autoComplete="current-password"
              aria-describedby={msg ? "login-error" : undefined}
              aria-invalid={!!msg || undefined}
            />
          </div>

          {msg ? (
            <p id="login-error" className="resp resp--error" role="alert">
              {msg}
            </p>
          ) : (
            <p className="resp" aria-hidden="true" />
          )}

          <button
            type="submit"
            className="user entrar"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Entrando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
          <br />
          <Link to="/verificar-cuenta">Verificar cuenta o reenviar correo</Link>
          <br />
          <Link to="/registro" style={{ fontWeight: 600 }}>
            Crear Cuenta Nueva
          </Link>
        </div>
      </div>

      <footer
        className="login-footer"
        aria-label="2025 Pablo Hdez. Todos los derechos reservados."
      >
        © 2025 Pablo Hdez. Todos los derechos reservados.
      </footer>
    </div>
  );
}
