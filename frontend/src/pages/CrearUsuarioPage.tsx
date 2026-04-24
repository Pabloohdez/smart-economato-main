import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const [showPassword, setShowPassword] = useState(false);
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
                    Crear cuenta
                  </h1>
                </div>
              </div>

              <p className="mt-8 max-w-[520px] text-[15px] leading-7 text-white/80 max-[960px]:mt-6">
                Completa los datos para solicitar el alta. Si ya tienes cuenta, vuelve al login.
              </p>

              <div className="login-page__features mt-8 grid gap-5 max-[960px]:mt-6">
                {[
                  { title: "Datos", text: "Usuario, contraseña y datos de contacto." },
                  { title: "Verificación", text: "Podrás verificar la cuenta desde el enlace recibido." },
                  { title: "Acceso", text: "Después podrás iniciar sesión y acceder al panel." },
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
                  Completa los datos para crear el usuario. Te redirigiremos a verificación.
                </p>
              </div>

              <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
                <div>
                  <label htmlFor="cu-usuario" className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Usuario
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                      <i className="fa-regular fa-user" />
                    </span>
                    <input
                      id="cu-usuario"
                      type="text"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      placeholder="Nombre de usuario"
                      className="w-full rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cu-password" className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Contraseña
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                      <i className="fa-solid fa-lock" />
                    </span>
                    <input
                      id="cu-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-12 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-[10px] top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] border-0 bg-transparent text-slate-400 transition-[background,color] duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} w-4 min-w-4 text-center leading-none`} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                  <div>
                    <label htmlFor="cu-nombre" className="mb-2 block text-[13px] font-semibold text-slate-700">
                      Nombre
                    </label>
                    <input
                      id="cu-nombre"
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Nombre"
                      className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="cu-apellidos" className="mb-2 block text-[13px] font-semibold text-slate-700">
                      Apellidos
                    </label>
                    <input
                      id="cu-apellidos"
                      type="text"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      placeholder="Apellidos"
                      className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cu-email" className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Correo electrónico
                  </label>
                  <input
                    id="cu-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@centro.es"
                    className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="cu-telefono" className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Teléfono
                  </label>
                  <input
                    id="cu-telefono"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Teléfono"
                    className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                    required
                    autoComplete="tel"
                  />
                </div>

                {msg ? <Alert type={msgTipo}>{msg}</Alert> : null}

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
                <Link
                  className="inline-flex items-center gap-2 font-medium transition-colors hover:text-[var(--color-brand-500)]"
                  to="/verificar-cuenta"
                >
                  <i className="fa-regular fa-circle-check" aria-hidden="true" />
                  Verificar cuenta o reenviar correo de activación
                </Link>

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