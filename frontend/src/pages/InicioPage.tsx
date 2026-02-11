import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

const cards = [
  { title: "Recepción", desc: "Registrar entradas de mercancía", to: "/recepcion", icon: "📥" },
  { title: "Distribución", desc: "Salidas a almacenes o áreas", to: "/distribucion", icon: "🚚" },
  { title: "Inventario", desc: "Consultar stock y buscar artículos", to: "/inventario", icon: "📦" },
  { title: "Bajas", desc: "Roturas, caducados y ajustes", to: "/bajas", icon: "⛔" },
  { title: "Proveedores", desc: "Altas, contacto y listas", to: "/proveedores", icon: "🏢" },
  { title: "Pedidos", desc: "Crear, revisar y recibir", to: "/pedidos", icon: "🧾" },
  { title: "Escandallos", desc: "Recetas y costes", to: "/escandallos", icon: "🍽️" },
  { title: "Informes", desc: "Consumo, costes y trazabilidad", to: "/informes", icon: "📊" },
  { title: "Configuración", desc: "Unidades, impuestos, centro", to: "/configuracion", icon: "⚙️" },
];

export default function InicioPage() {
  const nav = useNavigate();

  return (
    <div className="dashboard-grid">
      {cards.map((c) => (
        <button
          key={c.to}
          className="card"
          type="button"
          onClick={() => nav(c.to)}
        >
          <div className="card-ico" aria-hidden="true">{c.icon}</div>
          <h3 className="card-title">{c.title}</h3>
          <p className="card-desc">{c.desc}</p>
        </button>
      ))}
    </div>
  );
}
