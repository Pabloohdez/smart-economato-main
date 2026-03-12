import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/login.css";

const API_URL = (import.meta.env.VITE_API_URL as string) || "/api";

export default function RegistroPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    usuario: "",
    password: "",
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!form.usuario.trim() || !form.password.trim()) {
      setMsg("Usuario y contraseña son obligatorios.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: form.usuario.trim(),
          password: form.password,
          nombre: form.nombre.trim() || undefined,
          apellidos: form.apellidos.trim() || undefined,
          email: form.email.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          rol: "usuario",
        }),
      });
      if (res.ok) {
        setMsg("Cuenta creada. Redirigiendo al login...");
        setTimeout(() => nav("/login", { replace: true }), 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg(data?.error?.message || "Error al crear la cuenta.");
      }
    } catch (err) {
      setMsg("Error de conexión. Comprueba que la API esté disponible.");
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
        <h2 className="form-title">Crear Cuenta</h2>
        <form className="formulario" onSubmit={onSubmit}>
          <input
            type="text"
            value={form.usuario}
            onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
            placeholder="Nombre de usuario"
            className="user"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Contraseña"
            className="user"
            required
          />
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre"
              className="user"
            />
            <input
              type="text"
              value={form.apellidos}
              onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
              placeholder="Apellidos"
              className="user"
            />
          </div>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Correo electrónico"
            className="user"
          />
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            placeholder="Teléfono"
            className="user"
          />
          <p className="resp" style={{ color: msg.startsWith("Cuenta creada") ? "green" : "#c53030", fontWeight: 600 }}>
            {msg}
          </p>
          <input
            type="submit"
            value={loading ? "Registrando..." : "Registrarse"}
            className="user entrar"
            disabled={loading}
          />
        </form>
        <div style={{ marginTop: 20 }}>
          <Link to="/login" style={{ fontWeight: 600 }}>¿Ya tienes cuenta? Iniciar sesión</Link>
        </div>
      </div>
      <footer className="login-footer">
        © 2025 Pablo Hdez. Todos los derechos reservados.
      </footer>
    </div>
  );
}
