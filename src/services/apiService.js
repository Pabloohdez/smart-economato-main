async function getProductos(){
    const response = await fetch(`http://localhost:4000/productos`)
    const data = await response.json()
    return data
}

async function getCategorias(){
    const response = await fetch(`http://localhost:4000/categorias`)
    const data = await response.json()
    return data
} 

async function getProveedores(){
    const response = await fetch(`http://localhost:4000/proveedores`)
    const data = await response.json()
    return data
}

export async function crearProducto(producto) {
    try {
        const response = await fetch("http://localhost:4000/productos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(producto)
        });
        if (!response.ok) throw new Error("Error al guardar producto");
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

export { getProductos, getCategorias, getProveedores };