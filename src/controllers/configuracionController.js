import { showNotification } from "../utils/notifications.js";

let usuarioActual = null;

const ALERGENOS_DISPONIBLES = [
    'Lácteos', 'Gluten', 'Huevos', 'Pescado',
    'Crustáceos', 'Moluscos', 'Soja',
    'Sulfitos', 'Apio', 'Mostaza', 'Sésamo',
    'Cacahuetes', 'Altramuces',
    'Almendras', 'Avellanas', 'Nueces', 'Anacardos',
    'Pistachos', 'Pacanas', 'Nueces de Brasil', 'Macadamias'
];

export async function initConfiguracion() {
    console.log("⚙️ Iniciando módulo de configuración...");

    // Cargar datos del usuario desde localStorage
    cargarDatosUsuario();

    // Configurar tabs
    configurarTabs();

    // Configurar eventos
    configurarEventos();

    // Cargar alergias guardadas
    cargarAlergiasGuardadas();

    // Cargar preferencias de notificaciones
    cargarPreferenciasNotificaciones();
}

function cargarDatosUsuario() {
    const userStr = localStorage.getItem('usuarioActivo');
    if (!userStr) {
        showNotification("No se encontró información del usuario", 'error');
        window.location.href = 'index.html';
        return;
    }

    usuarioActual = JSON.parse(userStr);

    // Rellenar campos del perfil
    document.getElementById("inputNombrePerfil").value =
        `${usuarioActual.nombre || ''} ${usuarioActual.apellidos || ''}`.trim();
    document.getElementById("inputUsuarioPerfil").value =
        usuarioActual.usuario || usuarioActual.username || '';
    document.getElementById("inputEmailPerfil").value =
        usuarioActual.email || '';
    document.getElementById("inputTelefonoPerfil").value =
        usuarioActual.telefono || '';
    document.getElementById("inputRolPerfil").value =
        usuarioActual.rol || usuarioActual.role || 'usuario';
}

function configurarTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Desactivar todos
            tabs.forEach(t => {
                t.classList.remove('activo');
                t.setAttribute('aria-selected', 'false');
                t.setAttribute('tabindex', '-1');
            });
            panels.forEach(c => {
                c.classList.remove('activo');
                c.hidden = true;
            });

            // Activar selección
            tab.classList.add('activo');
            tab.setAttribute('aria-selected', 'true');
            tab.removeAttribute('tabindex'); // o tabindex="0"

            const targetId = `tab-${tab.dataset.tab}`;
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('activo');
                targetPanel.hidden = false;
            }
        });

        // Soporte teclado (flechas)
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const index = Array.from(tabs).indexOf(e.target);
                let newIndex = e.key === 'ArrowRight' ? index + 1 : index - 1;

                if (newIndex >= tabs.length) newIndex = 0;
                if (newIndex < 0) newIndex = tabs.length - 1;

                tabs[newIndex].focus();
                tabs[newIndex].click(); // Opcional: activar al enfocar
            }
        });
    });
}

function configurarEventos() {
    // Guardar perfil
    document.getElementById("btnGuardarPerfil").addEventListener("click", guardarPerfil);

    // Checkboxes de alergias
    document.querySelectorAll('.checkbox-alergeno').forEach(checkbox => {
        checkbox.addEventListener('change', actualizarResumenAlergias);
    });

    // Guardar alergias
    document.getElementById("btnGuardarAlergias").addEventListener("click", guardarAlergias);

    // Guardar notificaciones
    document.getElementById("btnGuardarNotificaciones").addEventListener("click", guardarNotificaciones);

    // Listener para switch de alertas de productos (Popup inmediato)
    document.getElementById("switchAlertasProductos").addEventListener("change", (e) => {
        if (e.target.checked) {
            alert("⚠️ HAS ACTIVADO LAS ALERTAS DE ALÉRGENOS\n\nEl sistema te avisará automáticamente cuando intentes distribuir un producto que contenga tus alérgenos registrados.");
        }
    });
}

function guardarPerfil() {
    const email = document.getElementById("inputEmailPerfil").value.trim();
    const telefono = document.getElementById("inputTelefonoPerfil").value.trim();

    // Actualizar objeto usuario
    usuarioActual.email = email;
    usuarioActual.telefono = telefono;

    // Guardar en localStorage
    localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActual));

    mostrarMensaje("✅ Perfil actualizado correctamente", "green");

    // En una app real, aquí harías PUT a la API
    console.log("📤 Perfil actualizado:", usuarioActual);
}

function actualizarResumenAlergias() {
    const checkboxes = document.querySelectorAll('.checkbox-alergeno:checked');
    const lista = document.getElementById("listaAlergiasSeleccionadas");

    if (checkboxes.length === 0) {
        lista.innerHTML = '<p class="texto-vacio">No has seleccionado ninguna alergia</p>';
        return;
    }

    lista.innerHTML = '';
    checkboxes.forEach(checkbox => {
        const card = checkbox.closest('.card-alergeno');
        const alergeno = card.dataset.alergeno;

        const badge = document.createElement('div');
        badge.className = 'badge-alergia-seleccionada';
        badge.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            ${alergeno}
        `;
        lista.appendChild(badge);
    });
}

function guardarAlergias() {
    const alergiasSeleccionadas = [];

    document.querySelectorAll('.checkbox-alergeno:checked').forEach(checkbox => {
        const card = checkbox.closest('.card-alergeno');
        alergiasSeleccionadas.push(card.dataset.alergeno);
    });

    // Guardar en localStorage
    const configAlergias = {
        alergias: alergiasSeleccionadas,
        fechaActualizacion: new Date().toISOString()
    };

    localStorage.setItem(`alergias_${usuarioActual.id}`, JSON.stringify(configAlergias));

    // También actualizar en el objeto usuario
    usuarioActual.alergias = alergiasSeleccionadas;
    localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActual));

    mostrarMensaje(
        `✅ Configuración guardada: ${alergiasSeleccionadas.length} alergia(s) registrada(s)`,
        "green"
    );

    // Mostrar advertencia
    if (alergiasSeleccionadas.length > 0) {
        setTimeout(() => {
            showNotification(
                `⚠️ IMPORTANTE\n\n` +
                `Has registrado ${alergiasSeleccionadas.length} alergia(s):\n` +
                `${alergiasSeleccionadas.join(', ')}\n\n` +
                `Recibirás alertas automáticas cuando busques o intentes ` +
                `distribuir productos que contengan estos alérgenos.`,
                'warning'
            );
        }, 500);
    }

    console.log("🛡️ Alergias guardadas:", configAlergias);
}

function cargarAlergiasGuardadas() {
    const configStr = localStorage.getItem(`alergias_${usuarioActual.id}`);

    if (!configStr) return;

    const config = JSON.parse(configStr);

    // Marcar checkboxes correspondientes
    config.alergias.forEach(alergeno => {
        const card = document.querySelector(`.card-alergeno[data-alergeno="${alergeno}"]`);
        if (card) {
            const checkbox = card.querySelector('.checkbox-alergeno');
            checkbox.checked = true;
        }
    });

    // Actualizar resumen
    actualizarResumenAlergias();

    console.log("📋 Alergias cargadas:", config.alergias);
}

function guardarNotificaciones() {
    const preferencias = {
        alertasProductos: document.getElementById("switchAlertasProductos").checked,
        bloqueoDistribucion: document.getElementById("switchBloqueoDistribucion").checked,
        nuevosProductos: document.getElementById("switchNuevosProductos").checked,
        fechaActualizacion: new Date().toISOString()
    };

    localStorage.setItem(`notificaciones_${usuarioActual.id}`, JSON.stringify(preferencias));

    mostrarMensaje("✅ Preferencias de notificaciones guardadas", "green");

    console.log("🔔 Preferencias guardadas:", preferencias);
}

function cargarPreferenciasNotificaciones() {
    const prefStr = localStorage.getItem(`notificaciones_${usuarioActual.id}`);

    if (!prefStr) return;

    const pref = JSON.parse(prefStr);

    document.getElementById("switchAlertasProductos").checked = pref.alertasProductos !== false;
    document.getElementById("switchBloqueoDistribucion").checked = pref.bloqueoDistribucion !== false;
    document.getElementById("switchNuevosProductos").checked = pref.nuevosProductos || false;

    console.log("🔔 Preferencias cargadas:", pref);
}

function mostrarMensaje(texto, color) {
    const mensaje = document.getElementById("mensajeEstadoConfig");
    mensaje.textContent = texto;
    mensaje.style.background =
        color === "green" ? "#f0fff4" :
            color === "orange" ? "#fffaf0" : "#fff5f5";
    mensaje.style.color =
        color === "green" ? "#2f855a" :
            color === "orange" ? "#c05621" : "#c53030";
    mensaje.style.border = `2px solid ${color === "green" ? "#9ae6b4" :
        color === "orange" ? "#fbd38d" : "#fc8181"
        }`;

    setTimeout(() => {
        mensaje.textContent = "";
        mensaje.style.background = "transparent";
        mensaje.style.border = "none";
    }, 5000);
}

// Función para obtener alergias del usuario actual (para usar en otros módulos)
export function obtenerAlergiasUsuario() {
    const userStr = localStorage.getItem('usuarioActivo');
    if (!userStr) return [];

    const usuario = JSON.parse(userStr);
    const configStr = localStorage.getItem(`alergias_${usuario.id}`);

    if (!configStr) return [];

    const config = JSON.parse(configStr);
    return config.alergias || [];
}

// Función para verificar si un producto contiene alérgenos del usuario
export function productoTieneAlergenos(producto) {
    const alergiasUsuario = obtenerAlergiasUsuario();

    if (alergiasUsuario.length === 0) return { tiene: false, alergenos: [] };

    const alergenosProducto = producto.alergenos || [];

    const alergenosEncontrados = alergiasUsuario.filter(alergia =>
        alergenosProducto.some(alergeno =>
            alergeno.toLowerCase().includes(alergia.toLowerCase()) ||
            alergia.toLowerCase().includes(alergeno.toLowerCase())
        )
    );

    return {
        tiene: alergenosEncontrados.length > 0,
        alergenos: alergenosEncontrados
    };
}