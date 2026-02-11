import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../styles/inicio.css";

const navItems = [
  { to: "/inicio", label: "Inicio", icon: "🏠" },
  { to: "/recepcion", label: "Recepción", icon: "📦" },
  { to: "/distribucion", label: "Distribución", icon: "🚚" },
  { to: "/inventario", label: "Inventario", icon: "🧰" },
  { to: "/bajas", label: "Bajas", icon: "⛔" },
  { to: "/proveedores", label: "Proveedores", icon: "🏢" },
  { to: "/pedidos", label: "Pedidos", icon: "🧾" },
  { to: "/escandallos", label: "Escandallos", icon: "🍽️" },
  { to: "/informes", label: "Informes", icon: "📊" },
  { to: "/configuracion", label: "Configuración", icon: "⚙️" },
];

export default function AppLayout() {
  const nav = useNavigate();
  const userRaw = localStorage.getItem("usuarioActivo");
  const user = userRaw ? JSON.parse(userRaw) : null;

  function logout() {
    localStorage.removeItem("usuarioActivo");
    nav("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
            alt="CIFP Virgen de la Candelaria"
            className="brand-logo"
          />
        </div>

        <nav className="nav">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-ico" aria-hidden="true">{it.icon}</span>
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="logout" onClick={logout}>
          ⬅ Salir
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1 className="topbar-title">Panel de Control</h1>

          <div className="topbar-user">
            <span className="topbar-hello">
              Hola, {user?.nombre ?? "Administrador"}
            </span>
            <div className="avatar" title="Usuario">
              {String(user?.nombre ?? "A").trim().charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
