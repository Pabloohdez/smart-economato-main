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


export { getProductos, getCategorias, getProveedores };