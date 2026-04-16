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
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-[linear-gradient(135deg,#fff0f0_0%,#ffdada_100%)] bg-fixed overflow-x-hidden px-4 pt-[90px] pb-[80px] box-border">
      <div className="pointer-events-none absolute -top-[100px] -left-[100px] h-[400px] w-[400px] opacity-60 bg-[radial-gradient(#ffc2c2,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-[50px] -right-[50px] h-[300px] w-[300px] opacity-60 bg-[radial-gradient(#ffc2c2,transparent_70%)]" />

      <div className="absolute top-5 left-10 w-[calc(100%-80px)] flex justify-between items-center z-10 max-[600px]:top-2.5 max-[600px]:left-5 max-[600px]:w-[calc(100%-40px)]">
        <img
          src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
          alt="Virgen de la Candelaria"
          className="w-40 h-auto [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.1))] max-[480px]:w-[130px]"
        />

        <Link
          to="/login"
          className="text-[24px] text-[var(--color-brand-500)] no-underline transition-colors hover:text-[var(--color-brand-600)]"
          aria-label="Volver al login"
        >
          &#8592;
        </Link>
      </div>

      <div className="w-full max-w-[520px] text-center relative z-[5] bg-white/85 [backdrop-filter:blur(12px)] border border-white/60 px-8 py-9 rounded-[20px] shadow-[0_8px_32px_0_rgba(179,49,49,0.15)] animate-fadeInUp box-border max-[600px]:max-w-[420px] max-[600px]:px-5 max-[600px]:py-7 max-[480px]:w-[92%]">
        <h2 className="text-[1.5rem] font-semibold text-[var(--color-brand-500)] mb-5">Crear Cuenta</h2>

        <form className="flex flex-col w-full" onSubmit={onSubmit}>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Nombre de usuario"
            className="w-full box-border p-[15px] mb-[15px] border-2 border-transparent bg-[#f9f9f9] rounded-xl text-[14px] text-[#333] transition-[border-color,box-shadow,background] duration-200 placeholder:text-[#aaa] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none"
            required
            aria-label="Nombre de usuario"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full box-border p-[15px] mb-[15px] border-2 border-transparent bg-[#f9f9f9] rounded-xl text-[14px] text-[#333] transition-[border-color,box-shadow,background] duration-200 placeholder:text-[#aaa] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none"
            required
            aria-label="Contraseña"
          />

          <div className="flex gap-2.5 w-full max-[600px]:flex-col max-[600px]:gap-0">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre"
              className="w-full box-border p-[15px] mb-[15px] border-2 border-transparent bg-[#f9f9f9] rounded-xl text-[14px] text-[#333] transition-[border-color,box-shadow,background] duration-200 placeholder:text-[#aaa] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none flex-1"
              required
              aria-label="Nombre"
            />

            <input
              type="text"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              placeholder="Apellidos"
              className="w-full box-border p-[15px] mb-[15px] border-2 border-transparent bg-[#f9f9f9] rounded-xl text-[14px] text-[#333] transition-[border-color,box-shadow,background] duration-200 placeholder:text-[#aaa] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none flex-1"
              required
              aria-label="Apellidos"
            />
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            className="w-full box-border p-[15px] mb-[15px] border-2 border-transparent bg-[#f9f9f9] rounded-xl text-[14px] text-[#333] transition-[border-color,box-shadow,background] duration-200 placeholder:text-[#aaa] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none"
            required
            aria-label="Correo electrónico"
          />

          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Teléfono"
            className="w-full box-border p-[15px] mb-[15px] border-2 border-transparent bg-[#f9f9f9] rounded-xl text-[14px] text-[#333] transition-[border-color,box-shadow,background] duration-200 placeholder:text-[#aaa] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none"
            required
            aria-label="Número de teléfono"
          />

          {msg && <Alert type={msgTipo}>{msg}</Alert>}
          <button
            type="submit"
            className="w-full box-border p-[15px] mt-2.5 rounded-xl text-[14px] bg-[var(--color-brand-500)] text-white font-semibold tracking-wide cursor-pointer border-0 shadow-[0_4px_15px_rgba(179,49,49,0.3)] transition-[transform,box-shadow,background-color,filter] duration-200 hover:bg-[var(--color-brand-600)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <Link to="/login" className="text-[13px] text-[#666] no-underline transition-colors mt-4 inline-block hover:text-[var(--color-brand-500)]">
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </div>

      <footer className="fixed bottom-0 left-0 w-full py-4 bg-white/90 [backdrop-filter:blur(5px)] text-[#777] text-[12px] text-center border-t border-t-[#eee] z-10">
        © 2025 Pablo Hdez. Todos los derechos reservados.
      </footer>
    </div>
  );
}