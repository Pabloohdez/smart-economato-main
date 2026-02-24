const API_URL = 'http://localhost:8080/api';
// Cache in-memory
let _cacheProductos = null;
let _cacheCategorias = null;
let _cacheProveedores = null;

async function getProductos(forceReload = false) {
    if (_cacheProductos && !forceReload) return _cacheProductos;
    try {
        const url = forceReload ? `${API_URL}/productos.php?t=${Date.now()}` : `${API_URL}/productos.php`;
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const data = json.success && json.data ? json.data : json;
        _cacheProductos = data; // Guardar en caché
        return data;
    } catch (e) {
        throw new Error("Error obteniendo productos: " + e.message);
    }
}

async function getCategorias(forceReload = false) {
    if (_cacheCategorias && !forceReload) return _cacheCategorias;
    try {
        const url = forceReload ? `${API_URL}/categorias.php?t=${Date.now()}` : `${API_URL}/categorias.php`;
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const data = json.success && json.data ? json.data : json;
        _cacheCategorias = data;
        return data;
    } catch (e) {
        throw new Error("Error obteniendo categorías: " + e.message);
    }
}

async function getProveedores(forceReload = false) {
    if (_cacheProveedores && !forceReload) return _cacheProveedores;
    try {
        const url = forceReload ? `${API_URL}/proveedores.php?t=${Date.now()}` : `${API_URL}/proveedores.php`;
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const data = json.success && json.data ? json.data : json;
        _cacheProveedores = data;
        return data;
    } catch (e) {
        throw new Error("Error obteniendo proveedores: " + e.message);
    }
}

export async function crearProducto(producto) {
    try {
        console.log("📤 Enviando producto:", producto);

        const response = await fetch(`${API_URL}/productos.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(producto)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const resultado = await response.json();

        if (resultado.success === false) {
            throw new Error(resultado.error?.message || "Error desconocido en API");
        }

        console.log("✅ Producto creado:", resultado.data);
        return resultado.data || resultado;
    } catch (error) {
        console.error("❌ API Error:", error);
        throw error;
    }
}

export async function actualizarProducto(id, producto) {
    try {
        console.log(`📤 Actualizando producto ${id}:`, producto);

        // Enviamos el ID como query param o en el cuerpo, pero mi PHP soporta query param para PUT
        const response = await fetch(`${API_URL}/productos.php?id=${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(producto)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const resultado = await response.json();

        if (resultado.success === false) {
            throw new Error(resultado.error?.message || "Error desconocido en API");
        }

        console.log("✅ Producto actualizado:", resultado.data);
        return resultado.data || resultado;
    } catch (error) {
        console.error("❌ API Error:", error);
        throw error;
    }
}

async function registrarBaja(bajaData) {
    try {
        console.log("📤 Registrando baja:", bajaData);
        const response = await fetch(`${API_URL}/bajas.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify(bajaData)
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error al registrar baja");

        return result;
    } catch (error) {
        console.error("❌ API Error (Baja):", error);
        throw error;
    }
}

async function crearPedido(pedidoData) {
    try {
        console.log("📤 Creando pedido:", pedidoData);
        const response = await fetch(`${API_URL}/pedidos.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify(pedidoData)
        });

        const result = await response.json();
        if (!result.success) {
            const errorMsg = typeof result.error === 'object' ?
                (result.error.message || JSON.stringify(result.error)) :
                (result.error || "Error al crear pedido");
            throw new Error(errorMsg);
        }

        return result;
    } catch (error) {
        console.error("❌ API Error (Pedido):", error);
        throw error;
    }
}

export { getProductos, getCategorias, getProveedores, registrarBaja, crearPedido };