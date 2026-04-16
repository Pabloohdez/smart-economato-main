import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    <div className="m-0 min-h-screen flex flex-col justify-center items-center bg-[linear-gradient(140deg,#fff1f1_0%,#ffe5e5_48%,#fff8f6_100%)] bg-fixed overflow-x-hidden relative font-[var(--font-family-base)] before:content-[''] before:absolute before:w-[400px] before:h-[400px] before:bg-[radial-gradient(#ffc2c2,transparent_70%)] before:top-[-100px] before:left-[-100px] before:z-0 before:opacity-60 after:content-[''] after:absolute after:w-[300px] after:h-[300px] after:bg-[radial-gradient(#ffc2c2,transparent_70%)] after:bottom-[-50px] after:right-[-50px] after:z-0 after:opacity-60">
      <div className="absolute top-5 left-10 w-[calc(100%-80px)] flex justify-between items-center z-10 max-[480px]:top-2.5 max-[480px]:left-5">
        <img
          src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
          alt="Virgen de la Candelaria"
          className="w-40 h-auto [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.1))]"
        />
      </div>
      <div className="bg-white/90 border border-white/75 p-[42px] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] text-center w-full max-w-[420px] relative z-[5] animate-fadeInUp backdrop-blur-[12px] max-[480px]:w-[88%] max-[480px]:p-[28px_20px]">
        <h2 className="mt-0 mb-[var(--space-5)] text-[1.65rem] font-bold tracking-[-0.02em] text-[var(--color-brand-500)]">Crear Cuenta</h2>
        <form className="flex flex-col w-full" onSubmit={onSubmit} noValidate aria-describedby={msg ? "registro-msg" : undefined}>

          <div className="w-full">
            <label htmlFor="reg-usuario" className="sr-only">Nombre de usuario</label>
            <input
              id="reg-usuario"
              type="text"
              value={form.usuario}
              onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
              placeholder="Nombre de usuario *"
              className="w-full box-border py-[15px] px-4 mb-[var(--space-3)] border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
              required
              autoComplete="username"
              minLength={3}
              aria-required="true"
              aria-invalid={hasError ? true : undefined}
            />
          </div>

          <div className="w-full">
            <label htmlFor="reg-password" className="sr-only">Contraseña</label>
            <input
              id="reg-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Contraseña * (mín. 8 caracteres)"
              className="w-full box-border py-[15px] px-4 mb-[var(--space-3)] border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
              required
              autoComplete="new-password"
              minLength={8}
              aria-required="true"
              aria-invalid={hasError ? true : undefined}
            />
          </div>

          <div className="flex gap-2.5 w-full">
            <div className="w-full">
              <label htmlFor="reg-nombre" className="sr-only">Nombre</label>
              <input
                id="reg-nombre"
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre"
                className="w-full box-border py-[15px] px-4 mb-[var(--space-3)] border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                autoComplete="given-name"
              />
            </div>
            <div className="w-full">
              <label htmlFor="reg-apellidos" className="sr-only">Apellidos</label>
              <input
                id="reg-apellidos"
                type="text"
                value={form.apellidos}
                onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                placeholder="Apellidos"
                className="w-full box-border py-[15px] px-4 mb-[var(--space-3)] border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="w-full">
            <label htmlFor="reg-email" className="sr-only">Correo electrónico</label>
            <input
              id="reg-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Correo electrónico"
              className="w-full box-border py-[15px] px-4 mb-[var(--space-3)] border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
              autoComplete="email"
            />
          </div>

          <div className="w-full">
            <label htmlFor="reg-telefono" className="sr-only">Teléfono</label>
            <input
              id="reg-telefono"
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              placeholder="Teléfono"
              className="w-full box-border py-[15px] px-4 mb-[var(--space-3)] border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
              autoComplete="tel"
            />
          </div>

          {msg && (
            <p
              id="registro-msg"
              className={`mt-2.5 min-h-5 text-[14px] font-medium ${success ? "text-[var(--color-success-500)]" : "text-[var(--color-brand-500)]"}`}
              role={hasError ? "alert" : "status"}
            >
              {msg}
            </p>
          )}

          <button
            type="submit"
            className="mt-[var(--space-2)] w-full py-[15px] px-4 rounded-[var(--radius-md)] border-0 cursor-pointer text-white font-semibold tracking-[0.35px] bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] shadow-[0_4px_15px_rgba(179,49,49,0.3)] transition-[transform,box-shadow,background] duration-150 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c93838_0%,var(--color-brand-500)_100%)] hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)] active:translate-y-0"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>
        <div className="mt-5">
          <Link className="text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-500)] font-semibold" to="/login">
            ¿Ya tienes cuenta? Iniciar sesión
          </Link>
        </div>
      </div>
      <footer className="fixed bottom-0 left-0 w-full py-[15px] bg-white/90 backdrop-blur-[5px] text-[12px] text-center border-t border-[#eee] z-10 text-[var(--color-text-muted)]">
        © 2025 Pablo Hdez. Todos los derechos reservados.
      </footer>
    </div>
  );
}
