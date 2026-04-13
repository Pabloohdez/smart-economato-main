import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "../styles/inicio.css";
import { logout as logoutSession } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { to: "/inicio", label: "Inicio", icon: "fa-solid fa-house", roles: ["administrador", "profesor", "alumno"] },
  { to: "/recepcion", label: "Recepción", icon: "fa-solid fa-truck-ramp-box", roles: ["administrador", "profesor"] },
  { to: "/distribucion", label: "Distribución", icon: "fa-solid fa-truck", roles: ["administrador", "profesor"] },
  { to: "/inventario", label: "Inventario", icon: "fa-solid fa-boxes-stacked", roles: ["administrador", "profesor", "alumno"] },
  { to: "/bajas", label: "Bajas", icon: "fa-solid fa-ban", roles: ["administrador", "profesor"] },
  { to: "/proveedores", label: "Proveedores", icon: "fa-solid fa-building", roles: ["administrador"] },
  { to: "/pedidos", label: "Pedidos", icon: "fa-solid fa-file-invoice", roles: ["administrador", "profesor"] },
  { to: "/escandallos", label: "Escandallos", icon: "fa-solid fa-utensils", roles: ["administrador", "profesor", "alumno"] },
  { to: "/rendimiento", label: "Rendimiento", icon: "fa-solid fa-chart-pie", roles: ["administrador", "profesor"] },
  { to: "/avisos", label: "Avisos", icon: "fa-solid fa-bell", roles: ["administrador", "profesor", "alumno"] },
  {
    to: "/configuracion",
    label: "Configuración",
    icon: "fa-solid fa-gear",
    separated: true,
    roles: ["administrador", "profesor"],
  },
  { to: "/auditoria", label: "Auditoría", icon: "fa-solid fa-clipboard-list", roles: ["administrador"] },
];

function normalizeRole(roleRaw: string): "administrador" | "profesor" | "alumno" | "usuario" {
  const role = roleRaw.trim().toLowerCase();
  if (role === "admin" || role === "administrador") return "administrador";
  if (role === "teacher" || role === "profesor") return "profesor";
  if (role === "student" || role === "alumno") return "alumno";
  if (role === "user" || role === "usuario") return "usuario";
  return "usuario";
}

export default function AppLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userName = String(user?.nombre ?? "Administrador");
  const userEmail = String(user?.email ?? "").trim();
  const userRole = String(user?.role ?? user?.rol ?? "usuario").trim();
  const normalizedRole = normalizeRole(userRole);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Sidebar mobile: cerrar con ESC + bloquear scroll del body
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("sidebar-mobile-open", sidebarOpen);
    return () => {
      document.body.classList.remove("sidebar-mobile-open");
    };
  }, [sidebarOpen]);

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

        <div className="sidebar-footer" ref={menuRef}>
          <button
            type="button"
            className="sidebar-user-button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="sidebar-user-dropdown"
          >
            <div className="avatar" title="Usuario">
              {userName.trim().charAt(0).toUpperCase()}
            </div>

            <span className="sidebar-user-text">
              <span className="sidebar-user-name">{userName}</span>
              <span className="sidebar-user-meta">{userEmail || userRole || "Gestor de Economato"}</span>
            </span>

            <span className="chev sidebar-user-chev" aria-hidden="true">
              {menuOpen ? "▴" : "▾"}
            </span>
          </button>

          {menuOpen && (
            <div className="sidebar-user-dropdown" id="sidebar-user-dropdown" role="menu">
              <div className="userDropdownHeader">
                <div className="avatar avatar-lg">
                  {userName.trim().charAt(0).toUpperCase()}
                </div>

                <div className="userDropdownInfo">
                  <div className="userDropdownName">{userName}</div>
                  <div className="userDropdownRole">{userEmail || "Gestor de Economato"}</div>
                  <span className={`role-badge role-badge--${normalizedRole}`}>
                    {normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)}
                  </span>
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
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-heading">
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
          </div>
        </header>

        <main className="content" id="main-content">
          <div className="page-transition" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
