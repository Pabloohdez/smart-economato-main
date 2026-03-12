import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import { login } from "../services/authService";

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

    const user = await login(username.trim(), password.trim());

    if (user) {
      localStorage.setItem("usuarioActivo", JSON.stringify(user));
      nav("/inicio");
    } else {
      setMsg("Usuario/Contraseña incorrecta");
    }

    setLoading(false);
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

        <form className="formulario" onSubmit={onSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuario"
            className="user"
            required
            aria-label="Introduzca su nombre de usuario"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="user"
            required
            aria-label="Introduzca su contraseña"
          />

          <p className="resp">{msg}</p>

          <input
            type="submit"
            value={loading ? "Entrando..." : "Iniciar Sesión"}
            className="user entrar"
            aria-label="Inicie Sesión"
            disabled={loading}
          />
        </form>

        <div style={{ marginTop: 20 }}>
          <a href="#">¿Olvidaste tu contraseña?</a>
          <br />
          <a href="#" style={{ fontWeight: 600 }}>Crear Cuenta Nueva</a>
        </div>
      </div>

      <footer className="login-footer" aria-label="2025 Pablo Hdez. Todos los derechos reservados.">
        © 2025 Pablo Hdez. Todos los derechos reservados.
      </footer>
    </div>
  );
}
