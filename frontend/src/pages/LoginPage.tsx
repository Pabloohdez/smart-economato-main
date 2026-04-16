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
    <div
      className="m-0 min-h-screen flex flex-col justify-center items-center bg-[linear-gradient(140deg,#fff1f1_0%,#ffe5e5_48%,#fff8f6_100%)] bg-fixed overflow-x-hidden relative font-[var(--font-family-base)] before:content-[''] before:absolute before:w-[400px] before:h-[400px] before:bg-[radial-gradient(#ffc2c2,transparent_70%)] before:top-[-100px] before:left-[-100px] before:z-0 before:opacity-60 after:content-[''] after:absolute after:w-[300px] after:h-[300px] after:bg-[radial-gradient(#ffc2c2,transparent_70%)] after:bottom-[-50px] after:right-[-50px] after:z-0 after:opacity-60"
    >
      <div className="absolute top-5 left-10 w-[calc(100%-80px)] flex justify-between items-center z-10 max-[480px]:top-2.5 max-[480px]:left-5">
        <img
          src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
          alt="Virgen de la Candelaria"
          className="w-40 h-auto [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.1))]"
        />
      </div>

      <div className="bg-white/90 border border-white/75 p-[42px] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] text-center w-full max-w-[420px] relative z-[5] animate-fadeInUp backdrop-blur-[12px] max-[480px]:w-[88%] max-[480px]:p-[28px_20px]">
        <h2 className="mt-0 mb-[var(--space-5)] text-[1.65rem] font-bold tracking-[-0.02em] text-[var(--color-brand-500)]">
          Bienvenido
        </h2>

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
              className="w-full box-border py-[15px] px-4 mb-[var(--space-3)] border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
              required
              autoComplete="username"
              aria-describedby={msg ? "login-error" : undefined}
              aria-invalid={!!msg || undefined}
            />
          </div>

          <div className="w-full">
            <label htmlFor="password" className="sr-only">
              Contraseña
            </label>
            <div className="relative w-full mb-[var(--space-3)]">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full box-border py-[15px] px-4 pr-12 mb-0 border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
                required
                autoComplete="current-password"
                aria-describedby={msg ? "login-error" : undefined}
                aria-invalid={!!msg || undefined}
              />
              <button
                type="button"
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-9 h-9 rounded-[10px] border-0 bg-transparent text-[var(--color-text-muted)] inline-flex items-center justify-center cursor-pointer transition-[background,border-color,color] duration-150 hover:bg-[rgba(17,24,39,0.06)] hover:text-[var(--color-text-default)] focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
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
              className="mt-2.5 min-h-5 text-[14px] text-[var(--color-brand-500)] font-medium"
              role="alert"
            >
              {msg}
            </p>
          ) : (
            <p className="mt-2.5 min-h-5 text-[14px]" aria-hidden="true" />
          )}

          <button
            type="submit"
            className="mt-[var(--space-2)] w-full py-[15px] px-4 rounded-[var(--radius-md)] border-0 cursor-pointer text-white font-semibold tracking-[0.35px] bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] shadow-[0_4px_15px_rgba(179,49,49,0.3)] transition-[transform,box-shadow,background] duration-150 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c93838_0%,var(--color-brand-500)_100%)] hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)] active:translate-y-0"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Entrando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-5 flex flex-col gap-2">
          <Link className="text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-500)]" to="/recuperar-password">
            ¿Olvidaste tu contraseña?
          </Link>
          <Link className="text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-500)]" to="/verificar-cuenta">
            Verificar cuenta o reenviar correo
          </Link>
          <Link className="text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-500)] font-semibold" to="/registro">
            Crear Cuenta Nueva
          </Link>
        </div>
      </div>

      <footer
        className="fixed bottom-0 left-0 w-full py-[15px] bg-white/90 backdrop-blur-[5px] text-[12px] text-center border-t border-[#eee] z-10 text-[var(--color-text-muted)]"
        aria-label="Smart Economato"
      >
        Smart Economato
      </footer>
    </div>
  );
}
