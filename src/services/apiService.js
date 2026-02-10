const API_URL = 'http://localhost:8080/api';
async function getProductos() {
    try {
        const response = await fetch(`${API_URL}/productos.php`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        return json.success && json.data ? json.data : json;
    } catch (e) {
        throw new Error("Error obteniendo productos: " + e.message);
    }
}

async function getCategorias() {
    try {
        const response = await fetch(`${API_URL}/categorias.php`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        return json.success && json.data ? json.data : json;
    } catch (e) {
        throw new Error("Error obteniendo categorías: " + e.message);
    }
}

async function getProveedores() {
    try {
        const response = await fetch(`${API_URL}/proveedores.php`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        return json.success && json.data ? json.data : json;
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

export { getProductos, getCategorias, getProveedores };