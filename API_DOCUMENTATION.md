#  Documentación de la API - Smart Economato

## Configuración General

**Base URL:** `http://localhost/smart-economato/backend`

### Headers Requeridos
```
Content-Type: application/json
Access-Control-Allow-Origin: *
```

### Métodos HTTP Soportados
- `GET` - Obtener datos
- `POST` - Crear datos
- `PUT` - Actualizar datos
- `DELETE` - Eliminar datos
- `OPTIONS` - Preflight CORS

---

## Endpoint: Usuarios

### 1. Obtener Lista de Usuarios
**GET** `/usuarios.php`

Obtiene la lista completa de todos los usuarios registrados (sin mostrar contraseñas).

**Parámetros de Query:** Ninguno

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "username": "admin",
    "role": "administrador",
    "nombre": "Juan",
    "email": "juan@example.com"
  },
  {
    "id": 2,
    "username": "almacenero",
    "role": "almacenero",
    "nombre": "Carlos",
    "email": "carlos@example.com"
  }
]
```

---

### 2. Login de Usuario
**GET** `/usuarios.php?username=<username>&password=<password>`

Autentica un usuario verificando sus credenciales.

**Parámetros de Query:**
- `username` (requerido) - Nombre de usuario
- `password` (requerido) - Contraseña del usuario

**Respuesta Exitosa (200) - Credenciales Válidas:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "password": "admin123",
    "role": "administrador",
    "nombre": "Juan",
    "apellidos": "Pérez García",
    "email": "juan@example.com",
    "telefono": "123456789"
  }
]
```

**Respuesta - Credenciales Inválidas:**
```json
[]
```

---

### 3. Crear Nuevo Usuario (Registro)
**POST** `/usuarios.php`

Registra un nuevo usuario en el sistema.

**Body (JSON):**
```json
{
  "username": "nuevouser",
  "password": "password123",
  "role": "almacenero",
  "nombre": "Miguel",
  "apellidos": "López Rodríguez",
  "email": "miguel@example.com",
  "telefono": "987654321"
}
```

**Campos Requeridos:**
- `username`  - Nombre de usuario único
- `password`  - Contraseña del usuario

**Campos Opcionales:**
- `role` - Rol del usuario (administrador, almacenero, etc.)
- `nombre` - Nombre del usuario
- `apellidos` - Apellidos del usuario
- `email` - Email del usuario
- `telefono` - Teléfono del usuario

**Respuesta Exitosa (201):**
```json
{
  "message": " Usuario registrado correctamente"
}
```

**Errores Posibles:**
- `400` - Faltan datos obligatorios
- `500` - Error al crear el usuario (posible duplicado)

```json
{
  "error": " Error al crear usuario: UNIQUE constraint failed"
}
```

---

##  Endpoint: Productos

### 1. Obtener Lista de Productos
**GET** `/productos.php`

Obtiene todos los productos con información de categoría y proveedor.

**Parámetros de Query:** Ninguno

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombre": "Leche Desnatada",
    "precio": 1.50,
    "precioUnitario": 0.75,
    "stock": 100,
    "stockMinimo": 20,
    "categoriaId": 1,
    "cat_nombre": "Lácteos",
    "proveedorId": 2,
    "prov_nombre": "ProveAlimentario",
    "unidadMedida": "litro",
    "marca": "LaLactea",
    "codigoBarras": "8471000001234",
    "fechaCaducidad": "2026-03-15",
    "alergenos": ["lactosa"],
    "descripcion": "Leche desnatada sin lactosa",
    "imagen": "leche.jpg",
    "activo": 1,
    "categoria": {
      "id": 1,
      "nombre": "Lácteos"
    },
    "proveedor": {
      "id": 2,
      "nombre": "ProveAlimentario"
    }
  }
]
```

---

### 2. Obtener Producto por ID
**GET** `/productos.php?id=<id>`

Obtiene los detalles de un producto específico.

**Parámetros de Query:**
- `id` (requerido) - ID del producto

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "nombre": "Leche Desnatada",
  "precio": 1.50,
  "precioUnitario": 0.75,
  "stock": 100,
  "stockMinimo": 20,
  "categoriaId": 1,
  "proveedorId": 2,
  "unidadMedida": "litro",
  "marca": "LaLactea",
  "codigoBarras": "8471000001234",
  "fechaCaducidad": "2026-03-15",
  "alergenos": ["lactosa"],
  "descripcion": "Leche desnatada sin lactosa",
  "imagen": "leche.jpg",
  "activo": 1,
  "categoria": {
    "id": 1,
    "nombre": "Lácteos"
  },
  "proveedor": {
    "id": 2,
    "nombre": "ProveAlimentario"
  }
}
```

---

### 3. Crear Nuevo Producto
**POST** `/productos.php`

Crea un nuevo producto en la base de datos.

**Body (JSON):**
```json
{
  "nombre": "Yogur Natural",
  "precio": 2.50,
  "precioUnitario": 1.25,
  "stock": 50,
  "stockMinimo": 10,
  "categoriaId": 1,
  "proveedorId": 2,
  "unidadMedida": "unidad",
  "marca": "NaturaYogur",
  "codigoBarras": "8471000002345",
  "fechaCaducidad": "2026-02-28",
  "alergenos": ["lactosa"],
  "descripcion": "Yogur natural con frutas",
  "imagen": "yogur.jpg"
}
```

**Campos Requeridos:**
- `nombre` 
- `precio` 
- `precioUnitario` 
- `stock` 
- `categoriaId` 
- `proveedorId` 

**Campos Opcionales:**
- `stockMinimo` - Stock mínimo antes de alertar (por defecto 0)
- `unidadMedida` - Unidad de medida (kg, litro, unidad, etc.)
- `marca` - Marca del producto
- `codigoBarras` - Código de barras
- `fechaCaducidad` - Fecha de caducidad (formato: YYYY-MM-DD)
- `alergenos` - Array de alérgenos
- `descripcion` - Descripción del producto
- `imagen` - Nombre del archivo de imagen

**Respuesta Exitosa (201):**
```json
{
  "id": 2,
  "nombre": "Yogur Natural",
  "precio": 2.50,
  "precioUnitario": 1.25,
  "stock": 50,
  "stockMinimo": 10,
  "categoriaId": 1,
  "proveedorId": 2,
  "unidadMedida": "unidad",
  "marca": "NaturaYogur",
  "codigoBarras": "8471000002345",
  "fechaCaducidad": "2026-02-28",
  "alergenos": ["lactosa"],
  "descripcion": "Yogur natural con frutas",
  "imagen": "yogur.jpg"
}
```

**Errores Posibles:**
- `500` - Error al crear el producto

```json
{
  "error": "Error al crear"
}
```

---

### 4. Actualizar Producto
**PUT** `/productos.php?id=<id>`

Actualiza un producto existente (actualmente solo nombre, precio y stock).

**Parámetros de Query:**
- `id` (requerido) - ID del producto a actualizar

**Body (JSON):**
```json
{
  "nombre": "Leche Desnatada Premium",
  "precio": 1.75,
  "stock": 95
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Actualizado"
}
```

**Errores Posibles:**
- `400` - Falta el parámetro ID
- `500` - Error al actualizar

```json
{
  "error": "Error actualizando"
}
```

---

### 5. Eliminar Producto
**DELETE** `/productos.php?id=<id>`

Elimina un producto de la base de datos.

**Parámetros de Query:**
- `id` (requerido) - ID del producto a eliminar

**Respuesta Exitosa (200):**
```json
{
  "message": "Eliminado"
}
```

---

##  Endpoint: Categorías

### 1. Obtener Lista de Categorías
**GET** `/categorias.php`

Obtiene todas las categorías disponibles.

**Parámetros de Query:** Ninguno

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombre": "Lácteos",
    "descripcion": "Productos lácteos y derivados"
  },
  {
    "id": 2,
    "nombre": "Bebidas",
    "descripcion": "Bebidas variadas"
  },
  {
    "id": 3,
    "nombre": "Frutas y Verduras",
    "descripcion": "Productos frescos"
  }
]
```

---

##  Endpoint: Proveedores

### 1. Obtener Lista de Proveedores
**GET** `/proveedores.php`

Obtiene todos los proveedores registrados.

**Parámetros de Query:** Ninguno

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombre": "DistributorMayor",
    "contacto": "Juan Rodríguez",
    "telefono": "912345678",
    "email": "contacto@distributor.es",
    "direccion": "Calle Principal 123"
  },
  {
    "id": 2,
    "nombre": "ProveAlimentario",
    "contacto": "María García",
    "telefono": "934567890",
    "email": "ventas@provealimentario.es",
    "direccion": "Avenida Central 456"
  }
]
```

---

##  Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| `200` | Solicitud exitosa |
| `201` | Recurso creado exitosamente |
| `400` | Solicitud incorrecta (faltan parámetros) |
| `404` | Recurso no encontrado |
| `500` | Error del servidor |

---

##  Consideraciones de Seguridad

 **IMPORTANTE:** Esta API actualmente tiene problemas de seguridad que deben ser corregidos:

1. **Contraseñas sin encriptación**: Las contraseñas se almacenan en texto plano. Usar hashing (`password_hash()` en PHP).
2. **Sin autenticación real**: No hay token o sesión. Implementar JWT o sesiones.
3. **Sin validación de permisos**: Cualquiera puede acceder a cualquier endpoint.
4. **CORS abierto**: Permite acceso desde cualquier origen. Especificar dominios permitidos.
5. **Inyección SQL prevenida**: Se usan prepared statements, ✅ bien hecho.

---

##  Ejemplos de Uso desde JavaScript

### Obtener Productos
```javascript
const API_URL = "http://localhost/smart-economato/backend";

async function getProductos() {
    try {
        const response = await fetch(`${API_URL}/productos.php`);
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error:", error);
    }
}
```

### Crear Producto
```javascript
async function crearProducto(producto) {
    try {
        const response = await fetch(`${API_URL}/productos.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(producto)
        });
        
        const resultado = await response.json();
        console.log("Producto creado:", resultado);
    } catch (error) {
        console.error("Error:", error);
    }
}

// Uso
crearProducto({
    nombre: "Leche",
    precio: 1.50,
    precioUnitario: 0.75,
    stock: 100,
    stockMinimo: 20,
    categoriaId: 1,
    proveedorId: 1,
    unidadMedida: "litro",
    marca: "LaLactea",
    codigoBarras: "8471000001234"
});
```

### Login de Usuario
```javascript
async function login(username, password) {
    try {
        const response = await fetch(
            `${API_URL}/usuarios.php?username=${username}&password=${password}`
        );
        const usuarios = await response.json();
        
        if (usuarios.length > 0) {
            console.log("Login exitoso:", usuarios[0]);
            localStorage.setItem('usuario', JSON.stringify(usuarios[0]));
        } else {
            console.log("Credenciales inválidas");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// Uso
login("admin", "admin123");
```

---

**Última actualización:** Enero 2026
