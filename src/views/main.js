import { cargarDatos, inicializarEventos } from "../controllers/almacen.js";
import { renderizarTabla } from "../utils/funciones.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- 0. CONTROL DE SESIÓN Y USUARIO ---
  const userStr = localStorage.getItem('usuarioActivo');
  
  // Si no hay usuario guardado, lo mandamos al login por seguridad
  if (!userStr) {
    window.location.href = 'index.html';
    return;
  }

  const usuario = JSON.parse(userStr);

  // Actualizamos el "Hola, Admin" y el Avatar
  const saludoSpan = document.querySelector('.user-info span');
  const avatarDiv = document.querySelector('.user-avatar');

  // Usamos el nombre real o el usuario si no tiene nombre
  const nombreMostrar = usuario.nombre || usuario.usuario || "Usuario";
  
  if (saludoSpan) {
    saludoSpan.textContent = `Hola, ${nombreMostrar}`;
  }
  
  if (avatarDiv) {
    // Tomamos la inicial del nombre y la ponemos en mayúscula
    const inicial = nombreMostrar.charAt(0).toUpperCase();
    avatarDiv.textContent = inicial;
  }
  // --- FIN CONTROL USUARIO ---


  const content = document.getElementById("content");
  const sidebar = document.querySelector(".menu");

  // --- 1. DELEGACIÓN DE EVENTOS ---
  document.addEventListener("click", async (e) => {
    // Buscamos el elemento <a> más cercano al click
    const targetLink = e.target.closest("a[data-page]");

    // Si no es un link de navegación, ignoramos
    if (!targetLink) return;

    e.preventDefault();

    // Obtenemos el nombre de la página (convertimos a minúscula para el nombre del archivo)
    const rawPageName = targetLink.dataset.page;
    const page = rawPageName.toLowerCase();

    // --- GESTIÓN VISUAL (Clase 'activo') ---
    // Quitamos 'activo' de todos los links del menú
    const menuLinks = document.querySelectorAll(".menu a[data-page]");
    menuLinks.forEach((l) => l.classList.remove("activo"));

    // Buscamos el link correspondiente en el menú para marcarlo
    const activeMenuLink = Array.from(menuLinks).find(
      link => link.dataset.page.toLowerCase() === page
    );
    
    if (activeMenuLink) {
      activeMenuLink.classList.add("activo");
    }

    // --- CARGA DE CONTENIDO ---
    try {
      let response = await fetch(`pages/${page}.html`);

      if (!response.ok) throw new Error(`No se pudo cargar pages/${page}.html`);
      const html = await response.text();

      content.innerHTML = html;

      // Lógica específica para la página de inventario
      if (page === "inventario") {
        renderizarTabla(page);
        cargarDatos();
        inicializarEventos();
      }

      // En móviles, cerramos el menú al hacer click
      if (sidebar && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
      }

    } catch (error) {
      console.error(error);
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #721c24;">
            <h3>Error 404</h3>
            <p>No pudimos cargar la sección <b>${page}</b>.</p>
            <small>${error.message}</small>
        </div>`;
    }
  });

  // --- 2. LOGOUT (Cerrar Sesión) ---
  const btnSalir = document.querySelector('.logout-btn');
  if (btnSalir) {
      btnSalir.addEventListener('click', (e) => {
          localStorage.removeItem('usuarioActivo');
          // El href del enlace hará la redirección a index.html
      });
  }

  // --- 3. AUTO-ARRANQUE (Cargar Inicio por defecto) ---
  const links = document.querySelectorAll("a[data-page]");
  const linkInicio = Array.from(links).find(
    link => link.dataset.page.toLowerCase() === "inicio"
  );

  if (linkInicio) {
    linkInicio.click();
  }
});