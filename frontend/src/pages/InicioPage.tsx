import { useNavigate } from "react-router-dom";
import "../styles/inicio.css";

const cards = [
  { title: "Recepción", desc: "Registrar entradas de mercancía", to: "/recepcion", icon: "fa-solid fa-truck-ramp-box" },
  { title: "Distribución", desc: "Salidas a almacenes o áreas", to: "/distribucion", icon: "fa-solid fa-truck" },
  { title: "Inventario", desc: "Consultar stock y buscar artículos", to: "/inventario", icon: "fa-solid fa-boxes-stacked" },
  { title: "Bajas", desc: "Roturas, caducados y ajustes", to: "/bajas", icon: "fa-solid fa-circle-exclamation" },
  { title: "Proveedores", desc: "Altas, contacto y listas", to: "/proveedores", icon: "fa-solid fa-building" },
  { title: "Pedidos", desc: "Crear, revisar y recibir", to: "/pedidos", icon: "fa-solid fa-file-invoice" },
  { title: "Escandallos", desc: "Recetas y costes", to: "/escandallos", icon: "fa-solid fa-utensils" },
  { title: "Informes", desc: "Consumo, costes y trazabilidad", to: "/informes", icon: "fa-solid fa-chart-column" },
  { title: "Configuración", desc: "Unidades, impuestos, centro", to: "/configuracion", icon: "fa-solid fa-gear" },
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
          onClick={() => nav(c.to)}>
            <div className="card-ico" aria-hidden="true">
              <i className={c.icon}></i>
            </div>
          <h3 className="card-title">{c.title}</h3>
          <p className="card-desc">{c.desc}</p>
        </button>
      ))}
    </div>
  );
}
