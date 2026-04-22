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
    <StaggerPage className="w-full h-full min-h-0 flex">
      <StaggerItem>
        <div className="w-full flex-1 min-h-0 flex">
          <div className="grid w-full flex-1 min-h-0 content-start grid-cols-3 gap-5 max-w-[1150px] max-[1100px]:grid-cols-2 max-[820px]:pb-4 max-[640px]:gap-4 max-[520px]:grid-cols-2 max-[520px]:gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.to}
                className="group flex w-full flex-col rounded-[24px] border border-[var(--color-border-default)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] px-6 py-6 text-left shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-[3px] hover:border-[rgba(179,49,49,0.16)] hover:shadow-[var(--shadow-lg)] max-[820px]:px-5 max-[820px]:py-5 max-[640px]:px-4 max-[640px]:py-4 max-[520px]:rounded-[20px] max-[520px]:px-3.5 max-[520px]:py-3.5"
                type="button"
                onClick={() => nav(c.to)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      Sección
                    </div>
                    <h3 className="m-0 mt-2 text-[22px] font-extrabold tracking-[-0.03em] text-[var(--color-text-strong)] max-[820px]:text-[20px] max-[640px]:text-[18px] max-[520px]:text-[15px]">
                      {c.title}
                    </h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[rgba(179,49,49,0.14)] bg-[rgba(179,49,49,0.08)] text-[var(--color-brand-500)] transition-transform duration-300 group-hover:scale-110 max-[640px]:h-11 max-[640px]:w-11 max-[520px]:h-9 max-[520px]:w-9 max-[520px]:rounded-[14px]">
                    <Icon className="h-5 w-5 max-[520px]:h-4 max-[520px]:w-4" />
                  </div>
                </div>

                <p className="m-0 mt-4 text-[14px] leading-[1.65] font-medium text-[var(--color-text-muted)] max-[640px]:mt-3 max-[520px]:hidden">
                  {c.desc}
                </p>

                <div className="mt-6 inline-flex items-center gap-2 text-[13px] font-extrabold text-[var(--color-brand-600)] max-[640px]:mt-4 max-[520px]:mt-3 max-[520px]:text-[12px]">
                  <span className="max-[520px]:hidden">Abrir {c.title}</span>
                  <span className="hidden max-[520px]:inline">Abrir</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 max-[520px]:h-3.5 max-[520px]:w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
        </div>
      </StaggerItem>
    </StaggerPage>
  );
}
