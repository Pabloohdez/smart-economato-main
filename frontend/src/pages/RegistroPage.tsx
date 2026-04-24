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
  const [showPassword, setShowPassword] = useState(false);

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
      const response = await apiFetch<{ message?: string; mailMode?: string }>("/usuarios", {
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
      const backendMessage = String(response?.message ?? "").trim();
      setMsg(backendMessage || "Cuenta creada correctamente. Redirigiendo al login...");
      setTimeout(() => nav("/login", { replace: true }), 1500);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Error al crear la cuenta.");
    }
    setLoading(false);
  }

  const hasError = msg && !success;

  return (
    <div className="login-page min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(179,49,49,0.10),transparent_40%),linear-gradient(135deg,#f6f7fb_0%,#eef2f7_55%,#f8fafc_100%)] text-slate-800 font-[var(--font-family-base)]">
      <main className="flex min-h-[100dvh] w-full items-stretch p-0">
        <div className="grid min-h-[100dvh] w-full grid-cols-[1.15fr_minmax(340px,520px)] overflow-hidden rounded-none border-0 bg-white/60 shadow-none backdrop-blur max-[960px]:grid-cols-1">
          <section className="relative overflow-hidden bg-[linear-gradient(145deg,#0b1220_0%,#0f172a_55%,#111827_100%)] px-[clamp(16px,4vw,44px)] py-[clamp(16px,4vh,44px)] text-white">
            <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:56px_56px]" aria-hidden="true" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(179,49,49,0.35),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(217,119,69,0.25),transparent_45%)]" aria-hidden="true" />
            <div className="relative z-[1] flex h-full flex-col">
              <div className="inline-flex items-center gap-4">
                <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[18px] bg-white/10 p-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                  <img
                    src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
                    alt="CIFP Virgen de la Candelaria"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
                    Smart Economato
                  </p>
                  <h1 className="m-0 mt-2 text-[40px] font-extrabold tracking-[-0.05em] text-white max-[1100px]:text-[36px] max-[960px]:text-[30px]">
                    Solicitud de alta
                  </h1>
                </div>
              </div>

              <p className="mt-8 max-w-[520px] text-[15px] leading-7 text-white/80 max-[960px]:mt-6">
                Crea tu cuenta para acceder al panel operativo. Recibirás un mensaje de confirmación tras el registro.
              </p>

              <div className="login-page__features mt-8 grid gap-5 max-[960px]:mt-6">
                {[
                  { title: "Datos", text: "Rellena usuario, contraseña y datos de contacto." },
                  { title: "Acceso", text: "Podrás iniciar sesión una vez creada la cuenta." },
                  { title: "Soporte", text: "Si hay incidencias, puedes solicitar reenvío de verificación." },
                ].map((item) => (
                  <article key={item.title} className="grid gap-1">
                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.28em] text-white/55">
                      {item.title}
                    </p>
                    <p className="m-0 text-[13px] leading-6 text-white/78">
                      {item.text}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-auto pt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 max-[960px]:pt-8">
                Centro operativo del CIFP Virgen de la Candelaria
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center px-[clamp(16px,4vw,44px)] py-[clamp(16px,4vh,44px)]">
            <div className="w-full max-w-[520px] rounded-[28px] border border-slate-200/80 bg-white px-[clamp(18px,3.6vw,32px)] py-[clamp(18px,3.6vh,32px)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="mb-7">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-500)]">
                  Registro
                </p>
                <h2 className="m-0 mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-slate-900">
                  Crear cuenta
                </h2>
                <p className="m-0 mt-2 text-[13px] leading-6 text-slate-500">
                  Completa los datos para solicitar el alta. Podrás iniciar sesión después.
                </p>
              </div>

              <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate aria-describedby={msg ? "registro-msg" : undefined}>
                <div>
                  <label htmlFor="reg-usuario" className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Usuario
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                      <i className="fa-regular fa-user" />
                    </span>
                    <input
                      id="reg-usuario"
                      type="text"
                      value={form.usuario}
                      onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
                      placeholder="Nombre de usuario"
                      className="w-full rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      required
                      minLength={3}
                      autoComplete="username"
                      aria-invalid={hasError ? true : undefined}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-password" className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Contraseña
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                      <i className="fa-solid fa-lock" />
                    </span>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-12 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      aria-invalid={hasError ? true : undefined}
                    />
                    <button
                      type="button"
                      className="absolute right-[10px] top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] border-0 bg-transparent text-slate-400 transition-[background,color] duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <i
                        className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} w-4 min-w-4 text-center leading-none`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                  <div>
                    <label htmlFor="reg-nombre" className="mb-2 block text-[13px] font-semibold text-slate-700">
                      Nombre
                    </label>
                    <input
                      id="reg-nombre"
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                      placeholder="Nombre (opcional)"
                      className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-apellidos" className="mb-2 block text-[13px] font-semibold text-slate-700">
                      Apellidos
                    </label>
                    <input
                      id="reg-apellidos"
                      type="text"
                      value={form.apellidos}
                      onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                      placeholder="Apellidos (opcional)"
                      className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Correo electrónico
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="correo@centro.es (opcional)"
                    className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                    autoComplete="email"
                    aria-invalid={hasError ? true : undefined}
                  />
                </div>

                <div>
                  <label htmlFor="reg-telefono" className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Teléfono
                  </label>
                  <input
                    id="reg-telefono"
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                    placeholder="Teléfono (opcional)"
                    className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                    autoComplete="tel"
                  />
                </div>

                {msg ? (
                  <p
                    id="registro-msg"
                    className={`m-0 rounded-[14px] border px-4 py-3 text-[14px] font-medium ${
                      success
                        ? "border-[#c6f6d5] bg-[#f0fff4] text-[#276749]"
                        : "border-[#f6caca] bg-[#fff4f4] text-[#9f2a2a]"
                    }`}
                    role={hasError ? "alert" : "status"}
                  >
                    {msg}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className="mt-1 inline-flex min-h-[56px] w-full items-center justify-center rounded-[18px] border-0 bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_58%,#d97745_100%)] px-4 py-4 text-[15px] font-semibold tracking-[0.01em] text-white shadow-[0_20px_40px_rgba(179,49,49,0.22)] transition-[transform,box-shadow,filter] duration-150 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(179,49,49,0.26)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? "Registrando..." : "Registrarse"}
                </button>
              </form>

              <div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 text-[13px] text-slate-500">
                <p className="m-0">
                  ¿Ya tienes cuenta?{" "}
                  <Link className="font-semibold text-[var(--color-brand-500)] transition-colors hover:text-[var(--color-brand-600)]" to="/login">
                    Iniciar sesión
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
