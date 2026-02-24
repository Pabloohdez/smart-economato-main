// src/views/main.js
import { navigateTo } from "../router.js?v=3"; // <--- Importamos el router
import { aplicarRestriccionesMenu, cargarRolUsuario, obtenerUsuarioActual } from "../utils/auth.js";

document.addEventListener("DOMContentLoaded", () => {

  // --- 0. CONTROL DE SESIÓN ---
  const userStr = localStorage.getItem('usuarioActivo');

  // Si estamos en index.html (login), no hacemos nada con main.js
  // (Esto evita el bucle si por error se carga main.js en el login)
  if (!userStr && !window.location.pathname.includes('index.html')) {
    window.location.href = 'index.html';
    return;
  }

  // Cargar info del usuario en el sidebar
  if (userStr) {
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
  }

  // Aplicar restricciones de menú según rol del usuario
  aplicarRestriccionesMenu();

  const sidebar = document.querySelector(".menu");

  // --- 1. LÓGICA DE NAVEGACIÓN (Delegada al Router) ---
  document.addEventListener("click", (e) => {
    // Detectamos click en cualquier enlace con data-page
    const targetLink = e.target.closest("a[data-page]");
    if (!targetLink) return;

    e.preventDefault();

    const pageName = targetLink.dataset.page;

    // 1.1 Gestión visual del menú (ACTIVO)
    const menuLinks = document.querySelectorAll(".menu a[data-page]");
    menuLinks.forEach((l) => {
      l.classList.remove("activo");
      l.removeAttribute("aria-current"); // Limpiar aria-current anterior
    });

    // Truco: Si vamos a "ingresarProductos", marcamos "Inventario" como activo
    let pageKeyForMenu = pageName.toLowerCase();
    if (pageKeyForMenu === "ingresarproductos") {
      pageKeyForMenu = "inventario";
    }

    const activeMenuLink = Array.from(menuLinks).find(
      link => link.dataset.page.toLowerCase() === pageKeyForMenu
    );
    if (activeMenuLink) {
      activeMenuLink.classList.add("activo");
      activeMenuLink.setAttribute("aria-current", "page"); // Marcar para lector de pantalla
    }

    // 1.2 LLAMAMOS AL ROUTER
    navigateTo(pageName);

    // Cerrar menú en móvil si está abierto
    if (sidebar && sidebar.classList.contains("open")) sidebar.classList.remove("open");
  });

  // --- 2. LOGOUT ---
  const btnSalir = document.querySelector('.logout-btn');
  if (btnSalir) {
    btnSalir.addEventListener('click', () => {
      localStorage.removeItem('usuarioActivo');
      window.location.href = 'index.html';
    });
  }

  // --- 3. ARRANQUE AUTOMÁTICO ---
  console.log("Iniciando aplicación...");

  // Detectar en qué página empezar (por defecto Inicio)
  // Simulamos un click en "Inicio" para cargar todo correctamente
  const inicioLink = document.querySelector('.menu a[data-page="Inicio"]') ||
    document.querySelector('.menu a[data-page="inicio"]');

  if (inicioLink) {
    inicioLink.click();
  } else {
    navigateTo('inicio'); // Carga manual si falla el click
  }
});