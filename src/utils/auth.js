/**
 * Módulo de autenticación del frontend
 * Gestiona el usuario actual y verificación de roles
 */

const API_URL = 'http://localhost:8080/api';

/**
 * Obtener el usuario actual desde localStorage
 * @returns {object|null} Datos del usuario o null
 */
export function obtenerUsuarioActual() {
    try {
        // La app guarda el usuario bajo la clave 'usuarioActivo'
        const usuarioStr = localStorage.getItem('usuarioActivo');
        return usuarioStr ? JSON.parse(usuarioStr) : null;
    } catch (e) {
        console.error('Error al leer usuario actual:', e);
        return null;
    }
}

/**
 * Verificar si el usuario actual es administrador
 * La tabla usuarios tiene campo 'role' (no 'rol')
 * @returns {boolean}
 */
export function esAdmin() {
    const usuario = obtenerUsuarioActual();
    return usuario && usuario.role === 'admin';
}

/**
 * Guardar datos del usuario en localStorage
 * @param {object} usuario - Datos del usuario
 */
export function guardarUsuario(usuario) {
    localStorage.setItem('usuarioActivo', JSON.stringify(usuario));
}

/**
 * Obtener el ID del usuario actual
 * @returns {string} ID del usuario, 'admin1' por defecto
 */
export function obtenerUsuarioId() {
    const usuario = obtenerUsuarioActual();
    return usuario?.id || 'admin1';
}

/**
 * Cargar el rol del usuario desde el servidor y actualizar localStorage
 * @param {string} usuarioId - ID del usuario
 */
export async function cargarRolUsuario(usuarioId) {
    try {
        const response = await fetch(`${API_URL}/usuarios.php?id=${usuarioId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const usuario = obtenerUsuarioActual() || {};
            usuario.id = usuarioId;
            usuario.role = result.data.role || 'user';
            usuario.nombre = result.data.username || usuarioId;
            guardarUsuario(usuario);
            return usuario;
        }
    } catch (error) {
        console.error('Error al cargar rol de usuario:', error);
    }
    return null;
}

/**
 * Ocultar elementos del DOM que requieren rol de admin
 */
export function aplicarRestriccionesMenu() {
    if (!esAdmin()) {
        // Ocultar enlace de auditoría
        const auditoriaLink = document.querySelector('a[data-page="Auditoria"]');
        if (auditoriaLink) {
            auditoriaLink.style.display = 'none';
        }
        console.log('🔒 Restricciones de menú aplicadas (usuario no admin)');
    } else {
        console.log('🔓 Acceso completo (usuario admin)');
    }
}
