import { useNavigate } from "react-router-dom";

const cards = [
  { title: "Recepción", desc: "Registrar entradas de mercancía", to: "/recepcion", icon: "fa-solid fa-truck-ramp-box" },
  { title: "Distribución", desc: "Salidas a almacenes o áreas", to: "/distribucion", icon: "fa-solid fa-truck" },
  { title: "Inventario", desc: "Consultar stock y buscar artículos", to: "/inventario", icon: "fa-solid fa-boxes-stacked" },
  { title: "Bajas", desc: "Roturas, caducados y ajustes", to: "/bajas", icon: "fa-solid fa-circle-exclamation" },
  { title: "Proveedores", desc: "Altas, contacto y listas", to: "/proveedores", icon: "fa-solid fa-address-book" },
  { title: "Pedidos", desc: "Crear, revisar y recibir", to: "/pedidos", icon: "fa-solid fa-file-invoice-dollar" },
  { title: "Escandallos", desc: "Recetas y costes", to: "/escandallos", icon: "fa-solid fa-utensils" },
  { title: "Rendimiento", desc: "Mermas y aprovechamiento", to: "/rendimiento", icon: "fa-solid fa-chart-pie" },
  { title: "Avisos", desc: "Alertas de stock, caducidad y gastos", to: "/avisos", icon: "fa-solid fa-bell" },
];

export default function InicioPage() {
  const nav = useNavigate();

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="m-0 text-[26px] font-extrabold text-[var(--color-text-strong)] tracking-[-0.02em]">
          Panel de inicio
        </h1>
        <p className="m-0 mt-1 text-[14px] text-[var(--color-text-muted)] font-semibold">
          Accesos rápidos a las secciones principales
        </p>
      </div>

      <div className="grid grid-cols-3 gap-[25px] w-full max-w-[1100px] max-[1100px]:grid-cols-2 max-[520px]:grid-cols-1 max-[520px]:gap-4">
        {cards.map((c) => (
          <button
            key={c.to}
            className="group bg-[var(--color-bg-surface)] rounded-2xl shadow-[var(--shadow-md)] border border-black/5 px-[25px] py-[30px] cursor-pointer text-left transition-[transform,box-shadow,border-color] duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] flex w-full flex-col hover:-translate-y-[4px] hover:shadow-[var(--shadow-lg)] hover:border-[rgba(179,49,49,0.12)]"
            type="button"
            onClick={() => nav(c.to)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Sección
                </div>
                <h3 className="m-0 mt-1 text-[#111827] text-[20px] font-extrabold">
                  {c.title}
                </h3>
              </div>
              <div className="text-[34px] text-[var(--color-brand-500)] leading-none transition-transform duration-300 group-hover:scale-110" aria-hidden="true">
                <i className={c.icon}></i>
              </div>
            </div>

            <p className="m-0 mt-3 text-[var(--color-text-muted)] text-[14px] leading-[1.55] font-semibold">
              {c.desc}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-[var(--color-brand-600)]">
              Ir a {c.title} <i className="fa-solid fa-arrow-right-long text-[12px]" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
