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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-[var(--font-family-base)] flex flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-[440px] flex-col items-center">
          <img
            src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
            alt="CIFP Virgen de la Candelaria"
            className="mb-8 h-auto w-[152px] object-contain"
          />

          <div className="w-full rounded-[24px] border border-slate-200 bg-white px-9 py-10 shadow-md animate-fadeInUp max-[480px]:px-6 max-[480px]:py-8">
            <h1 className="mt-0 mb-2 text-center text-[1.8rem] font-semibold tracking-[-0.02em] text-[#1e293b]">
              Acceso al Economato
            </h1>
            <p className="mb-6 text-center text-[14px] text-slate-500">
              Identifícate para acceder al panel de gestión.
            </p>

            <form className="flex flex-col w-full" onSubmit={onSubmit} noValidate>
              <div className="w-full">
                <label htmlFor="username" className="sr-only">
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Usuario"
                  className="w-full box-border rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-4 text-[14px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-500 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                  required
                  autoComplete="username"
                  aria-describedby={msg ? "login-error" : undefined}
                  aria-invalid={!!msg || undefined}
                />
              </div>

              <div className="mt-3 w-full">
                <label htmlFor="password" className="sr-only">
                  Contraseña
                </label>
                <div className="relative w-full">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="w-full box-border rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-4 pr-12 text-[14px] font-inherit text-slate-800 transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-500 focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(127,29,29,0.08)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
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

                <div className="mt-3 flex justify-end">
                  <Link
                    className="text-[12px] font-medium text-slate-500 transition-colors hover:text-[var(--color-brand-500)]"
                    to="/recuperar-password"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              {msg ? (
                <p
                  id="login-error"
                  className="mt-4 min-h-5 text-[14px] font-medium text-[var(--color-brand-500)]"
                  role="alert"
                >
                  {msg}
                </p>
              ) : (
                <p className="mt-4 min-h-5 text-[14px]" aria-hidden="true" />
              )}

              <button
                type="submit"
                className="mt-1 w-full rounded-[14px] border-0 bg-[#7f1d1d] px-4 py-4 text-white font-semibold tracking-[0.01em] shadow-sm transition-[background-color,transform,box-shadow] duration-150 hover:bg-[#6b1717] hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? "Entrando..." : "Iniciar Sesión"}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-5 text-center">
              <Link className="text-[13px] text-slate-500 transition-colors hover:text-[var(--color-brand-500)]" to="/verificar-cuenta">
                Verificar cuenta o reenviar correo
              </Link>

              <p className="mt-5 text-[13px] text-slate-500">
                ¿Aún no tienes cuenta?{" "}
                <Link className="font-semibold text-[#7f1d1d] transition-colors hover:text-[#6b1717]" to="/registro">
                  Regístrate
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer
        className="border-t border-slate-200 bg-white/80 py-[15px] text-center text-[12px] text-slate-500"
        aria-label="Smart Economato"
      >
        Smart Economato
      </footer>
    </div>
  );
}
