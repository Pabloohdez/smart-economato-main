import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "../styles/inicio.css";
import { logout as logoutSession } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { to: "/inicio", label: "Inicio", icon: "fa-solid fa-house" },
  { to: "/recepcion", label: "Recepción", icon: "fa-solid fa-truck-ramp-box" },
  { to: "/distribucion", label: "Distribución", icon: "fa-solid fa-truck" },
  { to: "/inventario", label: "Inventario", icon: "fa-solid fa-boxes-stacked" },
  { to: "/bajas", label: "Bajas", icon: "fa-solid fa-ban" },
  { to: "/proveedores", label: "Proveedores", icon: "fa-solid fa-building" },
  { to: "/pedidos", label: "Pedidos", icon: "fa-solid fa-file-invoice" },
  { to: "/escandallos", label: "Escandallos", icon: "fa-solid fa-utensils" },
  { to: "/rendimiento", label: "Rendimiento", icon: "fa-solid fa-chart-pie" },
  { to: "/avisos", label: "Avisos", icon: "fa-solid fa-bell" },
  {
    to: "/configuracion",
    label: "Configuración",
    icon: "fa-solid fa-gear",
    separated: true,
  },
  { to: "/auditoria", label: "Auditoría", icon: "fa-solid fa-clipboard-list" },
];

export default function AppLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userName = String(user?.nombre ?? "Administrador");

  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Encontrar sección actual para el título
  const currentItem = navItems.find((it) => it.to === location.pathname) || {
    label: "Panel de Control",
    icon: "fa-solid fa-chart-line",
  };

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
    logoutSession();
    nav("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      {/* Overlay for mobile sidebar */}
      <div
        className={`menu-overlay ${sidebarOpen ? "active" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        className={`sidebar ${sidebarOpen ? "open" : ""}`}
        aria-label="Navegacion principal"
      >
        <NavLink to="/inicio" className="brand">
          <img
            src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
            alt="CIFP Virgen de la Candelaria"
            className="brand-logo"
          />
        </NavLink>

        <nav className="nav" aria-label="Secciones del sistema">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""} ${it.separated ? "nav-item-separated" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="menu-toggle"
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Abrir menú"
              aria-controls="app-sidebar"
              aria-expanded={sidebarOpen}
            >
              <i className="fa-solid fa-bars" />
            </button>
            <h1 className="topbar-title">
              <i
                className={currentItem.icon}
                style={{
                  marginRight: "10px",
                  fontSize: "0.9em",
                  color: "var(--brand)",
                  opacity: 0.8,
                }}
              />
              {currentItem.label}
            </h1>
          </div>

          <div className="userMenu" ref={menuRef}>
            <button
              type="button"
              className="userButton"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="user-menu-dropdown"
            >
              <span className="userText">
                <span className="userName">
                  {userName}
                </span>
                <span className="userRole">Gestor de Economato</span>
              </span>

              <div className="avatar" title="Usuario">
                {userName
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <span className="chev" aria-hidden="true">
                {menuOpen ? "▴" : "▾"}
              </span>
            </button>

            {menuOpen && (
              <div className="userDropdown" id="user-menu-dropdown" role="menu">
                <div className="userDropdownHeader">
                  <div className="avatar avatar-lg">
                    {userName
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="userDropdownInfo">
                    <div className="userDropdownName">
                      {userName}
                    </div>
                    <div className="userDropdownRole">Gestor de Economato</div>
                  </div>
                </div>

                <button
                  className="ddItem"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    nav("/avisos");
                  }}
                >
                  <span className="ddLeft">
                    <i className="fa-solid fa-bell"></i>
                    <span>Centro de avisos</span>
                  </span>
                  <span className="ddBadge">15</span>
                </button>

                <button
                  className="ddItem"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    nav("/configuracion");
                  }}
                >
                  <span className="ddLeft">
                    <i className="fa-solid fa-gear"></i>
                    <span>Configuración</span>
                  </span>
                </button>

                <div className="ddMetaRow">
                  <span className="ddLeft ddMuted">
                    <i className="fa-solid fa-clock"></i>
                    <span>Sesión iniciada</span>
                  </span>
                  <span className="ddMetaValue">hoy</span>
                </div>

                <div className="ddMetaRow">
                  <span className="ddLeft ddMuted">
                    <i className="fa-solid fa-calendar-days"></i>
                    <span>Fecha</span>
                  </span>
                  <span className="ddMetaValue">
                    {new Intl.DateTimeFormat("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    }).format(new Date())}
                  </span>
                </div>

                <div className="ddSep" />

                <button className="ddDanger" type="button" onClick={logout}>
                  <i className="fa-solid fa-right-from-bracket"></i>
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
