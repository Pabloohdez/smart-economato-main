import { useEffect, useMemo, useState } from "react";
import { showAlert, showNotification } from "../utils/notifications";
import "../styles/configuracion.css";
import type { UsuarioActivo } from "../types";
import { useAuth } from "../contexts/AuthContext";

type PreferenciasNotificaciones = {
  alertasProductos: boolean;
  bloqueoDistribucion: boolean;
  nuevosProductos: boolean;
  filtradoBusqueda: boolean;
  fechaActualizacion: string;
};

type ConfigAlergias = {
  alergias: string[];
  fechaActualizacion: string;
};

type TabKey = "perfil" | "alergias" | "notificaciones";

const ALERGENOS_DISPONIBLES = [
  {
    nombre: "Lácteos",
    icono: "fa-solid fa-cow",
    bg: "#e3f2fd",
    color: "#1976d2",
  },
  {
    nombre: "Gluten",
    icono: "fa-solid fa-wheat-awn",
    bg: "#fff8e1",
    color: "#f57c00",
  },
  {
    nombre: "Huevos",
    icono: "fa-solid fa-egg",
    bg: "#fffde7",
    color: "#f9a825",
  },
  {
    nombre: "Pescado",
    icono: "fa-solid fa-fish",
    bg: "#e1f5fe",
    color: "#0277bd",
  },
  {
    nombre: "Crustáceos",
    icono: "fa-solid fa-shrimp",
    bg: "#fce4ec",
    color: "#c2185b",
  },
  {
    nombre: "Moluscos",
    icono: "fa-solid fa-circle",
    bg: "#f3e5f5",
    color: "#7b1fa2",
  },
  {
    nombre: "Almendras",
    icono: "fa-solid fa-seedling",
    bg: "#efebe9",
    color: "#5d4037",
  },
  {
    nombre: "Avellanas",
    icono: "fa-solid fa-circle-dot",
    bg: "#efebe9",
    color: "#5d4037",
  },
  {
    nombre: "Nueces",
    icono: "fa-solid fa-brain",
    bg: "#efebe9",
    color: "#5d4037",
  },
  {
    nombre: "Anacardos",
    icono: "fa-solid fa-seedling",
    bg: "#efebe9",
    color: "#5d4037",
  },
  {
    nombre: "Pistachos",
    icono: "fa-solid fa-seedling",
    bg: "#f1f8e9",
    color: "#33691e",
  },
  {
    nombre: "Pacanas",
    icono: "fa-solid fa-circle-dot",
    bg: "#efebe9",
    color: "#4e342e",
  },
  {
    nombre: "Nueces de Brasil",
    icono: "fa-solid fa-seedling",
    bg: "#efebe9",
    color: "#3e2723",
  },
  {
    nombre: "Macadamias",
    icono: "fa-solid fa-circle-dot",
    bg: "#fff8e1",
    color: "#f57f17",
  },
  {
    nombre: "Soja",
    icono: "fa-solid fa-leaf",
    bg: "#f1f8e9",
    color: "#558b2f",
  },
  {
    nombre: "Sulfitos",
    icono: "fa-solid fa-wine-bottle",
    bg: "#f3e5f5",
    color: "#8e24aa",
  },
  {
    nombre: "Apio",
    icono: "fa-solid fa-carrot",
    bg: "#e8f5e9",
    color: "#2e7d32",
  },
  {
    nombre: "Mostaza",
    icono: "fa-solid fa-pepper-hot",
    bg: "#fff9c4",
    color: "#f9a825",
  },
  {
    nombre: "Sésamo",
    icono: "fa-solid fa-circle-dot",
    bg: "#ffe0b2",
    color: "#e65100",
  },
  {
    nombre: "Cacahuetes",
    icono: "fa-solid fa-seedling",
    bg: "#d7ccc8",
    color: "#5d4037",
  },
  {
    nombre: "Altramuces",
    icono: "fa-solid fa-seedling",
    bg: "#fff9c4",
    color: "#fbc02d",
  },
] as const;

export default function ConfiguracionPage() {
  const { user: authUser, updateUser } = useAuth();
  const [tabActiva, setTabActiva] = useState<TabKey>("perfil");
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActivo | null>(
    null,
  );

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("");

  const [alergiasSeleccionadas, setAlergiasSeleccionadas] = useState<string[]>(
    [],
  );

  const [alertasProductos, setAlertasProductos] = useState(true);
  const [bloqueoDistribucion, setBloqueoDistribucion] = useState(true);
  const [nuevosProductos, setNuevosProductos] = useState(false);
  const [filtradoBusqueda, setFiltradoBusqueda] = useState(false);

  const [mensajeEstado, setMensajeEstado] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState<
    "green" | "orange" | "red" | ""
  >("");

  useEffect(() => {
    cargarDatosUsuario();
  }, []);

  function cargarDatosUsuario() {
    if (!authUser) {
      mostrarMensaje("No se encontró información del usuario", "red");
      return;
    }

    const user = authUser;
    setUsuarioActual(user);

    setNombreCompleto(`${user.nombre || ""} ${user.apellidos || ""}`.trim());
    setUsuario(user.usuario || user.username || "");
    setEmail(user.email || "");
    setTelefono(user.telefono || "");
    setRol(user.rol || user.role || "usuario");

    const userId = String(user.id ?? "");
    if (userId) {
      const configStr = localStorage.getItem(`alergias_${userId}`);
      if (configStr) {
        const config: ConfigAlergias = JSON.parse(configStr);
        setAlergiasSeleccionadas(config.alergias || []);
      }

      const prefStr = localStorage.getItem(`notificaciones_${userId}`);
      if (prefStr) {
        const pref: PreferenciasNotificaciones = JSON.parse(prefStr);
        setAlertasProductos(pref.alertasProductos !== false);
        setBloqueoDistribucion(pref.bloqueoDistribucion !== false);
        setNuevosProductos(!!pref.nuevosProductos);
        setFiltradoBusqueda(!!pref.filtradoBusqueda);
      }
    }
  }

  function mostrarMensaje(texto: string, tipo: "green" | "orange" | "red") {
    setMensajeEstado(texto);
    setMensajeTipo(tipo);

    window.setTimeout(() => {
      setMensajeEstado("");
      setMensajeTipo("");
    }, 5000);
  }

  function guardarPerfil() {
    if (!usuarioActual) return;

    const actualizado: UsuarioActivo = {
      ...usuarioActual,
      email: email.trim(),
      telefono: telefono.trim(),
    };

    localStorage.setItem("usuarioActivo", JSON.stringify(actualizado));
    updateUser(actualizado);
    setUsuarioActual(actualizado);
    mostrarMensaje("✅ Perfil actualizado correctamente", "green");
  }

  function toggleAlergia(alergeno: string) {
    setAlergiasSeleccionadas((prev) =>
      prev.includes(alergeno)
        ? prev.filter((a) => a !== alergeno)
        : [...prev, alergeno],
    );
  }

  function guardarAlergias() {
    if (!usuarioActual?.id) return;

    const configAlergias: ConfigAlergias = {
      alergias: alergiasSeleccionadas,
      fechaActualizacion: new Date().toISOString(),
    };

    localStorage.setItem(
      `alergias_${usuarioActual.id}`,
      JSON.stringify(configAlergias),
    );

    const actualizado: UsuarioActivo = {
      ...usuarioActual,
      alergias: alergiasSeleccionadas,
    };

    updateUser(actualizado);
    setUsuarioActual(actualizado);

    mostrarMensaje(
      `✅ Configuración guardada: ${alergiasSeleccionadas.length} alergia(s) registrada(s)`,
      "green",
    );

    if (alergiasSeleccionadas.length > 0) {
      window.setTimeout(() => {
        showAlert(
          `Has registrado ${alergiasSeleccionadas.length} alergia(s): ${alergiasSeleccionadas.join(
            ", ",
          )}. Recibirás alertas automáticas cuando busques o intentes distribuir productos que contengan estos alérgenos.`,
          "warning",
          "Importante",
        );
      }, 500);
    }
  }

  function guardarNotificaciones() {
    if (!usuarioActual?.id) return;

    const preferencias: PreferenciasNotificaciones = {
      alertasProductos,
      bloqueoDistribucion,
      nuevosProductos,
      filtradoBusqueda,
      fechaActualizacion: new Date().toISOString(),
    };

    localStorage.setItem(
      `notificaciones_${usuarioActual.id}`,
      JSON.stringify(preferencias),
    );

    mostrarMensaje("✅ Preferencias de notificaciones guardadas", "green");
  }

  const resumenAlergias = useMemo(
    () => alergiasSeleccionadas,
    [alergiasSeleccionadas],
  );

  return (
    <div>
      <div className="header-configuracion">
        <h1 className="titulo-configuracion">
          <i className="fa-solid fa-gear"></i> CONFIGURACIÓN DE PERFIL
        </h1>
        <p className="subtitulo">
          Gestiona tu información personal y configuración de alergias
        </p>
      </div>

      <div
        className="tabs-navegacion"
        role="tablist"
        aria-label="Secciones de configuración"
      >
        <button
          className={`tab-btn ${tabActiva === "perfil" ? "activo" : ""}`}
          role="tab"
          aria-selected={tabActiva === "perfil"}
          onClick={() => setTabActiva("perfil")}
          type="button"
        >
          <i className="fa-solid fa-user"></i> Perfil
        </button>

        <button
          className={`tab-btn ${tabActiva === "alergias" ? "activo" : ""}`}
          role="tab"
          aria-selected={tabActiva === "alergias"}
          onClick={() => setTabActiva("alergias")}
          type="button"
        >
          <i className="fa-solid fa-triangle-exclamation"></i> Alergias
        </button>

        <button
          className={`tab-btn ${tabActiva === "notificaciones" ? "activo" : ""}`}
          role="tab"
          aria-selected={tabActiva === "notificaciones"}
          onClick={() => setTabActiva("notificaciones")}
          type="button"
        >
          <i className="fa-solid fa-bell"></i> Notificaciones
        </button>
      </div>

      <div className={`tab-content ${tabActiva === "perfil" ? "activo" : ""}`}>
        {tabActiva === "perfil" && (
          <div className="panel-perfil">
            <h2 className="titulo-seccion">
              <i className="fa-solid fa-id-card"></i> Información Personal
            </h2>

            <div className="form-perfil">
              <div className="campo-perfil">
                <label htmlFor="inputNombrePerfil">Nombre Completo</label>
                <input
                  type="text"
                  id="inputNombrePerfil"
                  className="input-perfil"
                  value={nombreCompleto}
                  readOnly
                />
              </div>

              <div className="campo-perfil">
                <label htmlFor="inputUsuarioPerfil">Usuario</label>
                <input
                  type="text"
                  id="inputUsuarioPerfil"
                  className="input-perfil"
                  value={usuario}
                  readOnly
                />
              </div>

              <div className="campos-grupo">
                <div className="campo-perfil">
                  <label htmlFor="inputEmailPerfil">Email</label>
                  <input
                    type="email"
                    id="inputEmailPerfil"
                    className="input-perfil"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="campo-perfil">
                  <label htmlFor="inputTelefonoPerfil">Teléfono</label>
                  <input
                    type="tel"
                    id="inputTelefonoPerfil"
                    className="input-perfil"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              </div>

              <div className="campo-perfil">
                <label htmlFor="inputRolPerfil">Rol</label>
                <input
                  type="text"
                  id="inputRolPerfil"
                  className="input-perfil"
                  value={rol}
                  readOnly
                />
              </div>

              <button
                id="btnGuardarPerfil"
                className="btn-guardar-perfil"
                type="button"
                onClick={guardarPerfil}
              >
                <i className="fa-solid fa-save"></i> Guardar Cambios
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className={`tab-content ${tabActiva === "alergias" ? "activo" : ""}`}
      >
        {tabActiva === "alergias" && (
          <>
            <div className="alerta-seguridad">
              <i className="fa-solid fa-shield-halved"></i>
              <div>
                <strong>Información Importante</strong>
                <p>
                  Configura tus alergias para recibir alertas automáticas. Esta
                  información es crítica para tu seguridad.
                </p>
              </div>
            </div>

            <div className="panel-alergias">
              <h3 className="titulo-seccion">
                <i className="fa-solid fa-triangle-exclamation"></i> Mis
                Alergias Registradas
              </h3>

              <div className="grid-alergenos">
                {ALERGENOS_DISPONIBLES.map((item) => {
                  const checked = alergiasSeleccionadas.includes(item.nombre);
                  const inputId = `check-${item.nombre
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/ /g, "-")
                    .replace(/\./g, "")}`;

                  return (
                    <div
                      className="card-alergeno"
                      data-alergeno={item.nombre}
                      key={item.nombre}
                    >
                      <input
                        type="checkbox"
                        id={inputId}
                        className="checkbox-alergeno"
                        checked={checked}
                        onChange={() => toggleAlergia(item.nombre)}
                      />
                      <label htmlFor={inputId} className="label-alergeno">
                        <div
                          className="icono-alergeno"
                          style={{ background: item.bg, color: item.color }}
                        >
                          <i className={item.icono}></i>
                        </div>
                        <span className="nombre-alergeno">{item.nombre}</span>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="resumen-alergias">
                <h4>
                  <i className="fa-solid fa-list-check"></i> Resumen de Alergias
                  Seleccionadas
                </h4>

                <div className="lista-seleccionadas">
                  {resumenAlergias.length === 0 ? (
                    <p className="texto-vacio">
                      No has seleccionado ninguna alergia
                    </p>
                  ) : (
                    resumenAlergias.map((alergia) => (
                      <div className="badge-alergia-seleccionada" key={alergia}>
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        {alergia}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                id="btnGuardarAlergias"
                className="btn-guardar-alergias"
                type="button"
                onClick={guardarAlergias}
              >
                <i className="fa-solid fa-shield-heart"></i> Guardar
                Configuración de Alergias
              </button>
            </div>
          </>
        )}
      </div>

      <div
        className={`tab-content ${tabActiva === "notificaciones" ? "activo" : ""}`}
      >
        {tabActiva === "notificaciones" && (
          <div className="panel-notificaciones">
            <h3 className="titulo-seccion">
              <i className="fa-solid fa-bell"></i> Preferencias de Alertas
            </h3>

            <div className="opciones-notificaciones">
              <div className="opcion-notif">
                <div className="info-opcion">
                  <i
                    className="fa-solid fa-triangle-exclamation"
                    style={{ color: "#c53030" }}
                  ></i>
                  <div>
                    <label
                      htmlFor="switchAlertasProductos"
                      style={{ cursor: "pointer" }}
                    >
                      <strong>Alertas de Productos con Alérgenos</strong>
                    </label>
                    <p>
                      Recibir advertencias al buscar productos con tus alérgenos
                    </p>
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    id="switchAlertasProductos"
                    checked={alertasProductos}
                    onChange={(e) => {
                      setAlertasProductos(e.target.checked);
                      if (e.target.checked) {
                        showAlert(
                          "Has activado las alertas de alérgenos. El sistema te avisará automáticamente cuando intentes distribuir un producto que contenga tus alérgenos registrados.",
                          "warning",
                          "Alertas de Alérgenos Activadas",
                        );
                      }
                    }}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="opcion-notif">
                <div className="info-opcion">
                  <i
                    className="fa-solid fa-dolly"
                    style={{ color: "#2f855a" }}
                  ></i>
                  <div>
                    <label
                      htmlFor="switchBloqueoDistribucion"
                      style={{ cursor: "pointer" }}
                    >
                      <strong>Bloqueo en Distribución</strong>
                    </label>
                    <p>
                      Impedir distribución de productos incompatibles con tus
                      alergias
                    </p>
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    id="switchBloqueoDistribucion"
                    checked={bloqueoDistribucion}
                    onChange={(e) => setBloqueoDistribucion(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="opcion-notif">
                <div className="info-opcion">
                  <i
                    className="fa-solid fa-inbox"
                    style={{ color: "#3182ce" }}
                  ></i>
                  <div>
                    <label
                      htmlFor="switchNuevosProductos"
                      style={{ cursor: "pointer" }}
                    >
                      <strong>Alertas de Nuevos Productos</strong>
                    </label>
                    <p>
                      Notificar cuando se añadan productos con tus alérgenos
                    </p>
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    id="switchNuevosProductos"
                    checked={nuevosProductos}
                    onChange={(e) => setNuevosProductos(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="opcion-notif">
                <div className="info-opcion">
                  <i
                    className="fa-solid fa-filter"
                    style={{ color: "#805ad5" }}
                  ></i>
                  <div>
                    <label
                      htmlFor="switchFiltradoBusqueda"
                      style={{ cursor: "pointer" }}
                    >
                      <strong>Filtrado Estricto en Búsqueda</strong>
                    </label>
                    <p>
                      Ocultar automáticamente resultados incompatibles con tus
                      alergias
                    </p>
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    id="switchFiltradoBusqueda"
                    checked={filtradoBusqueda}
                    onChange={(e) => setFiltradoBusqueda(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <button
              id="btnGuardarNotificaciones"
              className="btn-guardar-notificaciones"
              type="button"
              onClick={guardarNotificaciones}
            >
              <i className="fa-solid fa-save"></i> Guardar Preferencias
            </button>
          </div>
        )}
      </div>

      <div
        id="mensajeEstadoConfig"
        className={`mensaje-estado-config ${mensajeTipo ? "mensaje-visible" : ""}`}
        style={{
          background:
            mensajeTipo === "green"
              ? "#f0fff4"
              : mensajeTipo === "orange"
                ? "#fffaf0"
                : mensajeTipo === "red"
                  ? "#fff5f5"
                  : "transparent",
          color:
            mensajeTipo === "green"
              ? "#2f855a"
              : mensajeTipo === "orange"
                ? "#c05621"
                : mensajeTipo === "red"
                  ? "#c53030"
                  : "transparent",
          border:
            mensajeTipo === "green"
              ? "2px solid #9ae6b4"
              : mensajeTipo === "orange"
                ? "2px solid #fbd38d"
                : mensajeTipo === "red"
                  ? "2px solid #fc8181"
                  : "none",
        }}
      >
        {mensajeEstado}
      </div>
    </div>
  );
}
