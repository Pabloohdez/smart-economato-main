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

    const pageName = targetLink.dataset.page; // Ej: "Inicio", "Inventario", "ingresarProductos"
    const pageKey = pageName.toLowerCase();   // Ej: "inicio", "inventario", "ingresarproductos"

    // 1.1 Gestión visual del menú (solo si el link está en la barra lateral)
    const menuLinks = document.querySelectorAll(".menu a[data-page]");
    menuLinks.forEach((l) => l.classList.remove("activo"));
    
    // Si el link clickeado pertenece al menú, lo activamos
    // Si no (ej: botón dentro de inventario), buscamos si tiene "padre" en el menú
    const activeMenuLink = Array.from(menuLinks).find(
      link => link.dataset.page.toLowerCase() === pageKey
    );
    if (activeMenuLink) activeMenuLink.classList.add("activo");

    // 1.2 Mapeo de Nombres de Archivo (Para corregir mayúsculas/minúsculas)
    let fileName = pageName; 
    
    // AJUSTES MANUALES:
    if (pageKey === "inicio") fileName = "inicio";         // inicio.html (minúscula)
    if (pageKey === "inventario") fileName = "Inventario"; // Inventario.html (Mayúscula)
    // ingresarProductos funciona directo porque coincide data-page="ingresarProductos" con el archivo

    // 1.3 Carga de contenido
    try {
      const response = await fetch(`pages/${fileName}.html`);
      if (!response.ok) throw new Error(`Error cargando pages/${fileName}.html`);
      const html = await response.text();

      content.innerHTML = html;

      // 1.4 Lógica por página
      switch (pageKey) {
        case "inventario":
          renderizarTabla([]); // Limpia visualmente antes de cargar
          await cargarDatos();
          inicializarEventos();
          break;

        case "ingresarproductos": 
          // Carga dinámica (Lazy Load) para evitar errores si el archivo falla
          import("../controllers/ingresoController.js")
            .then(module => {
                if (module.initIngreso) module.initIngreso();
            })
            .catch(err => console.error("Error cargando controlador de ingreso:", err));
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
  
  // Buscamos ESPECÍFICAMENTE el enlace del menú que lleva a Inicio
  // Usamos '.menu' para asegurar que no clickamos un botón perdido
  const inicioLink = document.querySelector('.menu a[data-page="Inicio"]') || 
                     document.querySelector('.menu a[data-page="inicio"]');

  if (inicioLink) {
    inicioLink.click();
  } else {
    // Si falla, carga manual de emergencia
    console.warn("No se encontró el link 'Inicio' en el menú. Cargando manual.");
    fetch('pages/inicio.html')
      .then(res => res.text())
      .then(html => content.innerHTML = html);
  }
});