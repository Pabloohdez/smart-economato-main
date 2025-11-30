import { cargarDatos, inicializarEventos } from "../controllers/almacen.js";
import { renderizarTabla } from "../utils/funciones.js";

document.addEventListener("DOMContentLoaded", () => {
  
  // --- 0. CONTROL DE SESIÓN ---
  const userStr = localStorage.getItem('usuarioActivo');
  if (!userStr) {
    window.location.href = 'index.html'; 
    return;
  }

  // Cargar info del usuario
  try {
    const usuario = JSON.parse(userStr);
    const saludoSpan = document.querySelector('.user-info span');
    const avatarDiv = document.querySelector('.user-avatar');
    const nombreMostrar = usuario.nombre || usuario.usuario || "Usuario";
    
    if (saludoSpan) saludoSpan.textContent = `Hola, ${nombreMostrar}`;
    if (avatarDiv) avatarDiv.textContent = nombreMostrar.charAt(0).toUpperCase();
  } catch (e) {
    console.error("Error leyendo usuario:", e);
  }

  const content = document.getElementById("content");
  const sidebar = document.querySelector(".menu");

  // --- 1. LÓGICA DE NAVEGACIÓN (Router) ---
  document.addEventListener("click", async (e) => {
    // Detectamos click en cualquier enlace con data-page
    const targetLink = e.target.closest("a[data-page]");
    if (!targetLink) return;

    e.preventDefault();

    const pageName = targetLink.dataset.page;
    const pageKey = pageName.toLowerCase();

    // 1.1 Gestión visual del menú
    const menuLinks = document.querySelectorAll(".menu a[data-page]");
    menuLinks.forEach((l) => l.classList.remove("activo"));
    
    // Ajuste para páginas relacionadas
    let pageKeyForMenu = pageKey;
    if (pageKey === "ingresarproductos") {
      pageKeyForMenu = "inventario";
    }
    
    const activeMenuLink = Array.from(menuLinks).find(
      link => link.dataset.page.toLowerCase() === pageKeyForMenu
    );
    if (activeMenuLink) activeMenuLink.classList.add("activo");

    // 1.2 Mapeo de Nombres de Archivo
    let fileName = pageName; 
    
    if (pageKey === "inicio") fileName = "inicio";
    if (pageKey === "inventario") fileName = "Inventario";
    if (pageKey === "ingresarproductos") fileName = "ingresarProductos";
    if (pageKey === "recepcion") fileName = "Recepcion";
    if (pageKey === "bajas") fileName = "Bajas";
    if (pageKey === "configuracion") fileName = "Configuracion";

    // 1.3 Carga de contenido
    try {
      const response = await fetch(`pages/${fileName}.html`);
      if (!response.ok) throw new Error(`Error cargando pages/${fileName}.html`);
      const html = await response.text();

      content.innerHTML = html;

      // 1.4 Lógica por página
      switch (pageKey) {
        case "inventario":
          renderizarTabla([]);
          await cargarDatos();
          inicializarEventos();
          break;

        case "ingresarproductos": 
          import("../controllers/ingresoController.js")
            .then(module => {
                if (module.initIngreso) module.initIngreso();
            })
            .catch(err => console.error("Error cargando controlador de ingreso:", err));
          break;

        case "recepcion":
          import("../controllers/recepcionController.js")
            .then(module => {
                if (module.initRecepcion) module.initRecepcion();
            })
            .catch(err => console.error("Error cargando controlador de recepción:", err));
          break;

        case "bajas":
          import("../controllers/bajasController.js")
            .then(module => {
                if (module.initBajas) module.initBajas();
            })
            .catch(err => console.error("Error cargando controlador de bajas:", err));
          break;

        case "configuracion":
          import("../controllers/configuracionController.js")
            .then(module => {
                if (module.initConfiguracion) module.initConfiguracion();
            })
            .catch(err => console.error("Error cargando controlador de configuración:", err));
          break;
          
        default:
          break;
      }

      // Cerrar menú en móvil
      if (sidebar && sidebar.classList.contains("open")) sidebar.classList.remove("open");

    } catch (error) {
      console.error(error);
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #721c24;">
            <h3>Error al cargar</h3>
            <p>No pudimos encontrar el archivo <b>pages/${fileName}.html</b></p>
        </div>`;
    }
  });

  // --- 2. LOGOUT ---
  const btnSalir = document.querySelector('.logout-btn');
  if (btnSalir) {
      btnSalir.addEventListener('click', () => {
          localStorage.removeItem('usuarioActivo');
          window.location.href = 'index.html';
      });
  }

  // --- 3. ARRANQUE AUTOMÁTICO (Dashboard) ---
  console.log("Iniciando aplicación...");
  
  const inicioLink = document.querySelector('.menu a[data-page="Inicio"]') || 
                     document.querySelector('.menu a[data-page="inicio"]');

  if (inicioLink) {
    inicioLink.click();
  } else {
    console.warn("No se encontró el link 'Inicio' en el menú. Cargando manual.");
    fetch('pages/inicio.html')
      .then(res => res.text())
      .then(html => content.innerHTML = html);
  }
});