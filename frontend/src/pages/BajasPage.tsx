import { useEffect, useMemo, useState } from "react";
import "../styles/bajas.css";
import { showConfirm, showNotification } from "../utils/notifications";

const API_URL = import.meta.env.VITE_API_URL as string;

type Categoria = {
  id: string | number;
  nombre: string;
};

type Producto = {
  id: string | number;
  nombre: string;
  codigoBarras?: string;
  stock: number;
  precio: number;
  categoriaId?: string | number;
  fechaCaducidad?: string | null;
};

type ProductoBaja = Producto & {
  tipoBaja: "Rotura" | "Caducado" | "Merma" | "Ajuste" | "Otro";
  cantidadBaja: number;
  valorPerdido: number;
  nombreCategoria: string;
};

type BajaHistorialItem = {
  fechaBaja: string;
  tipoBaja: string;
  cantidad: number | string;
  motivo?: string;
  usuario_nombre?: string;
  producto_nombre?: string;
  producto_precio?: string | number;
};

function formatFechaLargaES(d: Date) {
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatFechaCortaES(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
}

function claseTipoBaja(tipo: string) {
  const map: Record<string, string> = {
    Rotura: "tipo-rotura",
    Caducado: "tipo-caducado",
    Merma: "tipo-merma",
    Ajuste: "tipo-ajuste",
    Otro: "tipo-otro",
  };
  return map[tipo] ?? "tipo-otro";
}

function badgeCaducidad(fechaCaducidad?: string | null) {
  if (!fechaCaducidad) return null;

  const hoy = new Date();
  const cad = new Date(fechaCaducidad);
  const dias = Math.ceil((cad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (dias <= 0) return { text: "CADUCADO", className: "badge-caducidad caducidad-urgente" };
  if (dias <= 7) return { text: `${dias} días`, className: "badge-caducidad caducidad-urgente" };
  if (dias <= 30) return { text: `${dias} días`, className: "badge-caducidad caducidad-proxima" };

  return null;
}

export default function BajasPage() {
  // datos base
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingDatos, setLoadingDatos] = useState(true);

  // fecha
  const [fechaActual] = useState(() => formatFechaLargaES(new Date()));

  // stats + historial
  const [stats, setStats] = useState({ roturas: 0, caducados: 0, mermas: 0, valorPerdido: 0 });
  const [historial, setHistorial] = useState<BajaHistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [filtroTipoHistorial, setFiltroTipoHistorial] = useState("");

  // búsqueda + filtros
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("");
  const [resultadosOpen, setResultadosOpen] = useState(false);
  const [modoCaducados, setModoCaducados] = useState(false);

  // baja actual
  const [productosBaja, setProductosBaja] = useState<ProductoBaja[]>([]);
  const [motivo, setMotivo] = useState("");
  const [mensajeEstado, setMensajeEstado] = useState<{ text: string; color: "green" | "orange" | "red" } | null>(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [modalTipoBaja, setModalTipoBaja] = useState<ProductoBaja["tipoBaja"]>("Rotura");
  const [modalCantidad, setModalCantidad] = useState(1);

  const [confirmando, setConfirmando] = useState(false);

  async function cargarDatos() {
    setLoadingDatos(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`${API_URL}/productos`, { headers: { "X-Requested-With": "XMLHttpRequest" } }),
        fetch(`${API_URL}/categorias`, { headers: { "X-Requested-With": "XMLHttpRequest" } }),
      ]);

      const pJson = await pRes.json();
      const cJson = await cRes.json();

      if (!pJson?.success) throw new Error(pJson?.error || "Error cargando productos");
      if (!cJson?.success) throw new Error(cJson?.error || "Error cargando categorías");

      const prod: Producto[] = (pJson.data ?? []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        codigoBarras: p.codigoBarras,
        stock: Number(p.stock ?? 0),
        precio: Number(p.precio ?? 0),
        categoriaId: p.categoriaId ?? p.categoria_id ?? p.categoriaID,
        fechaCaducidad: p.fechaCaducidad ?? p.fecha_caducidad ?? null,
      }));

      const cats: Categoria[] = (cJson.data ?? []).map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
      }));

      setProductos(prod);
      setCategorias(cats);
    } catch (e) {
      console.error(e);
      showNotification("Error de conexión: no se pudieron cargar productos/categorías.", "error");
      setProductos([]);
      setCategorias([]);
    } finally {
      setLoadingDatos(false);
    }
  }

  async function cargarEstadisticasMes() {
    try {
      const hoy = new Date();
      const mes = hoy.getMonth() + 1;
      const anio = hoy.getFullYear();

      const res = await fetch(`${API_URL}/bajas?mes=${mes}&anio=${anio}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const json = await res.json();

      if (!json?.success || !Array.isArray(json.data)) {
        setStats({ roturas: 0, caducados: 0, mermas: 0, valorPerdido: 0 });
        return;
      }

      const bajasDelMes: BajaHistorialItem[] = json.data;

      const roturas = bajasDelMes.filter((b) => b.tipoBaja === "Rotura").length;
      const caducados = bajasDelMes.filter((b) => b.tipoBaja === "Caducado").length;
      const mermas = bajasDelMes.filter((b) => b.tipoBaja === "Merma").length;

      const valorPerdido = bajasDelMes.reduce((sum, b: any) => {
        const precio = Number.parseFloat(String(b.producto_precio ?? 0)) || 0;
        const cant = Number.parseInt(String(b.cantidad ?? 0), 10) || 0;
        return sum + precio * cant;
      }, 0);

      setStats({ roturas, caducados, mermas, valorPerdido });
    } catch (e) {
      console.error(e);
      setStats({ roturas: 0, caducados: 0, mermas: 0, valorPerdido: 0 });
    }
  }

  async function cargarHistorialBajas() {
    setLoadingHistorial(true);
    try {
      const hoy = new Date();
      const mes = hoy.getMonth() + 1;
      const anio = hoy.getFullYear();

      const res = await fetch(`${API_URL}/bajas?mes=${mes}&anio=${anio}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const json = await res.json();

      if (!json?.success || !Array.isArray(json.data)) {
        setHistorial([]);
        return;
      }

      setHistorial(json.data as BajaHistorialItem[]);
    } catch (e) {
      console.error(e);
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }

  useEffect(() => {
    (async () => {
      await cargarDatos();
      await cargarEstadisticasMes();
      await cargarHistorialBajas();
    })();
  }, []);

  const resultados = useMemo(() => {
    let list = [...productos];

    const texto = q.trim().toLowerCase();
    const categoria = catId;

    if (texto) {
      list = list.filter((p) => {
        const nom = (p.nombre || "").toLowerCase();
        const cb = (p.codigoBarras || "").toLowerCase();
        return nom.includes(texto) || cb.includes(texto);
      });
    }

    if (categoria) {
      list = list.filter((p) => String(p.categoriaId ?? "") === String(categoria));
    }

    if (modoCaducados) {
      const hoy = new Date();
      const proximoMes = new Date(hoy);
      proximoMes.setDate(proximoMes.getDate() + 30);

      list = list.filter((p) => {
        if (!p.fechaCaducidad) return false;
        const cad = new Date(p.fechaCaducidad);
        return cad <= proximoMes;
      });
    }

    return list;
  }, [productos, q, catId, modoCaducados]);

  function buscarProductos() {
    // en el JS antiguo buscaba también sin mínimo, aquí lo dejamos simple:
    setResultadosOpen(true);
  }

  function mostrarProductosCaducados() {
    setModoCaducados(true);
    setResultadosOpen(true);
  }

  function seleccionarProducto(p: Producto) {
    // ya existe?
    const ya = productosBaja.some((x) => String(x.id) === String(p.id));
    if (ya) {
      showNotification(
        "Este producto ya está en el registro de bajas. Puedes modificar los datos en la tabla.",
        "warning"
      );
      return;
    }

    if (Number(p.stock ?? 0) <= 0) {
      showNotification("Este producto no tiene stock disponible para dar de baja.", "warning");
      return;
    }

    setProductoSeleccionado(p);
    setModalTipoBaja("Rotura");
    setModalCantidad(1);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setProductoSeleccionado(null);
  }

  function confirmarBajaModal() {
    if (!productoSeleccionado) return;

    const stockDisponible = Number(productoSeleccionado.stock ?? 0);
    const cantidad = Number(modalCantidad || 0);

    if (!cantidad || cantidad <= 0) {
      showNotification("Por favor, ingresa una cantidad válida.", "warning");
      return;
    }

    if (cantidad > stockDisponible) {
      showNotification("La cantidad no puede superar el stock disponible.", "warning");
      return;
    }

    const cat = categorias.find((c) => String(c.id) === String(productoSeleccionado.categoriaId ?? ""));
    const nombreCategoria = cat?.nombre ?? "Sin categoría";

    const nuevo: ProductoBaja = {
      ...productoSeleccionado,
      tipoBaja: modalTipoBaja,
      cantidadBaja: cantidad,
      valorPerdido: Number(productoSeleccionado.precio ?? 0) * cantidad,
      nombreCategoria,
    };

    setProductosBaja((prev) => [...prev, nuevo]);

    // limpiar búsqueda como en el JS
    setQ("");
    setResultadosOpen(false);
    setModoCaducados(false);

    cerrarModal();
  }

  async function eliminarProductoBaja(index: number) {
    const ok = await showConfirm("¿Eliminar este producto del registro de bajas?");
    if (!ok) return;

    setProductosBaja((prev) => prev.filter((_, i) => i !== index));
  }

  function setMensaje(text: string, color: "green" | "orange" | "red") {
    setMensajeEstado({ text, color });
    setTimeout(() => setMensajeEstado(null), 5000);
  }

  async function cancelarBaja() {
    const ok = await showConfirm("¿Estás seguro de cancelar este registro de bajas? Se perderán todos los datos.");
    if (!ok) return;

    setProductosBaja([]);
    setMotivo("");
    setMensaje("Registro de bajas cancelado", "orange");
  }

  async function confirmarBaja() {
    if (!productosBaja.length) {
      showNotification("No hay productos para dar de baja", "warning");
      return;
    }

    const totalValor = productosBaja.reduce((sum, p) => sum + p.valorPerdido, 0);

    const ok = await showConfirm(
      `¿Confirmar bajas de ${productosBaja.length} productos con un valor total de ${totalValor.toFixed(2)} €?\n\n` +
        `Esta acción reducirá el stock de los productos seleccionados.`
    );
    if (!ok) return;

    setConfirmando(true);

    let exitosos = 0;
    const errores: string[] = [];

    for (const pb of productosBaja) {
      try {
        const payload = {
          productoId: pb.id,
          cantidad: pb.cantidadBaja,
          tipoBaja: pb.tipoBaja,
          motivo: motivo.trim() || "Sin especificar",
          usuarioId: "admin1",
        };

        const res = await fetch(`${API_URL}/bajas`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);

        if (data?.success) {
          exitosos++;
        } else {
          errores.push(`${pb.nombre}: ${data?.error || "Error desconocido"}`);
        }
      } catch (e) {
        console.error(e);
        errores.push(`${pb.nombre}: Error de red`);
      }
    }

    setConfirmando(false);

    if (errores.length === 0) {
      setMensaje(`✅ Bajas registradas correctamente: ${exitosos} productos actualizados`, "green");
      setProductosBaja([]);
      setMotivo("");
      await cargarDatos();
      await cargarEstadisticasMes();
      await cargarHistorialBajas();
      showNotification(
        `Bajas registradas exitosamente. Productos afectados: ${exitosos}. Valor total: ${totalValor.toFixed(2)} €.`,
        "success"
      );
      return;
    }

    if (exitosos > 0) {
      setMensaje(`⚠️ Bajas parcialmente completadas: ${exitosos} exitosos, ${errores.length} errores`, "orange");
      setProductosBaja([]);
      setMotivo("");
      await cargarDatos();
      await cargarEstadisticasMes();
      await cargarHistorialBajas();
      showNotification(`⚠️ Resultado mixto: Exitosos: ${exitosos}, Errores: ${errores.length}`, "warning");
      return;
    }

    setMensaje(`❌ Error al registrar bajas: ${errores.length} errores`, "red");
    showNotification(`❌ Error al registrar bajas: ${errores.length} errores`, "error");
  }

  const totalValorBajas = useMemo(() => productosBaja.reduce((sum, p) => sum + p.valorPerdido, 0), [productosBaja]);

  const historialFiltrado = useMemo(() => {
    if (!filtroTipoHistorial) return historial;
    return historial.filter((h) => String(h.tipoBaja) === String(filtroTipoHistorial));
  }, [historial, filtroTipoHistorial]);

  return (
    <div>
      {/* HEADER */}
      <div className="header-bajas">
        <div>
          <h1 className="titulo-bajas">
            <i className="fa-solid fa-circle-exclamation" /> GESTIÓN DE BAJAS
          </h1>
          <p className="subtitulo">Registra roturas, caducados, mermas y ajustes de inventario</p>
        </div>
        <div className="info-fecha">
          <i className="fa-solid fa-calendar" />
          <span id="fechaActualBajas">{fechaActual}</span>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-container">
        <div className="stat-card stat-roturas">
          <div className="stat-icon">
            <i className="fa-solid fa-hammer" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Roturas del Mes</span>
            <span className="stat-valor" id="statRoturas">
              {stats.roturas}
            </span>
          </div>
        </div>

        <div className="stat-card stat-caducados">
          <div className="stat-icon">
            <i className="fa-solid fa-clock" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Productos Caducados</span>
            <span className="stat-valor" id="statCaducados">
              {stats.caducados}
            </span>
          </div>
        </div>

        <div className="stat-card stat-mermas">
          <div className="stat-icon">
            <i className="fa-solid fa-scale-unbalanced" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Mermas Registradas</span>
            <span className="stat-valor" id="statMermas">
              {stats.mermas}
            </span>
          </div>
        </div>

        <div className="stat-card stat-valor-perdido">
          <div className="stat-icon">
            <i className="fa-solid fa-euro-sign" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Valor Perdido Total</span>
            <span className="stat-valor" id="statValorPerdido">
              {stats.valorPerdido.toFixed(2)} €
            </span>
          </div>
        </div>
      </div>

      {/* PANEL REGISTRO */}
      <div className="panel-registro-baja">
        <h2 className="titulo-seccion">
          <i className="fa-solid fa-clipboard-list" /> Registrar Nueva Baja
        </h2>

        <div className="controles-registro">
          <div className="campo-busqueda-baja">
            <input
              type="text"
              id="inputBusquedaBaja"
              className="input-busqueda-baja"
              placeholder="Buscar producto por nombre o código de barras..."
              aria-label="Buscar producto por nombre o código de barras"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setResultadosOpen(true);
                setModoCaducados(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscarProductos();
              }}
            />

            <button
              id="btnBuscarBaja"
              className="btn-buscar-baja"
              type="button"
              onClick={buscarProductos}
              style={{
                background: "linear-gradient(135deg, #b33131 0%, #9c2b2b 100%)",
                color: "white",
                border: "none",
                boxShadow: "0 4px 6px rgba(179, 49, 49, 0.3)",
                minWidth: 150,
                width: "auto",
                padding: "12px 30px",
                borderRadius: 12,
                fontWeight: "bold",
              }}
            >
              <i className="fa-solid fa-search" /> Buscar
            </button>
          </div>

          <div className="filtros-baja">
            <select
              id="selectCategoriaBaja"
              className="select-filtro-baja"
              aria-label="Filtrar por categoría"
              value={catId}
              onChange={(e) => {
                setCatId(e.target.value);
                setResultadosOpen(true);
              }}
              disabled={loadingDatos}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <button id="btnProductosCaducados" className="btn-filtro-especial" type="button" onClick={mostrarProductosCaducados}>
              <i className="fa-solid fa-clock" /> Ver Productos Próximos a Caducar
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div
          id="resultadosBusquedaBaja"
          className={`resultados-busqueda-baja ${resultadosOpen ? "" : "oculto"}`}
        >
          {loadingDatos ? (
            <div style={{ textAlign: "center", padding: 20, color: "#666" }}>
              <i className="fa-solid fa-spinner fa-spin" /> Cargando...
            </div>
          ) : resultados.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#a0aec0" }}>
              <i className="fa-solid fa-search" style={{ fontSize: 32, marginBottom: 10 }} />
              <p>No se encontraron productos</p>
            </div>
          ) : (
            resultados.map((p) => {
              const cat = categorias.find((c) => String(c.id) === String(p.categoriaId ?? ""));
              const cad = modoCaducados ? badgeCaducidad(p.fechaCaducidad) : null;

              return (
                <div
                  key={String(p.id)}
                  className="item-resultado-baja"
                  role="button"
                  tabIndex={0}
                  aria-label={`Seleccionar ${p.nombre}`}
                  onClick={() => seleccionarProducto(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      seleccionarProducto(p);
                    }
                  }}
                >
                  <div className="info-producto-baja">
                    <div className="nombre-producto-baja">{p.nombre}</div>
                    <div className="detalles-producto-baja">
                      {cat?.nombre || "Sin categoría"} • Stock: {p.stock} • {Number(p.precio ?? 0).toFixed(2)} €
                      {cad ? <span className={cad.className}>{cad.text}</span> : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* BAJA ACTIVA */}
      <div className="panel-baja-activa">
        <h3 className="titulo-seccion">
          <i className="fa-solid fa-file-lines" /> Registro de Baja Actual
        </h3>

        <div className="tabla-wrapper">
          <table id="tablaBajas" className="tabla-bajas">
            <caption className="visually-hidden">Listado de productos dados de baja en la sesión actual</caption>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tipo de Baja</th>
                <th>Stock Actual</th>
                <th>Cantidad Baja</th>
                <th>Stock Final</th>
                <th>Precio Unit.</th>
                <th>Valor Perdido</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody id="tbodyBajas">
              {productosBaja.length === 0 ? (
                <tr className="fila-vacia">
                  <td colSpan={8}>
                    <div className="mensaje-vacio">
                      <i className="fa-solid fa-inbox" />
                      <p>No hay productos registrados en esta baja</p>
                      <small>Busca y selecciona productos para comenzar</small>
                    </div>
                  </td>
                </tr>
              ) : (
                productosBaja.map((p, index) => (
                  <tr key={`${String(p.id)}-${index}`}>
                    <td>
                      <strong>{p.nombre}</strong>
                      <br />
                      <small style={{ color: "#718096" }}>{p.nombreCategoria}</small>
                    </td>

                    <td>
                      <span className={`badge-tipo-baja ${claseTipoBaja(p.tipoBaja)}`}>{p.tipoBaja}</span>
                    </td>

                    <td>{p.stock}</td>

                    <td>
                      <strong style={{ color: "#c53030" }}>{p.cantidadBaja}</strong>
                    </td>

                    <td className="stock-reducido">{Number(p.stock) - Number(p.cantidadBaja)}</td>

                    <td>{Number(p.precio ?? 0).toFixed(2)} €</td>

                    <td>
                      <strong style={{ color: "#c53030" }}>{p.valorPerdido.toFixed(2)} €</strong>
                    </td>

                    <td>
                      <button className="btn-eliminar-baja" type="button" onClick={() => eliminarProductoBaja(index)} aria-label={`Eliminar ${p.nombre}`}>
                        <i className="fa-solid fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot id="tfootBajas" className={productosBaja.length ? "" : "oculto"}>
              <tr className="fila-total-baja">
                <td colSpan={6}>
                  <strong>VALOR TOTAL DE BAJAS</strong>
                </td>
                <td id="totalValorBajas" className="total-valor-baja">
                  {totalValorBajas.toFixed(2)} €
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="panel-acciones-baja">
        <div className="campo-motivo">
          <label className="label-motivo" htmlFor="textareaMotivoBaja">
            <i className="fa-solid fa-message" /> Motivo / Descripción Detallada
          </label>
          <textarea
            id="textareaMotivoBaja"
            className="textarea-motivo"
            placeholder="Describe el motivo de las bajas (opcional pero recomendado)..."
            rows={3}
            aria-label="Motivo o descripción detallada de la baja"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        <div className="botones-finales-baja">
          <button
            id="btnCancelarBaja"
            className={`btn-accion-baja btn-cancelar-baja ${productosBaja.length ? "" : "oculto"}`}
            type="button"
            onClick={cancelarBaja}
            disabled={confirmando}
          >
            <i className="fa-solid fa-xmark" /> Cancelar Registro
          </button>

          <button
            id="btnConfirmarBaja"
            className={`btn-accion-baja btn-confirmar-baja ${productosBaja.length ? "" : "oculto"}`}
            type="button"
            onClick={confirmarBaja}
            disabled={confirmando}
          >
            {confirmando ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Procesando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-triangle-exclamation" /> CONFIRMAR BAJAS
              </>
            )}
          </button>
        </div>
      </div>

      {/* MENSAJE ESTADO */}
      <div
        id="mensajeEstadoBajas"
        className="mensaje-estado-bajas"
        style={
          mensajeEstado
            ? {
                background:
                  mensajeEstado.color === "green"
                    ? "#f0fff4"
                    : mensajeEstado.color === "orange"
                    ? "#fffaf0"
                    : "#fff5f5",
                color:
                  mensajeEstado.color === "green"
                    ? "#2f855a"
                    : mensajeEstado.color === "orange"
                    ? "#c05621"
                    : "#c53030",
                border: `2px solid ${
                  mensajeEstado.color === "green" ? "#9ae6b4" : mensajeEstado.color === "orange" ? "#fbd38d" : "#fc8181"
                }`,
              }
            : { background: "transparent", border: "none" }
        }
      >
        {mensajeEstado?.text ?? ""}
      </div>

      {/* HISTORIAL */}
      <div className="panel-historial">
        <div className="header-historial">
          <h3 className="titulo-seccion">
            <i className="fa-solid fa-clock-rotate-left" /> Historial de Bajas
          </h3>

          <div className="filtros-historial">
            <select
              id="selectFiltroTipoBaja"
              className="select-filtro-historial"
              aria-label="Filtrar historial por tipo de baja"
              value={filtroTipoHistorial}
              onChange={(e) => setFiltroTipoHistorial(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              <option value="Rotura">Roturas</option>
              <option value="Caducado">Caducados</option>
              <option value="Merma">Mermas</option>
              <option value="Ajuste">Ajustes</option>
              <option value="Otro">Otros</option>
            </select>
          </div>
        </div>

        <div id="contenedorHistorial" className="contenedor-historial">
          {loadingHistorial ? (
            <p style={{ textAlign: "center", color: "#666", padding: 20 }}>
              <i className="fa-solid fa-spinner fa-spin" /> Cargando historial...
            </p>
          ) : historialFiltrado.length === 0 ? (
            <p style={{ textAlign: "center", color: "#666", padding: 20 }}>
              No hay bajas registradas este mes
            </p>
          ) : (
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {historialFiltrado.map((baja, idx) => {
                const { fecha, hora } = formatFechaCortaES(baja.fechaBaja);
                const precio = Number.parseFloat(String(baja.producto_precio ?? 0)) || 0;
                const cant = Number.parseInt(String(baja.cantidad ?? 0), 10) || 0;
                const total = precio * cant;

                return (
                  <div
                    key={idx}
                    style={{
                      background: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: 15,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                      <div>
                        <strong style={{ fontSize: 16 }}>{baja.producto_nombre || "Producto desconocido"}</strong>
                        <div style={{ marginTop: 5 }}>
                          <span className={`badge-tipo-baja ${claseTipoBaja(baja.tipoBaja)}`}>{baja.tipoBaja}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: "right", color: "#718096", fontSize: 14 }}>
                        <div>{fecha}</div>
                        <div>{hora}</div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                        fontSize: 14,
                        color: "#4a5568",
                      }}
                    >
                      <div>
                        <strong>Cantidad:</strong> {cant}
                      </div>
                      <div>
                        <strong>Usuario:</strong> {baja.usuario_nombre || "Desconocido"}
                      </div>
                      <div>
                        <strong>Precio Ud.:</strong> {precio.toFixed(2)} €
                      </div>
                      <div>
                        <strong>Total:</strong> {total.toFixed(2)} €
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <strong>Motivo:</strong> {baja.motivo || "Sin especificar"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      <div id="modalDetalleBaja" className={`modal-overlay ${modalOpen ? "" : "oculto"}`}>
        <div className="modal-contenido-baja" role="dialog" aria-modal="true" aria-label="Detalles de la baja">
          <h3>
            <i className="fa-solid fa-circle-minus" />
            Detalles de la Baja
          </h3>

          <p id="modalNombreProductoBaja" className="modal-producto-nombre-baja">
            {productoSeleccionado?.nombre ?? ""}
          </p>

          <div className="modal-campos-baja">
            <div className="modal-campo">
              <label htmlFor="modalSelectTipoBaja">Tipo de Baja:</label>
              <select
                id="modalSelectTipoBaja"
                className="modal-select-tipo"
                value={modalTipoBaja}
                onChange={(e) => setModalTipoBaja(e.target.value as ProductoBaja["tipoBaja"])}
              >
                <option value="Rotura">Rotura</option>
                <option value="Caducado">Caducado</option>
                <option value="Merma">Merma</option>
                <option value="Ajuste">Ajuste de Inventario</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div className="modal-campo">
              <label htmlFor="modalInputCantidadBaja">Cantidad:</label>
              <input
                type="number"
                id="modalInputCantidadBaja"
                className="modal-input-cantidad-baja"
                min={1}
                max={productoSeleccionado?.stock ?? 1}
                value={modalCantidad}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const max = Number(productoSeleccionado?.stock ?? 1);

                  if (v > max) {
                    setModalCantidad(max);
                    showNotification(`La cantidad no puede superar el stock disponible (${max})`, "warning");
                    return;
                  }
                  if (v < 1) {
                    setModalCantidad(1);
                    return;
                  }
                  setModalCantidad(v);
                }}
              />
              <small id="modalStockDisponible" className="stock-disponible-info">
                Stock disponible: {productoSeleccionado?.stock ?? 0} unidades
              </small>
            </div>
          </div>

          <div className="modal-botones-baja">
            <button id="btnModalCancelarBaja" className="btn-modal-baja btn-modal-cancelar-baja" type="button" onClick={cerrarModal}>
              Cancelar
            </button>

            <button id="btnModalConfirmarBaja" className="btn-modal-baja btn-modal-confirmar-baja" type="button" onClick={confirmarBajaModal}>
              Registrar Baja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}