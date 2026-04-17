import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { logout as logoutSession } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import { getProductos } from "../services/productosService";
import { queryKeys } from "../lib/queryClient";

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

  // Badge dinámico de avisos (caducados + stock bajo)
  const productosQuery = useQuery({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
    refetchInterval: 60_000,
  });

  const avisosCount = useMemo(() => {
    const productos: any[] = Array.isArray(productosQuery.data) ? productosQuery.data : [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let caducados = 0;
    let stockBajo = 0;

    for (const p of productos) {
      const stock = Number(p.stock ?? 0);
      const stockMin = Number(p.stockMinimo ?? p.stockminimo ?? 0);
      const fechaRaw = p.fechaCaducidad ?? p.fechacaducidad ?? null;

      if (stockMin > 0 && stock <= stockMin) {
        stockBajo += 1;
      }

      if (stock > 0 && fechaRaw && fechaRaw !== "NULL" && fechaRaw !== "Sin fecha") {
        const fecha = new Date(String(fechaRaw));
        if (!Number.isNaN(fecha.getTime()) && fecha < hoy) {
          caducados += 1;
        }
      }
    }

    return caducados + stockBajo;
  }, [productosQuery.data]);

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
  useEffect(() => {
    if (!sidebarOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  function logout() {
    logoutSession();
    nav("/login", { replace: true });
  }

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[var(--color-bg-canvas)] text-[var(--color-text-strong)] font-[var(--font-family-base)] relative">
      {/* Overlay for mobile sidebar */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[90] transition-opacity duration-300 ${sidebarOpen ? "opacity-100 block" : "opacity-0 hidden"}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        className={`bg-white border-r border-[var(--color-border-default)] grid [grid-template-rows:auto_1fr_auto] p-[18px_14px_14px] gap-2.5 fixed top-0 left-0 bottom-0 w-[260px] h-[100dvh] overflow-hidden z-[100] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] max-[820px]:w-[280px] ${sidebarOpen ? "max-[820px]:translate-x-0 max-[820px]:shadow-[10px_0_40px_rgba(0,0,0,0.15)]" : "max-[820px]:-translate-x-full"} max-[820px]:shadow-none max-[520px]:w-[240px] max-[520px]:p-[14px_12px_12px]`}
        aria-label="Navegacion principal"
      >
        <div className="relative flex items-center justify-between gap-2 px-3 py-2.5 flex-shrink-0 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] border border-[#e6ebf2] rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          <span className="absolute left-0 top-0 bottom-0 w-1 bg-[linear-gradient(180deg,var(--color-brand-500)_0%,#ef4444_100%)]" aria-hidden="true" />

          <NavLink
            to="/inicio"
            className="inline-flex items-center gap-2.5 flex-1 min-w-0 no-underline"
            aria-label="Ir a Inicio"
          >
            <img
              src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
              alt="CIFP Virgen de la Candelaria"
              className="w-[44px] h-[44px] block object-contain rounded-xl border border-[#dbe4ef] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-0.5 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.7)] max-[520px]:w-[38px] max-[520px]:h-[38px]"
            />

            <span className="flex flex-col min-w-0">
              <strong className="text-[#2d3748] font-extrabold leading-tight text-[18px] tracking-[-0.01em] whitespace-normal max-[520px]:text-[14px]">
                Smart Economato
              </strong>
            </span>
          </NavLink>

          <NavLink
            to="/avisos"
            className="relative inline-flex items-center justify-center text-[var(--color-brand-500)] no-underline px-2 py-2 rounded-xl hover:bg-[#f1f5f9] transition"
            aria-label="Ir a Avisos"
          >
            <i className="fa-regular fa-bell text-[18px]" aria-hidden="true" />
            {avisosCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-[#ef4444] text-white text-[11px] font-bold inline-flex items-center justify-center px-1">
                {avisosCount > 99 ? "99+" : avisosCount}
              </span>
            ) : null}
          </NavLink>
        </div>

        <nav className="flex flex-col gap-1 mt-0 min-h-0 overflow-y-auto pr-1 [scrollbar-width:thin] max-[520px]:gap-0.5" aria-label="Secciones del sistema">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl no-underline font-medium text-[13px] leading-[1.2] flex-shrink-0 transition-[background,color,box-shadow,font-weight] duration-200 text-[#4a5568] hover:bg-[#f1f5f9] hover:text-[var(--color-brand-500)]",
                  isActive ? "bg-[var(--color-brand-500)] text-white shadow-[0_4px_12px_rgba(179,49,49,0.25)] font-semibold hover:bg-[var(--color-brand-500)] hover:text-white" : "",
                  it.separated ? "mt-2.5" : "",
                  "max-[520px]:px-2.5 max-[520px]:py-[9px] max-[520px]:text-[12px]",
                ].join(" ")
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className={`w-5 min-w-5 inline-flex justify-center text-[14px] ${location.pathname === it.to ? "text-white" : "text-[var(--color-brand-500)]"} max-[520px]:text-[13px]`} aria-hidden="true">
                <i className={it.icon} />
              </span>
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="relative pt-2.5 border-t border-[var(--color-border-default)]" ref={menuRef}>
          <button
            type="button"
            className="w-full border border-[rgba(229,231,235,.95)] bg-[linear-gradient(180deg,#ffffff_0%,#fafbff_100%)] p-2.5 rounded-2xl cursor-pointer transition-[background,border-color] duration-200 flex items-center gap-2.5 shadow-[0_10px_24px_rgba(17,24,39,.06)] hover:bg-white hover:border-[rgba(209,213,219,.95)]"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="sidebar-user-dropdown"
          >
            <div className="w-[34px] h-[34px] rounded-full bg-[var(--color-brand-500)] text-white flex items-center justify-center font-semibold text-[14px]" title="Usuario">
              {userName.trim().charAt(0).toUpperCase()}
            </div>

            <span className="min-w-0 flex flex-col items-start gap-0.5 flex-1">
              <span className="text-[#2d3748] text-[13px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{userName}</span>
              <span className="text-[var(--color-text-muted)] text-[11px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                {userEmail || userRole || "Gestor de Economato"}
              </span>
            </span>

            <span className="ml-auto text-[#9ca3af] text-[12px]" aria-hidden="true">
              {menuOpen ? "▴" : "▾"}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute left-0 right-0 bottom-[calc(100%+12px)] bg-white border border-[rgba(229,231,235,.95)] rounded-[20px] shadow-[0_18px_40px_rgba(17,24,39,.14)] overflow-hidden z-50 max-[820px]:left-3 max-[820px]:right-3" id="sidebar-user-dropdown" role="menu">
              <div className="flex items-center gap-3.5 p-[18px_18px_14px] border-b border-[var(--color-border-default)]">
                <div className="w-12 h-12 rounded-full bg-[var(--color-brand-500)] text-white flex items-center justify-center font-semibold text-[24px] flex-shrink-0">
                  {userName.trim().charAt(0).toUpperCase()}
                </div>

                <div className="flex flex-col">
                  <div className="text-[16px] font-extrabold text-[var(--color-text-strong)]">{userName}</div>
                  <div className="text-[12px] font-semibold text-[var(--color-text-muted)]">{userEmail || "Gestor de Economato"}</div>
                  <span className={`role-badge role-badge--${normalizedRole}`}>
                    {normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)}
                  </span>
                </div>
              </div>

              <button
                className="w-full text-left px-[18px] py-[14px] bg-transparent border-0 cursor-pointer font-bold text-[var(--color-text-strong)] flex items-center justify-between gap-3 hover:bg-[#f6f7fb]"
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  nav("/avisos");
                }}
              >
                <span className="inline-flex items-center gap-3">
                  <i className="fa-solid fa-bell"></i>
                  <span>Centro de avisos</span>
                </span>
                {avisosCount > 0 ? (
                  <span className="bg-[#fde2e2] text-[#ef4444] font-extrabold text-[12px] min-w-7 h-7 px-2 rounded-full inline-flex items-center justify-center">
                    {avisosCount > 99 ? "99+" : avisosCount}
                  </span>
                ) : null}
              </button>

              <button
                className="w-full text-left px-[18px] py-[14px] bg-transparent border-0 cursor-pointer font-bold text-[var(--color-text-strong)] flex items-center justify-between gap-3 hover:bg-[#f6f7fb]"
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  nav("/configuracion");
                }}
              >
                <span className="inline-flex items-center gap-3">
                  <i className="fa-solid fa-gear"></i>
                  <span>Configuración</span>
                </span>
              </button>

              <div className="px-[18px] py-3 flex items-center justify-between gap-3 text-[var(--color-text-muted)] border-t border-[#f1f5f9]">
                <span className="inline-flex items-center gap-3 text-[var(--color-text-muted)]">
                  <i className="fa-solid fa-clock"></i>
                  <span>Sesión iniciada</span>
                </span>
                <span className="font-bold text-[#374151]">hoy</span>
              </div>

              <div className="px-[18px] py-3 flex items-center justify-between gap-3 text-[var(--color-text-muted)] border-t border-[#f1f5f9]">
                <span className="inline-flex items-center gap-3 text-[var(--color-text-muted)]">
                  <i className="fa-solid fa-calendar-days"></i>
                  <span>Fecha</span>
                </span>
                <span className="font-bold text-[#374151]">
                  {new Intl.DateTimeFormat("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date())}
                </span>
              </div>

              <div className="h-px bg-[var(--color-border-default)]" />

              <button className="w-full text-left px-[18px] py-4 bg-transparent border-0 cursor-pointer font-black text-[#dc2626] flex items-center gap-3 hover:bg-[#fff5f5]" type="button" onClick={logout}>
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-col min-w-0 min-h-[100dvh] w-full pl-[260px] max-[820px]:pl-0">
        <header className="hidden bg-white items-center justify-start shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10 max-[820px]:flex max-[820px]:p-[12px_16px]">
          <div className="flex items-center gap-3">
            <button
              className="hidden bg-none border border-[var(--color-border-default)] rounded-[10px] w-[42px] h-[42px] text-[18px] text-[var(--color-text-strong)] cursor-pointer items-center justify-center transition-[background] duration-150 hover:bg-[#f1f5f9] max-[820px]:inline-flex max-[520px]:w-9 max-[520px]:h-9 max-[520px]:text-[16px]"
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

        <main
          className="flex-1 w-full min-w-0 p-[30px] m-0 max-[520px]:p-4"
          id="main-content"
        >
          <div className="w-full h-full min-h-full" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
