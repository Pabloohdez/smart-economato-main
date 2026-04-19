import { NavLink, useNavigate, useLocation, useOutlet } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  CalendarDays,
  ChartPie,
  ChefHat,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Boxes,
  Building2,
  HandCoins,
  House,
  LogOut,
  Menu,
  PackagePlus,
  Settings,
  Truck,
} from "lucide-react";
import { logout as logoutSession } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import PageTransition from "../components/ui/PageTransition";
import RouteErrorBoundary from "../components/app/RouteErrorBoundary";
import { getProductos } from "../services/productosService";
import { queryKeys } from "../lib/queryClient";

const navItems = [
  { to: "/inicio", label: "Inicio", icon: House, roles: ["administrador", "profesor", "alumno"] },
  { to: "/recepcion", label: "Recepción", icon: PackagePlus, roles: ["administrador", "profesor"] },
  { to: "/distribucion", label: "Distribución", icon: Truck, roles: ["administrador", "profesor"] },
  { to: "/inventario", label: "Inventario", icon: Boxes, roles: ["administrador", "profesor", "alumno"] },
  { to: "/bajas", label: "Bajas", icon: HandCoins, roles: ["administrador", "profesor"] },
  { to: "/proveedores", label: "Proveedores", icon: Building2, roles: ["administrador"] },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList, roles: ["administrador", "profesor"] },
  { to: "/escandallos", label: "Escandallos", icon: ChefHat, roles: ["administrador", "profesor", "alumno"] },
  { to: "/rendimiento", label: "Rendimiento", icon: ChartPie, roles: ["administrador", "profesor"] },
  { to: "/avisos", label: "Avisos", icon: BellRing, roles: ["administrador", "profesor", "alumno"] },
  {
    to: "/configuracion",
    label: "Configuración",
    icon: Settings,
    separated: true,
    roles: ["administrador", "profesor"],
  },
  { to: "/auditoria", label: "Auditoría", icon: ClipboardList, roles: ["administrador"] },
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
  const outlet = useOutlet();
  const isInicio = location.pathname === "/inicio";
  const transitionKey = location.pathname;
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
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => item.roles.includes(normalizedRole)),
    [normalizedRole],
  );

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
        className={`grid [grid-template-rows:auto_1fr_auto] gap-3 fixed top-0 left-0 bottom-0 w-[286px] h-[100dvh] overflow-hidden z-[100] bg-white border-r border-[var(--color-border-default)] p-[18px_14px_14px] text-[var(--color-text-strong)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] max-[820px]:w-[300px] ${sidebarOpen ? "max-[820px]:translate-x-0 max-[820px]:shadow-[10px_0_40px_rgba(0,0,0,0.14)]" : "max-[820px]:-translate-x-full"} max-[820px]:shadow-none max-[520px]:w-[252px] max-[520px]:p-[14px_12px_12px]`}
        aria-label="Navegacion principal"
      >
        <div className="flex items-center gap-3 px-2 py-2 flex-shrink-0 border-b border-[var(--color-border-default)]">
          <NavLink
            to="/inicio"
            className="inline-flex items-center gap-3 flex-1 min-w-0 no-underline"
            aria-label="Ir a Inicio"
          >
            <img
              src="/assets/img/LOGO CIFP VIRGEN DE CANDELARIA.png"
              alt="CIFP Virgen de la Candelaria"
              className="block h-[50px] w-[50px] rounded-full border border-slate-200 bg-white object-contain p-1 shadow-[0_8px_18px_rgba(15,23,42,0.08)] max-[520px]:h-[44px] max-[520px]:w-[44px]"
            />

            <span className="flex flex-col min-w-0">
              <strong className="text-[var(--color-text-strong)] font-extrabold leading-tight text-[18px] tracking-[-0.02em] whitespace-normal max-[520px]:text-[15px]">
                Smart Economato
              </strong>
              <span className="mt-0.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)] max-[520px]:text-[11px]">
                Backoffice
              </span>
            </span>
          </NavLink>

          <NavLink
            to="/avisos"
            className="relative inline-flex items-center justify-center text-[var(--color-brand-500)] no-underline px-2 py-2 rounded-xl hover:bg-[#f1f5f9] transition"
            aria-label="Ir a Avisos"
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
            {avisosCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-[#ef4444] text-white text-[11px] font-bold inline-flex items-center justify-center px-1">
                {avisosCount > 99 ? "99+" : avisosCount}
              </span>
            ) : null}
          </NavLink>
        </div>

        <nav className="flex flex-col gap-2 mt-2 min-h-0 overflow-y-auto pr-1 [scrollbar-width:thin] max-[520px]:gap-1.5" aria-label="Secciones del sistema">
          {visibleNavItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                [
                  "group flex min-h-[44px] items-center gap-3 px-3.5 py-2.5 rounded-lg no-underline text-[14px] leading-[1.15] flex-shrink-0 font-medium transition-[background,color] duration-150 text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                  isActive ? "bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary" : "",
                  it.separated ? "mt-3" : "",
                  "max-[520px]:min-h-[40px] max-[520px]:px-3 max-[520px]:py-2 max-[520px]:text-[13px]",
                ].join(" ")
              }
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <it.icon
                    className={`h-[17px] w-[17px] flex-shrink-0 ${isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-600"}`}
                    aria-hidden="true"
                  />
                  <span
                    className="tracking-[-0.01em]"
                  >
                    {it.label}
                  </span>
                  <span className="ml-auto inline-flex w-4 items-center justify-center" aria-hidden="true">
                    {isActive ? (
                      <motion.span
                        layoutId="active-arrow"
                        className="inline-flex items-center justify-center text-[13px] text-primary"
                        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.7 }}
                      >
                        <ChevronRight className="h-[14px] w-[14px]" />
                      </motion.span>
                    ) : null}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative pt-3 border-t border-[var(--color-border-default)]" ref={menuRef}>
          <button
            type="button"
            className="w-full rounded-[20px] border border-[rgba(229,231,235,.95)] bg-[linear-gradient(180deg,#ffffff_0%,#fafbff_100%)] p-3 cursor-pointer transition-[background,border-color,transform] duration-200 flex items-center gap-3 shadow-[0_10px_24px_rgba(15,23,42,.06)] hover:bg-white hover:border-[rgba(209,213,219,.95)]"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="sidebar-user-dropdown"
          >
            <div className="w-[40px] h-[40px] rounded-full bg-[var(--color-brand-500)] text-white flex items-center justify-center font-bold text-[15px]" title="Usuario">
              {userName.trim().charAt(0).toUpperCase()}
            </div>

            <span className="min-w-0 flex flex-col items-start gap-0.5 flex-1">
              <span className="text-[var(--color-text-strong)] text-[14px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{userName}</span>
              <span className="text-[var(--color-text-muted)] text-[11px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                {userEmail || userRole || "Gestor de Economato"}
              </span>
            </span>

            <span className="ml-auto text-[#9ca3af] text-[12px]" aria-hidden="true">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${menuOpen ? "rotate-180" : "rotate-0"}`} />
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
                  <BellRing className="h-4 w-4" />
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
                  <Settings className="h-4 w-4" />
                  <span>Configuración</span>
                </span>
              </button>

              <div className="px-[18px] py-3 flex items-center justify-between gap-3 text-[var(--color-text-muted)] border-t border-[#f1f5f9]">
                <span className="inline-flex items-center gap-3 text-[var(--color-text-muted)]">
                  <Bell className="h-4 w-4" />
                  <span>Sesión iniciada</span>
                </span>
                <span className="font-bold text-[#374151]">hoy</span>
              </div>

              <div className="px-[18px] py-3 flex items-center justify-between gap-3 text-[var(--color-text-muted)] border-t border-[#f1f5f9]">
                <span className="inline-flex items-center gap-3 text-[var(--color-text-muted)]">
                  <CalendarDays className="h-4 w-4" />
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
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-col min-w-0 min-h-[100dvh] w-full pl-[286px] max-[820px]:pl-0">
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
              <Menu className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <main
          className={[
            "flex-1 w-full min-w-0 p-[30px] m-0 max-[520px]:p-4",
            // Inicio: sin scroll en escritorio; en móvil permitimos scroll
            isInicio ? "overflow-hidden max-[768px]:overflow-auto" : "overflow-auto",
          ].join(" ")}
          id="main-content"
        >
          <RouteErrorBoundary resetKey={transitionKey}>
            <PageTransition transitionKey={transitionKey}>
              {outlet}
            </PageTransition>
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}
