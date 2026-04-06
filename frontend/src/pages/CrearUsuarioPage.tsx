import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/crearusuario.css";
import { apiFetch } from "../services/apiClient";
import Alert from "../components/ui/Alert";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";

type NuevoUsuarioPayload = {
  usuario: string;
  password: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
};

type CrearUsuarioResponse = {
  success?: boolean;
  ok?: boolean;
  id?: number | string;
  message?: string;
  error?: {
    message?: string;
  };
};

export default function CrearUsuarioPage() {
  const nav = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  const [msg, setMsg] = useState("");
  const [msgTipo, setMsgTipo] = useState<"success" | "error">("error");
  const [loading, setLoading] = useState(false);

  async function crearUsuario(payload: NuevoUsuarioPayload) {
    return apiFetch<CrearUsuarioResponse>("/usuarios", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify(payload),
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const normalizedEmail = normalizeOptionalEmail(email);

    if (!normalizedEmail || !isValidOptionalEmail(normalizedEmail)) {
      setMsgTipo("error");
      setMsg("El correo electrónico no es válido");
      return;
    }

    setLoading(true);

    try {
      const payload: NuevoUsuarioPayload = {
        usuario: usuario.trim(),
        password: password.trim(),
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        email: normalizedEmail,
        telefono: telefono.trim(),
      };

      const data = await crearUsuario(payload);

      if (data?.success || data?.ok || data?.id) {
        setMsgTipo("success");
        setMsg(data?.message || "Cuenta creada. Revisa tu correo para verificarla.");
        setTimeout(() => {
          nav(`/verificar-cuenta?email=${encodeURIComponent(normalizedEmail)}`);
        }, 1200);
      } else {
        setMsgTipo("error");
        setMsg(data?.error?.message || data?.message || "No se pudo crear la cuenta");
      }
    } catch (error) {
      console.error(error);
      setMsgTipo("error");
      setMsg(error instanceof Error ? error.message : "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="registro-page">
      <div className="registro-header">
        <img
          src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
          alt="Virgen de la Candelaria"
          className="registro-logo"
        />

        <Link to="/login" className="registro-back" aria-label="Volver al login">
          &#8592;
        </Link>
      </div>

      <div className="registro-container">
        <h2 className="registro-title">Crear Cuenta</h2>

        <form className="registro-form" onSubmit={onSubmit}>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Nombre de usuario"
            className="registro-input"
            required
            aria-label="Nombre de usuario"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="registro-input"
            required
            aria-label="Contraseña"
          />

          <div className="registro-row">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre"
              className="registro-input"
              required
              aria-label="Nombre"
            />

            <input
              type="text"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              placeholder="Apellidos"
              className="registro-input"
              required
              aria-label="Apellidos"
            />
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            className="registro-input"
            required
            aria-label="Correo electrónico"
          />

          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Teléfono"
            className="registro-input"
            required
            aria-label="Número de teléfono"
          />

          {msg && <Alert type={msgTipo}>{msg}</Alert>}
          <button
            type="submit"
            className="registro-submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <Link to="/login" className="registro-link">
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </div>

      <footer className="registro-footer">
        © 2025 Pablo Hdez. Todos los derechos reservados.
      </footer>
    </div>
  );
}