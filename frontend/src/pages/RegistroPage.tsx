import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/login.css";
import { apiFetch } from "../services/apiClient";

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
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validar(): string | null {
    if (!form.usuario.trim()) return "El nombre de usuario es obligatorio.";
    if (form.usuario.trim().length < 3) return "El usuario debe tener al menos 3 caracteres.";
    if (!form.password) return "La contraseña es obligatoria.";
    if (form.password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "El formato del correo electrónico no es válido.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    const error = validar();
    if (error) { setMsg(error); return; }
    setMsg("");
    setLoading(true);
    try {
      await apiFetch("/usuarios", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
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
      setSuccess(true);
      setMsg("Cuenta creada correctamente. Redirigiendo al login...");
      setTimeout(() => nav("/login", { replace: true }), 1500);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Error al crear la cuenta.");
    }
    setLoading(false);
  }

  const hasError = msg && !success;

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
        <form className="formulario" onSubmit={onSubmit} noValidate aria-describedby={msg ? "registro-msg" : undefined}>

          <div className="field-group">
            <label htmlFor="reg-usuario" className="sr-only">Nombre de usuario</label>
            <input
              id="reg-usuario"
              type="text"
              value={form.usuario}
              onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
              placeholder="Nombre de usuario *"
              className="user"
              required
              autoComplete="username"
              minLength={3}
              aria-required="true"
              aria-invalid={hasError ? true : undefined}
            />
          </div>

          <div className="field-group">
            <label htmlFor="reg-password" className="sr-only">Contraseña</label>
            <input
              id="reg-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Contraseña * (mín. 8 caracteres)"
              className="user"
              required
              autoComplete="new-password"
              minLength={8}
              aria-required="true"
              aria-invalid={hasError ? true : undefined}
            />
          </div>

          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <div className="field-group">
              <label htmlFor="reg-nombre" className="sr-only">Nombre</label>
              <input
                id="reg-nombre"
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre"
                className="user"
                autoComplete="given-name"
              />
            </div>
            <div className="field-group">
              <label htmlFor="reg-apellidos" className="sr-only">Apellidos</label>
              <input
                id="reg-apellidos"
                type="text"
                value={form.apellidos}
                onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                placeholder="Apellidos"
                className="user"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="reg-email" className="sr-only">Correo electrónico</label>
            <input
              id="reg-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Correo electrónico"
              className="user"
              autoComplete="email"
            />
          </div>

          <div className="field-group">
            <label htmlFor="reg-telefono" className="sr-only">Teléfono</label>
            <input
              id="reg-telefono"
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              placeholder="Teléfono"
              className="user"
              autoComplete="tel"
            />
          </div>

          {msg && (
            <p
              id="registro-msg"
              className={`resp ${success ? "resp--success" : "resp--error"}`}
              role={hasError ? "alert" : "status"}
            >
              {msg}
            </p>
          )}

          <button
            type="submit"
            className="user entrar"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
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
