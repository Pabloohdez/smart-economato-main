import { useState } from "react";
import { login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="login-page h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(179,49,49,0.18),transparent_34%),linear-gradient(135deg,#f5efe8_0%,#f7f8fb_44%,#eef2f7_100%)] text-slate-800 font-[var(--font-family-base)]">
      <main className="mx-auto flex h-full w-full max-w-[1320px] items-stretch px-6 py-6 max-[960px]:px-4 max-[960px]:py-4">
        <div className="grid h-full w-full grid-cols-[1.08fr_minmax(360px,460px)] overflow-hidden rounded-[34px] border border-white/60 bg-white/70 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur max-[960px]:grid-cols-1">
          <section className="relative overflow-hidden bg-[linear-gradient(145deg,#7f1d1d_0%,#9f2a2a_42%,#d97745_100%)] px-10 py-10 text-white max-[960px]:px-6 max-[960px]:py-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.18),transparent_18%),radial-gradient(circle_at_78%_70%,rgba(255,255,255,0.16),transparent_22%)]" aria-hidden="true" />
            <div className="relative z-[1] flex h-full flex-col">
              <div className="inline-flex items-center gap-4">
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white/12 p-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  <img
                    src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
                    alt="CIFP Virgen de la Candelaria"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div>
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/72">
                    Smart Economato
                  </p>
                  <h1 className="m-0 mt-1 text-[32px] font-semibold tracking-[-0.04em] text-white max-[960px]:text-[28px]">
                    Gestión diaria sin fricción.
                  </h1>
                </div>
              </div>

              <p className="mt-8 max-w-[520px] text-[18px] leading-8 text-white/86 max-[960px]:mt-6 max-[960px]:text-[16px] max-[960px]:leading-7">
                Un acceso claro para recepción, inventario, distribución y control de incidencias en un mismo entorno.
              </p>

              <div className="login-page__features mt-8 grid gap-4 max-[960px]:mt-6">
                {[
                  {
                    title: "Recepción y stock en una vista",
                    text: "Entrada de mercancía, trazabilidad y control de mínimos sin cambiar de flujo.",
                  },
                  {
                    title: "Uso rápido en tablet",
                    text: "Botones amplios, contraste alto y recorrido corto para operativa en aula o almacén.",
                  },
                  {
                    title: "Avisos que importan",
                    text: "Caducidades, bajas y movimientos listos para revisar nada más entrar.",
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="grid grid-cols-[44px_1fr] items-start gap-4 rounded-[22px] border border-white/14 bg-white/10 px-4 py-4 backdrop-blur-sm"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[var(--color-brand-500)] shadow-[0_10px_25px_rgba(0,0,0,0.12)]">
                      <i className="fa-solid fa-check" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="m-0 text-[16px] font-semibold tracking-[-0.02em] text-white">{item.title}</h2>
                      <p className="m-0 mt-1 text-[14px] leading-6 text-white/78">{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-auto pt-10 text-[12px] font-medium uppercase tracking-[0.18em] text-white/62 max-[960px]:pt-8">
                Centro operativo del CIFP Virgen de la Candelaria
              </div>
            </div>
          </section>

          <section className="flex items-center px-9 py-9 max-[960px]:px-5 max-[960px]:py-6">
            <div className="w-full rounded-[28px] border border-slate-200/80 bg-white px-7 py-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)] max-[480px]:px-5 max-[480px]:py-6">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-500)]">
                    Acceso seguro
                  </p>
                  <h2 className="m-0 mt-2 text-[32px] font-semibold tracking-[-0.04em] text-slate-900 max-[480px]:text-[28px]">
                    Bienvenido
                  </h2>
                  <p className="m-0 mt-2 text-[14px] leading-6 text-slate-500">
                    Accede con tu usuario o correo y continúa en el punto exacto donde lo dejaste.
                  </p>
                </div>
              </div>

              <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
                <div>
                  <label htmlFor="username" className="mb-2 block text-[13px] font-semibold text-slate-700">
                    Usuario o correo
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                      <i className="fa-regular fa-user" />
                    </span>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="usuario o nombre@centro.es"
                      className="w-full rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-4 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      required
                      autoComplete="username"
                      aria-describedby={msg ? "login-error" : "login-hint"}
                      aria-invalid={!!msg || undefined}
                    />
                  </div>
                  <p id="login-hint" className="m-0 mt-2 text-[12px] text-slate-500">
                    Si sueles entrar con correo, también está permitido.
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="password" className="block text-[13px] font-semibold text-slate-700">
                      Contraseña
                    </label>
                    <Link
                      className="text-[12px] font-semibold text-[var(--color-brand-500)] transition-colors hover:text-[var(--color-brand-600)]"
                      to="/recuperar-password"
                    >
                      Recuperar acceso
                    </Link>
                  </div>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                      <i className="fa-solid fa-lock" />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      className="w-full rounded-[16px] border border-slate-200 bg-slate-50 pl-11 pr-12 py-4 text-[15px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                      required
                      autoComplete="current-password"
                      aria-describedby={msg ? "login-error" : undefined}
                      aria-invalid={!!msg || undefined}
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

                {msg ? (
                  <p
                    id="login-error"
                    className="m-0 rounded-[14px] border border-[#f6caca] bg-[#fff4f4] px-4 py-3 text-[14px] font-medium text-[#9f2a2a]"
                    role="alert"
                  >
                    {msg}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className="mt-1 inline-flex min-h-[56px] w-full items-center justify-center rounded-[18px] border-0 bg-[linear-gradient(135deg,#7f1d1d_0%,#b33131_58%,#d97745_100%)] px-4 py-4 text-[15px] font-semibold tracking-[0.01em] text-white shadow-[0_20px_40px_rgba(159,42,42,0.24)] transition-[transform,box-shadow,filter] duration-150 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(159,42,42,0.28)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? "Accediendo..." : "Entrar al panel"}
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
                  ¿Aún no tienes cuenta?{" "}
                  <Link className="font-semibold text-[var(--color-brand-500)] transition-colors hover:text-[var(--color-brand-600)]" to="/registro">
                    Solicitar alta de usuario
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
