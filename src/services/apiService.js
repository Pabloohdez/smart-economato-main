const API_URL = "http://localhost/smart-economato-main-2/api";

async function getProductos(){
    const response = await fetch(`${API_URL}/productos.php`)
    const data = await response.json()
    return data
}

async function getCategorias(){
    const response = await fetch(`${API_URL}/categorias.php`)
    const data = await response.json()
    return data
} 

async function getProveedores(){
    const response = await fetch(`${API_URL}/proveedores.php`)
    const data = await response.json()
    return data
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
        console.log("✅ Producto creado:", resultado);
        return resultado;
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
        console.log("✅ Producto actualizado:", resultado);
        return resultado;
    } catch (error) {
        console.error("❌ API Error:", error);
        throw error;
    }
}

export { getProductos, getCategorias, getProveedores };