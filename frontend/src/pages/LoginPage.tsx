import { useState } from "react";
import { login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff, Loader2, Lock, Mail, CheckCircle, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const nav = useNavigate();
  const { updateUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState<"username" | "password" | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const loggedUser = await login(username.trim(), password.trim());
      updateUser(loggedUser as any);
      nav("/inicio");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#dfe4ec] font-[var(--font-family-base)] text-slate-900">
      <main className="grid min-h-[100dvh] w-full grid-cols-[1.25fr_1fr] max-[1024px]:grid-cols-1">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#b33131_0%,#8e2626_50%,#6b1f1f_100%)] px-[clamp(30px,4.8vw,72px)] py-[clamp(28px,5vh,64px)] text-white lg:flex">
          <div
            className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:58px_58px]"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_25%,rgba(44,113,255,0.22),transparent_44%),radial-gradient(circle_at_78%_64%,rgba(34,197,94,0.12),transparent_46%)]" aria-hidden="true" />

          <div className="relative z-[1] flex h-full w-full flex-col">
            <div className="flex items-center gap-5">
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-3xl border border-white/18 bg-white/8 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <img
                  src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
                  alt="Smart Economato"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.36em] text-white/65">Smart Economato</p>
                <p className="m-0 mt-1 text-[14px] font-medium text-white/85">Backoffice operativo para gestión comercial, catálogo y pedidos.</p>
              </div>
            </div>

            <div className="mt-24 max-w-[560px]">
              <p className="m-0 text-[10px] font-medium uppercase tracking-[0.38em] text-[#b33131]">Sistema interno</p>
              <h1 className="m-0 mt-5 text-[clamp(38px,4.2vw,64px)] font-semibold leading-[0.95] tracking-[-0.04em] text-white">
                Panel de
                <br />
                Administración
              </h1>
              <p className="m-0 mt-8 text-[clamp(14px,1vw,18px)] font-normal leading-[1.6] text-white/84">
                Una plataforma potente, segura y preparada para el ritmo diario del backoffice.
              </p>
            </div>

            <div className="mt-14 grid max-w-[620px] gap-8 border-l border-white/16 pl-5">
              <article className="flex items-start gap-4">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-[#4dd0e1] mt-1" aria-hidden="true" />
                <div className="grid gap-1">
                  <p className="m-0 text-[9px] font-medium uppercase tracking-[0.3em] text-[#b33131]">Operativa</p>
                  <p className="m-0 text-[13px] font-normal leading-7 text-white/86">Catálogo, pedidos y presupuestos bajo un mismo criterio operativo.</p>
                </div>
              </article>
              <article className="flex items-start gap-4">
                <Shield className="h-5 w-5 flex-shrink-0 text-[#64b5f6] mt-1" aria-hidden="true" />
                <div className="grid gap-1">
                  <p className="m-0 text-[9px] font-medium uppercase tracking-[0.3em] text-[#b33131]">Seguridad</p>
                  <p className="m-0 text-[13px] font-normal leading-7 text-white/86">Entrada reservada a personal autorizado y gobernada por permisos.</p>
                </div>
              </article>
              <article className="flex items-start gap-4">
                <Zap className="h-5 w-5 flex-shrink-0 text-[#81c784] mt-1" aria-hidden="true" />
                <div className="grid gap-1">
                  <p className="m-0 text-[9px] font-medium uppercase tracking-[0.3em] text-[#b33131]">Seguimiento</p>
                  <p className="m-0 text-[13px] font-normal leading-7 text-white/86">Actividad comercial conectada sin ruido visual ni pasos sobrantes.</p>
                </div>
              </article>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-white/14 pt-8 text-[11px] font-normal text-white/56">
              <span>Uso interno de Smart Economato. Acceso reservado a personal autorizado.</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </section>

        <section className="relative flex flex-1 items-center justify-center bg-[#dfe4ec] px-6 py-10 max-[1024px]:bg-[linear-gradient(180deg,#dfe4ec_0%,#e9edf3_100%)]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[480px] rounded-[30px] border border-slate-200 bg-[#fbfcfe] shadow-2xl"
          >
            <div className="border-b border-slate-200 px-[clamp(20px,3.4vw,34px)] py-[clamp(18px,3vh,28px)]">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.28em] text-[#b33131]">Acceso seguro</p>
              <h2 className="m-0 mt-3 text-[32px] font-semibold leading-[1.02] tracking-[-0.02em] text-slate-900">Iniciar sesión</h2>
              <p className="m-0 mt-3 text-[14px] font-normal leading-7 text-slate-500">
                Introduce tus credenciales para acceder al panel operativo de Smart Economato.
              </p>
            </div>

            <div className="px-[clamp(20px,3.4vw,34px)] py-[clamp(20px,3.4vw,32px)]">
              <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
                <div>
                  <label htmlFor="username" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200 ${activeField === "username" ? "text-[#b33131]" : "text-slate-400"}`} aria-hidden="true" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setActiveField("username")}
                      onBlur={() => setActiveField(null)}
                      placeholder="tu-email@empresa.com"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] pl-11 pr-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                      required
                      autoComplete="username"
                      aria-describedby={msg ? "login-error" : undefined}
                      aria-invalid={!!msg || undefined}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Contraseña
                    </label>
                    <Link className="text-[13px] font-semibold text-slate-500 transition-colors hover:text-[#b33131]" to="/recuperar-password">
                      Recuperar acceso
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200 ${activeField === "password" ? "text-[#b33131]" : "text-slate-400"}`} aria-hidden="true" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setActiveField("password")}
                      onBlur={() => setActiveField(null)}
                      placeholder="Tu contraseña"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] pl-11 pr-12 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                      required
                      autoComplete="current-password"
                      aria-describedby={msg ? "login-error" : undefined}
                      aria-invalid={!!msg || undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-[8px] top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border-0 bg-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {msg ? (
                  <p id="login-error" className="m-0 rounded-2xl border border-[#ffd1d1] bg-[#fff6f6] px-4 py-3 text-[13px] font-medium text-[#9f2a2a]" role="alert">
                    {msg}
                  </p>
                ) : null}

                <div className="pt-2" />

                <motion.button
                  type="submit"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="mt-1 inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,#b33131_0%,#8e2626_100%)] px-4 text-[18px] font-semibold text-white shadow-[0_16px_32px_rgba(179,49,49,0.36)] transition-all duration-150 hover:shadow-[0_20px_40px_rgba(179,49,49,0.42)] disabled:cursor-not-allowed disabled:opacity-75"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      Iniciando sesión
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    </>
                  ) : (
                    "Acceder al backoffice"
                  )}
                </motion.button>
              </form>

              <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 text-[13px] text-slate-500">
                <Link className="inline-flex items-center gap-2 font-medium transition-colors hover:text-[#b33131]" to="/verificar-cuenta">
                  Verificar cuenta o reenviar correo de activación
                </Link>
                <p className="m-0">
                  ¿Aún no tienes cuenta?{" "}
                  <Link className="font-semibold text-[#b33131] transition-colors hover:text-[#8e2626]" to="/registro">
                    Solicitar alta de usuario
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
