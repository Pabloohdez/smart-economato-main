import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/crearusuario.css";

const API_URL = import.meta.env.VITE_API_URL as string;

type NuevoUsuarioPayload = {
  usuario: string;
  password: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
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
  const [loading, setLoading] = useState(false);

  async function crearUsuario(payload: NuevoUsuarioPayload) {
    const res = await fetch(`${API_URL}/usuarios.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return res.json();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const payload: NuevoUsuarioPayload = {
        usuario: usuario.trim(),
        password: password.trim(),
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
      };

      const data = await crearUsuario(payload);

      if (data?.success || data?.ok || data?.id) {
        setMsg("Cuenta creada correctamente");
        setTimeout(() => {
          nav("/login");
        }, 1200);
      } else {
        setMsg(data?.error?.message || data?.message || "No se pudo crear la cuenta");
      }
    } catch (error) {
      console.error(error);
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

          <p className="registro-msg">{msg}</p>

          <input
            type="submit"
            value={loading ? "Registrando..." : "Registrarse"}
            className="registro-submit"
            disabled={loading}
          />
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