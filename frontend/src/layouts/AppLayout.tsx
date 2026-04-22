import { NavLink, useLocation, useNavigate, useOutlet } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BadgeAlert,
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
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Settings,
  Truck,
  UserCircle2,
} from "lucide-react";
import RouteErrorBoundary from "../components/app/RouteErrorBoundary";
import PageTransition from "../components/ui/PageTransition";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";
import { queryKeys } from "../lib/queryClient";
import { logout as logoutSession } from "../services/authService";
import { getProductos } from "../services/productosService";

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

  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const primaryNavItems = useMemo(
    () => visibleNavItems.filter((item) => !item.separated && item.to !== "/auditoria"),
    [visibleNavItems],
  );

  const secondaryNavItems = useMemo(
    () => visibleNavItems.filter((item) => item.separated || item.to === "/auditoria"),
    [visibleNavItems],
  );

  const currentSection = useMemo(
    () => visibleNavItems.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) ?? null,
    [location.pathname, visibleNavItems],
  );
  const isInventarioRoute = currentSection?.to === "/inventario";
  const hideCurrentSectionTitle = isInventarioRoute;

  const todayLabel = useMemo(
    () => new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date()),
    [],
  );

  const userInitial = userName.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
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

  function renderNavSection(items: typeof visibleNavItems, title: string) {
    if (items.length === 0) return null;

    return (
      <div className="rounded-[24px] border border-[var(--color-border-default)] bg-white/85 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {title}
        </div>
        <div className="flex flex-col gap-1.5">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                [
                  "group flex min-h-[46px] items-center gap-3 rounded-[18px] px-3.5 py-2.5 no-underline text-[14px] font-medium transition-[background,color,box-shadow] duration-150",
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(179,49,49,0.12)_0%,rgba(179,49,49,0.05)_100%)] text-primary shadow-[inset_0_0_0_1px_rgba(179,49,49,0.12)]"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")
              }
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[14px] border ${isActive ? "border-primary/10 bg-primary/10 text-primary" : "border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-700"}`}>
                    <it.icon className="h-[17px] w-[17px] flex-shrink-0" aria-hidden="true" />
                  </span>
                  <span className="tracking-[-0.01em]">{it.label}</span>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[var(--color-bg-canvas)] text-[var(--color-text-strong)] font-[var(--font-family-base)] relative">
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[90] transition-opacity duration-300 ${sidebarOpen ? "opacity-100 block" : "opacity-0 hidden"}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        className={`grid [grid-template-rows:auto_1fr_auto] gap-4 fixed top-0 left-0 bottom-0 w-[294px] h-[100dvh] overflow-hidden z-[100] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] border-r border-[var(--color-border-default)] p-[18px_14px_14px] text-[var(--color-text-strong)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] max-[820px]:w-[300px] ${sidebarOpen ? "max-[820px]:translate-x-0 max-[820px]:shadow-[10px_0_40px_rgba(0,0,0,0.14)]" : "max-[820px]:-translate-x-full"} max-[820px]:shadow-none max-[520px]:w-[252px] max-[520px]:p-[14px_12px_12px]`}
        aria-label="Navegacion principal"
      >
        <div className="flex items-center gap-3 rounded-[24px] border border-[var(--color-border-default)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
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
            </span>
          </NavLink>

        </div>

        <nav className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" aria-label="Secciones del sistema">
          {renderNavSection(primaryNavItems, "Principal")}
          {renderNavSection(secondaryNavItems, "Gestión")}
        </nav>

        <div className="border-t border-[var(--color-border-default)] pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full rounded-[20px] border border-[rgba(229,231,235,.95)] bg-[linear-gradient(180deg,#ffffff_0%,#fafbff_100%)] p-3 transition-[background,border-color,transform] duration-200 flex items-center gap-3 shadow-[0_10px_24px_rgba(15,23,42,.06)] hover:bg-white hover:border-[rgba(209,213,219,.95)]"
              >
                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[16px] bg-[var(--color-brand-500)] text-[15px] font-bold text-white" title="Usuario">
                  {userInitial}
                </div>
                <span className="min-w-0 flex flex-1 flex-col items-start gap-0.5">
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-bold text-[var(--color-text-strong)]">{userName}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold text-[var(--color-text-muted)]">
                    {userEmail || userRole || "Gestor de Economato"}
                  </span>
                </span>
                <span className="ml-auto text-[#9ca3af]" aria-hidden="true">
                  <ChevronDown className="h-4 w-4" />
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-[--radix-dropdown-menu-trigger-width] min-w-[260px] rounded-[20px] p-0">
              <DropdownMenuLabel className="p-0">
                <div className="flex items-center gap-3.5 border-b border-[var(--color-border-default)] p-[18px_18px_14px]">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-[var(--color-brand-500)] text-[24px] font-semibold text-white">
                    {userInitial}
                  </div>
                  <div className="flex flex-col">
                    <div className="text-[16px] font-extrabold text-[var(--color-text-strong)]">{userName}</div>
                    <div className="text-[12px] font-semibold text-[var(--color-text-muted)]">{userEmail || "Gestor de Economato"}</div>
                    <span className={`role-badge role-badge--${normalizedRole}`}>
                      {normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => nav("/avisos")}>
                <Bell className="h-4 w-4" /> Centro de avisos
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => nav("/configuracion")}>
                <Settings className="h-4 w-4" /> Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <CalendarDays className="h-4 w-4" /> {todayLabel}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={logout}>
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-h-[100dvh] w-full min-w-0 flex-col pl-[294px] max-[820px]:pl-0">
        <header
          className={
            isInventarioRoute || isInicio
              ? "hidden border-b border-[var(--color-border-default)] bg-[rgba(244,246,251,0.86)] backdrop-blur-xl max-[820px]:block"
              : "sticky top-0 z-20 border-b border-[var(--color-border-default)] bg-[rgba(244,246,251,0.86)] backdrop-blur-xl"
          }
        >
          <div className={isInventarioRoute ? "flex items-center justify-between gap-4 px-4 py-3" : "flex items-center justify-between gap-4 px-6 py-4 max-[820px]:px-4 max-[820px]:py-3"}>
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="hidden h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-[var(--color-border-default)] text-[var(--color-text-strong)] transition-[background] duration-150 hover:bg-[#f1f5f9] max-[820px]:inline-flex"
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label="Abrir menú"
                aria-controls="app-sidebar"
                aria-expanded={sidebarOpen}
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Smart Economato
                </div>
                {!hideCurrentSectionTitle ? (
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-[22px] font-extrabold tracking-[-0.03em] text-[var(--color-text-strong)] max-[820px]:text-[18px]">
                    {currentSection?.label || "Panel"}
                  </h2>
                  {currentSection?.to === "/avisos" && avisosCount > 0 ? (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#fde2e2] px-2 text-[11px] font-bold text-[#ef4444]">
                      {avisosCount > 99 ? "99+" : avisosCount}
                    </span>
                  ) : null}
                </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 max-[520px]:gap-2">
              <div className="hidden items-center gap-2 rounded-[18px] border border-[var(--color-border-default)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--color-text-muted)] shadow-sm md:inline-flex">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span>{todayLabel}</span>
              </div>

              <NavLink
                to="/avisos"
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--color-border-default)] bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Abrir avisos"
              >
                <BadgeAlert className="h-4.5 w-4.5" />
                {avisosCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white">
                    {avisosCount > 99 ? "99+" : avisosCount}
                  </span>
                ) : null}
              </NavLink>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-3 rounded-[18px] border border-[var(--color-border-default)] bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50"
                    aria-label="Abrir menú de usuario"
                  >
                    <div className="hidden text-right md:block">
                      <div className="text-[13px] font-bold leading-none text-[var(--color-text-strong)]">{userName}</div>
                      <div className="mt-1 text-[11px] font-medium leading-none text-[var(--color-text-muted)]">{userEmail || userRole || "Usuario"}</div>
                    </div>
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-[var(--color-brand-500)] text-sm font-bold text-white">
                      {userInitial}
                    </div>
                    <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[240px] rounded-[18px]">
                  <DropdownMenuLabel className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--color-brand-500)] text-sm font-bold text-white">
                      {userInitial}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[var(--color-text-strong)]">{userName}</div>
                      <div className="truncate text-xs text-[var(--color-text-muted)]">{userEmail || "Gestor de Economato"}</div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => nav("/configuracion")}>
                    <Settings className="h-4 w-4" /> Configuración
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => nav("/avisos")}>
                    <Bell className="h-4 w-4" /> Avisos
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <UserCircle2 className="h-4 w-4" /> Rol: {normalizedRole}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={logout}>
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main
          className={[
            isInventarioRoute
              ? "flex-1 w-full min-w-0 m-0 p-[16px_20px_24px] max-[820px]:p-4"
              : "flex-1 w-full min-w-0 p-[30px] pt-6 m-0 max-[520px]:p-4 max-[520px]:pt-4",
            isInicio ? "overflow-hidden" : "overflow-auto",
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
