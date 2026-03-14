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
                `nav-item ${isActive ? "active" : ""} ${it.separated ? "nav-item-separated" : ""}`
              }
            >
              <span className="nav-ico" aria-hidden="true" style={{color: "var(--brand)"}}>
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
                <span className="userName">
                  {user?.nombre ?? "Administrador"}
                </span>
                <span className="userRole">Gestor de Economato</span>
              </span>

              <div className="avatar" title="Usuario">
                {String(user?.nombre ?? "A")
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <span className="chev" aria-hidden="true">
                {menuOpen ? "▴" : "▾"}
              </span>
            </button>

            {menuOpen && (
              <div className="userDropdown">
                <div className="userDropdownHeader">
                  <div className="avatar avatar-lg">
                    {String(user?.nombre ?? "A")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="userDropdownInfo">
                    <div className="userDropdownName">
                      {user?.nombre ?? "Administrador"}
                    </div>
                    <div className="userDropdownRole">Gestor de Economato</div>
                  </div>
                </div>

                <button
                  className="ddItem"
                  type="button"
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

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
