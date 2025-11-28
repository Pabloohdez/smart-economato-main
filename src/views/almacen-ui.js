import { inicializarEventos, cargarDatos } from '../controllers/almacen.js';
//import { getProductos, getCategorias, getProveedores } from '../services/apiService.js'; 

// Solo inicializa todo al cargar
document.addEventListener('DOMContentLoaded', async () => {
    await cargarDatos();        
    inicializarEventos();       
});








