import { useNavigate } from "react-router-dom";
import {
  BellRing,
  Boxes,
  ChefHat,
  CircleAlert,
  ClipboardList,
  PackagePlus,
  PieChart,
  Truck,
  TruckIcon,
  Users,
  ArrowRight,
} from "lucide-react";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";

const cards = [
  { title: "Recepción", desc: "Registrar entradas de mercancía", to: "/recepcion", icon: PackagePlus },
  { title: "Distribución", desc: "Salidas a almacenes o áreas", to: "/distribucion", icon: Truck },
  { title: "Inventario", desc: "Consultar stock y buscar artículos", to: "/inventario", icon: Boxes },
  { title: "Bajas", desc: "Roturas, caducados y ajustes", to: "/bajas", icon: CircleAlert },
  { title: "Proveedores", desc: "Altas, contacto y listas", to: "/proveedores", icon: Users },
  { title: "Pedidos", desc: "Crear, revisar y recibir", to: "/pedidos", icon: ClipboardList },
  { title: "Escandallos", desc: "Recetas y costes", to: "/escandallos", icon: ChefHat },
  { title: "Rendimiento", desc: "Mermas y aprovechamiento", to: "/rendimiento", icon: PieChart },
  { title: "Avisos", desc: "Alertas de stock, caducidad y gastos", to: "/avisos", icon: BellRing },
];

export default function InicioPage() {
  const nav = useNavigate();

  return (
    <StaggerPage className="w-full">
      <StaggerItem>
        <section className="overflow-hidden rounded-[28px] border border-[var(--color-border-default)] bg-[linear-gradient(135deg,#fff8f5_0%,#ffffff_52%,#f6f8fc_100%)] px-7 py-7 shadow-[var(--shadow-md)] max-[640px]:px-5 max-[640px]:py-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-[640px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(179,49,49,0.16)] bg-[rgba(179,49,49,0.08)] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-500)]">
                <TruckIcon className="h-3.5 w-3.5" /> Operativa diaria
              </span>
              <h1 className="m-0 mt-4 text-[34px] font-extrabold tracking-[-0.04em] text-[var(--color-text-strong)] max-[640px]:text-[28px]">
                Panel de inicio
              </h1>
              <p className="m-0 mt-3 max-w-[560px] text-[15px] leading-7 text-[var(--color-text-muted)]">
                Entrada rápida a las secciones con más uso y una lectura más clara del estado general del economato.
              </p>
            </div>

            <div className="grid min-w-[250px] gap-3 max-[640px]:w-full">
              <div className="rounded-[20px] border border-[var(--color-border-default)] bg-white/90 px-4 py-4 shadow-[var(--shadow-sm)]">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Enfoque</div>
                <div className="mt-2 text-[18px] font-bold text-[var(--color-text-strong)]">Acceso rápido y limpio</div>
              </div>
              <div className="rounded-[20px] border border-[rgba(179,49,49,0.14)] bg-[rgba(179,49,49,0.06)] px-4 py-4 shadow-[var(--shadow-sm)]">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-500)]">Objetivo</div>
                <div className="mt-2 text-[15px] font-semibold text-[var(--color-text-strong)]">Menos fricción para tablet y escritorio</div>
              </div>
            </div>
          </div>
        </section>
      </StaggerItem>

      <StaggerItem>
        <div className="mt-6 grid grid-cols-3 gap-5 w-full max-w-[1150px] max-[1100px]:grid-cols-2 max-[520px]:grid-cols-1 max-[520px]:gap-4 max-[820px]:pb-6">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.to}
                className="group flex w-full flex-col rounded-[24px] border border-[var(--color-border-default)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] px-6 py-6 text-left shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-[3px] hover:border-[rgba(179,49,49,0.16)] hover:shadow-[var(--shadow-lg)]"
                type="button"
                onClick={() => nav(c.to)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      Sección
                    </div>
                    <h3 className="m-0 mt-2 text-[22px] font-extrabold tracking-[-0.03em] text-[var(--color-text-strong)]">
                      {c.title}
                    </h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[rgba(179,49,49,0.14)] bg-[rgba(179,49,49,0.08)] text-[var(--color-brand-500)] transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <p className="m-0 mt-4 text-[14px] leading-[1.65] font-medium text-[var(--color-text-muted)]">
                  {c.desc}
                </p>

                <div className="mt-6 inline-flex items-center gap-2 text-[13px] font-extrabold text-[var(--color-brand-600)]">
                  Abrir {c.title}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
      </StaggerItem>
    </StaggerPage>
  );
}
