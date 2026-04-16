import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Alert from "../components/ui/Alert";
import { resendVerification, verifyAccount } from "../services/authService";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";

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
    <div className="m-0 min-h-screen flex flex-col justify-center items-center bg-[linear-gradient(140deg,#fff1f1_0%,#ffe5e5_48%,#fff8f6_100%)] bg-fixed overflow-x-hidden relative font-[var(--font-family-base)] before:content-[''] before:absolute before:w-[400px] before:h-[400px] before:bg-[radial-gradient(#ffc2c2,transparent_70%)] before:top-[-100px] before:left-[-100px] before:z-0 before:opacity-60 after:content-[''] after:absolute after:w-[300px] after:h-[300px] after:bg-[radial-gradient(#ffc2c2,transparent_70%)] after:bottom-[-50px] after:right-[-50px] after:z-0 after:opacity-60">
      <div className="absolute top-5 left-10 w-[calc(100%-80px)] flex justify-between items-center z-10 max-[480px]:top-2.5 max-[480px]:left-5">
        <img
          src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
          alt="Virgen de la Candelaria"
          className="w-40 h-auto [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.1))]"
        />
      </div>

      <div className="bg-white/90 border border-white/75 p-[42px] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] text-center w-full max-w-[460px] relative z-[5] animate-fadeInUp backdrop-blur-[12px] max-[480px]:w-[88%] max-[480px]:p-[28px_20px]">
        <h2 className="mt-0 mb-[var(--space-5)] text-[1.65rem] font-bold tracking-[-0.02em] text-[var(--color-brand-500)]">
          Verificar cuenta
        </h2>
        <p className="block mt-0 mb-[18px] text-[14px] leading-[1.5] text-[var(--color-text-muted)]">
          {verified
            ? "Tu cuenta ya está lista para iniciar sesión."
            : "Puedes validar el enlace recibido o pedir que te enviemos uno nuevo."}
        </p>

        {message ? <Alert type={type === "info" ? "info" : type}>{message}</Alert> : null}

        {!verified ? (
          <form className="flex flex-col w-full" onSubmit={onSubmit}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Correo electrónico"
              className="w-full box-border py-[15px] px-4 mb-[var(--space-3)] border-2 border-transparent bg-[#f8fafc] rounded-[var(--radius-md)] text-[14px] font-inherit text-[var(--color-text-default)] transition-[border-color,box-shadow,background-color,transform] duration-150 placeholder:text-[#9ca3af] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none focus-visible:outline-[3px] focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2"
              required
              autoComplete="email"
              disabled={loading && Boolean(token)}
            />

            <button
              type="submit"
              className="mt-[var(--space-2)] w-full py-[15px] px-4 rounded-[var(--radius-md)] border-0 cursor-pointer text-white font-semibold tracking-[0.35px] bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] shadow-[0_4px_15px_rgba(179,49,49,0.3)] transition-[transform,box-shadow,background] duration-150 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#c93838_0%,var(--color-brand-500)_100%)] hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)] active:translate-y-0"
              disabled={loading}
            >
              {loading && !token ? "Enviando..." : "Reenviar verificación"}
            </button>
          </form>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <Link className="text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-500)]" to="/login">
            Ir al inicio de sesión
          </Link>
          <Link className="text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-500)]" to="/recuperar-password">
            ¿Necesitas recuperar la contraseña?
          </Link>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 w-full py-[15px] bg-white/90 backdrop-blur-[5px] text-[12px] text-center border-t border-[#eee] z-10 text-[var(--color-text-muted)]">
        © 2025 Pablo Hdez. Todos los derechos reservados.
      </footer>
    </div>
  );
}