const API_URL = "http://localhost:4000";

async function getProductos(){
    const response = await fetch(`${API_URL}/productos`)
    const data = await response.json()
    return data
}

async function getCategorias(){
    const response = await fetch(`${API_URL}/categorias`)
    const data = await response.json()
    return data
} 

async function getProveedores(){
    const response = await fetch(`${API_URL}/proveedores`)
    const data = await response.json()
    return data
}

export async function crearProducto(producto) {
    try {
        console.log("📤 Enviando producto:", producto);
        
        const response = await fetch(`${API_URL}/productos`, {
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

export { getProductos, getCategorias, getProveedores };