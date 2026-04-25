import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Alert from "../components/ui/Alert";
import { resendVerification, verifyAccount } from "../services/authService";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";
import { Mail, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function VerifyAccountPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState(token ? "Verificando cuenta..." : "Introduce tu correo para reenviar el mensaje de verificación.");
  const [type, setType] = useState<"success" | "error" | "info">(token ? "info" : "info");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    setLoading(true);

    verifyAccount(token)
      .then((response) => {
        if (!active) {
          return;
        }
        setType("success");
        setVerified(true);
        setMessage(response.data?.message || response.message || "Cuenta verificada correctamente.");
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setType("error");
        setMessage(error instanceof Error ? error.message : "No se pudo verificar la cuenta.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    const normalizedEmail = normalizeOptionalEmail(email);
    if (!normalizedEmail || !isValidOptionalEmail(normalizedEmail)) {
      setType("error");
      setMessage("Introduce un correo electrónico válido.");
      return;
    }

    setLoading(true);
    try {
      const response = await resendVerification(normalizedEmail);
      setType("success");
      setMessage(response.data?.message || response.message || "Correo reenviado.");
    } catch (error) {
      setType("error");
      setMessage(error instanceof Error ? error.message : "No se pudo reenviar el correo de verificación.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#dfe4ec] font-[var(--font-family-base)] text-slate-900">
      <main className="grid min-h-full w-full lg:grid-cols-[1.25fr_1fr]">

        {/* PANEL IZQUIERDO */}
        <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#b33131_0%,#8e2626_50%,#6b1f1f_100%)] text-white lg:flex lg:flex-col lg:min-h-screen">
          <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:58px_58px]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_25%,rgba(44,113,255,0.18),transparent_44%),radial-gradient(circle_at_78%_64%,rgba(34,197,94,0.10),transparent_46%)]" aria-hidden="true" />

          {/* --- CONTENEDOR MAESTRO --- */}
          {/* El pl-[...] genera el hueco vacío a la izquierda */}
          <div className="relative z-10 flex flex-1 pl-[clamp(40px,6vw,90px)]">
            
            {/* 1. LÍNEA VERTICAL LARGA (border-l) */}
            {/* Como tiene flex-1, va obligatoriamente de arriba a abajo de la pantalla */}
            <div className="flex flex-1 flex-col border-l border-white/20">
              
              {/* Contenido Principal (Empuja el footer hacia abajo) */}
              <div className="flex flex-1 flex-col justify-center px-[clamp(32px,4vw,64px)] py-12">
                <div className="max-w-[560px]">
                  <p className="m-0 text-[10px] font-medium uppercase tracking-[0.38em] text-white/60">Sistema interno</p>
                  <h1 className="m-0 mt-5 text-[clamp(38px,4.2vw,64px)] font-semibold leading-[0.95] tracking-[-0.04em] text-white">
                    Verificar
                    <br />
                    cuenta
                  </h1>
                  <p className="m-0 mt-8 text-[clamp(14px,1vw,18px)] font-normal leading-[1.6] text-white/84">
                    Confirma tu dirección de correo para activar el acceso al panel operativo.
                  </p>
                </div>

                {/* 2. LÍNEA VERTICAL CORTA (Para los 3 items) */}
                <div className="mt-14 max-w-[560px] space-y-8 border-l border-white/60 py-2 pl-6">
                  <article>
                    <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Activación</p>
                    <p className="m-0 mt-1.5 text-sm font-normal leading-relaxed text-white/90">Haz clic en el enlace del correo o introduce tu email para recibir uno nuevo.</p>
                  </article>
                  <article>
                    <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Seguridad</p>
                    <p className="m-0 mt-1.5 text-sm font-normal leading-relaxed text-white/90">El enlace de verificación expira pasado un tiempo por seguridad.</p>
                  </article>
                  <article>
                    <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Soporte</p>
                    <p className="m-0 mt-1.5 text-sm font-normal leading-relaxed text-white/90">Si tienes problemas, contacta con el administrador del sistema.</p>
                  </article>
                </div>
              </div>

              {/* 3. LÍNEA HORIZONTAL (Footer border-t) */}
              {/* Conecta directamente con la esquina de la vertical larga */}
              <div className="flex h-[90px] items-center justify-between border-t border-white/20 px-[clamp(32px,4vw,64px)] text-[11px] font-normal text-white/56">
                <span>Uso interno de Smart Economato. Acceso reservado a personal autorizado.</span>
                <span>© {new Date().getFullYear()}</span>
              </div>

            </div>
          </div>
        </section>

        {/* PANEL DERECHO */}
        <section className="relative flex min-h-screen w-full items-center justify-center bg-[#dfe4ec] px-6 py-10 lg:min-h-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[480px] rounded-[30px] border border-slate-200 bg-[#fbfcfe] shadow-2xl"
          >
            <div className="border-b border-slate-200 px-[clamp(20px,3.4vw,34px)] py-[clamp(18px,3vh,28px)]">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.28em] text-[#b33131]">Activación de cuenta</p>
              <h2 className="m-0 mt-3 text-[32px] font-semibold leading-[1.02] tracking-[-0.02em] text-slate-900">Verificar cuenta</h2>
              <p className="m-0 mt-3 text-[14px] font-normal leading-7 text-slate-500">
                {verified
                  ? "Tu cuenta ya está lista para iniciar sesión."
                  : "Puedes validar el enlace recibido o pedir que te enviemos uno nuevo."}
              </p>
            </div>

            <div className="px-[clamp(20px,3.4vw,34px)] py-[clamp(20px,3.4vw,32px)]">
              {message ? <div className="mb-5"><Alert type={type === "info" ? "info" : type}>{message}</Alert></div> : null}

              {!verified ? (
                <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
                  <div>
                    <label htmlFor="verify-email" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="verify-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@ejemplo.com"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-[#f2f5fa] pl-11 pr-4 text-[14px] font-medium text-slate-800 transition-all duration-150 placeholder:text-slate-400 focus:border-[#b33131] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#b33131]/20"
                        required
                        autoComplete="email"
                        disabled={loading && Boolean(token)}
                      />
                    </div>
                  </div>

                  <div className="pt-1" />

                  <motion.button
                    type="submit"
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,#c0392b_0%,#96281b_100%)] px-4 text-[18px] font-semibold text-white shadow-lg shadow-red-500/20 transition-all duration-150 hover:shadow-xl hover:shadow-red-500/30 disabled:cursor-not-allowed disabled:opacity-75"
                    disabled={loading}
                  >
                    {loading && !token ? (
                      <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Enviando...</>
                    ) : "Reenviar verificación"}
                  </motion.button>
                </form>
              ) : null}

              <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 text-[13px] text-slate-500">
                <Link className="inline-flex items-center gap-2 font-medium transition-colors hover:text-[#b33131]" to="/login">
                  Volver al inicio de sesión
                </Link>
                <Link className="inline-flex items-center gap-2 font-medium transition-colors hover:text-[#b33131]" to="/recuperar-password">
                  ¿Necesitas recuperar la contraseña?
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}