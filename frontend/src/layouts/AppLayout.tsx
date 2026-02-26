import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "../styles/inicio.css";

const navItems = [
  { to: "/inicio", label: "Inicio", icon: "fa-solid fa-house" },
  { to: "/recepcion", label: "Recepción", icon: "fa-solid fa-truck-ramp-box" },
  { to: "/distribucion", label: "Distribución", icon: "fa-solid fa-truck" },
  { to: "/inventario", label: "Inventario", icon: "fa-solid fa-boxes-stacked" },
  { to: "/bajas", label: "Bajas", icon: "fa-solid fa-ban" },
  { to: "/proveedores", label: "Proveedores", icon: "fa-solid fa-building" },
  { to: "/pedidos", label: "Pedidos", icon: "fa-solid fa-file-invoice" },
  { to: "/escandallos", label: "Escandallos", icon: "fa-solid fa-utensils" },
  { to: "/informes", label: "Informes", icon: "fa-solid fa-chart-column" },
  { to: "/configuracion", label: "Configuración", icon: "fa-solid fa-gear" },
];

export default function AppLayout() {
  const nav = useNavigate();
  const userRaw = localStorage.getItem("usuarioActivo");
  const user = userRaw ? JSON.parse(userRaw) : null;
    
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
  const onClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Node)) return;

    if (menuRef.current && !menuRef.current.contains(target)) {
      setMenuOpen(false);
    }
  };

  document.addEventListener("mousedown", onClick);
  return () => document.removeEventListener("mousedown", onClick);
}, []);

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
              <span className="nav-ico" aria-hidden="true">
                <i className={it.icon} />
              </span>
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

                    <div className="userMenu" ref={menuRef}>
            <button
              type="button"
              className="userButton"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="userText">
                <span className="userName">{user?.nombre ?? "Administrador"}</span>
                <span className="userRole">Gestor de Economato</span>
              </span>

              <div className="avatar" title="Usuario">
                {String(user?.nombre ?? "A").trim().charAt(0).toUpperCase()}
              </div>

              <span className="chev" aria-hidden="true">▾</span>
            </button>

            {menuOpen && (
              <div className="userDropdown">
                <button className="ddItem" type="button" onClick={() => setMenuOpen(false)}>
                  Centro de avisos
                </button>

                <button
                  className="ddItem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    nav("/configuracion");
                  }}
                >
                  Configuración
                </button>

                <div className="ddMeta">
                  <div>Sesión iniciada</div>
                  <div className="ddMuted">hoy</div>
                </div>

                <div className="ddSep" />

                <button className="ddDanger" type="button" onClick={logout}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
