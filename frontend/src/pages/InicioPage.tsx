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
    <div className="grid grid-cols-3 gap-[25px] w-full max-w-[1000px] mx-auto max-[1100px]:grid-cols-2 max-[520px]:grid-cols-1 max-[520px]:gap-4">
      {cards.map((c) => (
        <button
          key={c.to}
          className="bg-[var(--color-bg-surface)] rounded-2xl shadow-[var(--shadow-md)] border border-black/5 px-[25px] py-[30px] cursor-pointer text-center transition-[transform,box-shadow,border-color] duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] flex flex-col items-center no-underline hover:-translate-y-[5px] hover:shadow-[var(--shadow-lg)] hover:border-[rgba(179,49,49,0.10)]"
          type="button"
          onClick={() => nav(c.to)}>
          <div className="text-[38px] text-[var(--color-brand-500)] mb-5 leading-none transition-transform duration-300 group-hover:scale-110" aria-hidden="true">
            <i className={c.icon}></i>
          </div>
          <h3 className="m-0 mb-2.5 text-[#2d3748] text-[20px] font-bold">{c.title}</h3>
          <p className="m-0 text-[var(--color-text-muted)] text-[14px] leading-[1.5]">{c.desc}</p>
        </button>
      ))}
    </div>
  );
}
