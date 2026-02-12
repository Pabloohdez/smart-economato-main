# Especificación Técnica de API - Smart Economato

## 1. Visión General del Sistema

Este documento define la interfaz de programación de aplicaciones (API) y la arquitectura interna del backend para el sistema Smart Economato. El backend está construido sobre PHP vanilla, utilizando una arquitectura procedimental centrada en recursos y una capa de persistencia basada en MySQL.

### 1.1 Protocolos de Comunicación

- **Base URL:** `/api`
- **Formato de Intercambio:** JSON (`application/json`)
- **Codificación:** UTF-8

### 1.2 Estándares de Seguridad

- **Protección SQL Injection:** Uso estricto de Sentencias Preparadas (Prepared Statements) en todas las operaciones de base de datos.
- **Restricción de Origen (CORS):** Configurado en `config.php` para permitir métodos GET, POST, PUT, DELETE.
- **Validación de Entorno:** Los endpoints sensibles (`categorias.php`, `proveedores.php`) implementan validación de cabecera `X-Requested-With` para restringir el acceso directo vía navegador.

---

## 2. Referencia de API (Interfaz Pública)

### A. Autenticación (`/login.php`)

Permite la identificación de usuarios en el sistema.

**Método:** `POST`

**Parámetros del Cuerpo (JSON):**
| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `username` | String | Sí | Identificador del usuario. |
| `password` | String | Sí | Contraseña en texto plano. |

**Respuestas:**

- `200 OK`: Autenticación exitosa. Retorna objeto usuario (sin contraseña).
- `400 Bad Request`: Payload malformado o campos faltantes.
- `401 Unauthorized`: Credenciales inválidas.

### B. Gestión de Productos (`/productos.php`)

Controlador principal para operaciones CRUD sobre el inventario.

#### Listar Productos

**Método:** `GET`
**Descripción:** Retorna todos los productos con relaciones a categorías y proveedores resueltas.

**Estructura de Respuesta (Array JSON):**

```json
[
  {
    "id": "a1b2c3d4",
    "nombre": "Producto Ejemplo",
    "precio": 10.5,
    "stock": 100,
    "categoria": { "id": 1, "nombre": "General" },
    "proveedor": { "id": 2, "nombre": "Proveedor A" }
  }
]
```

#### Crear Producto

**Método:** `POST`
**Descripción:** Registra un nuevo ítem en el inventario.

**Parámetros Principales:**
| Campo | Tipo | Requerido | Notas |
| :--- | :--- | :--- | :--- |
| `nombre` | String | Sí | |
| `precio` | Float | Sí | |
| `categoriaId` | Int | Sí | Debe existir en tabla `categorias`. |
| `proveedorId` | Int | Sí | Debe existir en tabla `proveedores`. |
| `stock` | Int | Opcional | Default: 0 |

#### Actualizar Producto

**Método:** `PUT`
**URL:** `/productos.php?id={id}`
**Descripción:** Actualización completa del recurso. Se requiere enviar el objeto completo.

### C. Catálogos Auxiliares

Endpoints para poblar listas de selección en la interfaz.

- **GET /categorias.php**: Lista de categorías.
- **GET /proveedores.php**: Lista de proveedores.
- **Nota:** Requieren cabecera `X-Requested-With: XMLHttpRequest`.

---

## 3. Implementación Interna (Lógica de Backend)

Esta sección detalla la lógica operativa de cada archivo fuente para propósitos de mantenimiento.

### 3.1 Núcleo del Sistema (`api/config.php`)

Archivo de arranque (bootstrap) incluido en todos los endpoints.

- **Gestión de Errores:** Establece `mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT)` para convertir errores de base de datos en excepciones capturables.
- **Conexión Resiliente:** Envuelve la instanciación de `mysqli` en un bloque `try-catch`. En caso de fallo, termina la ejecución invocando `sendError(500)`.

### 3.2 Lógica de Controladores

#### `api/productos.php`

- **Optimización de Consultas:** Utiliza `LEFT JOIN` con las tablas `categorias` y `proveedores` para evitar el problema de "N+1 consultas".
- **Tipado de Datos (Type Casting):** PHP recupera los datos de MySQL como cadenas por defecto. Este script realiza un casteo explícito (`(float)`, `(int)`) antes de enviar el JSON para garantizar la integridad de tipos en el cliente.
- **Generación de Claves:** Implementa un algoritmo de IDs semialeatorios usando `substr(md5(uniqid(rand(), true)), 0, 8)` para evitar IDs secuenciales predecibles.

#### `api/login.php`

- **Sanitización de Salida:** Implementa una medida de seguridad crítica al ejecutar `unset($user['password'])` sobre el array de resultados antes de la serialización JSON. Esto asegura que ningún hash o contraseña escape del servidor.

#### `api/categorias.php` y `api/proveedores.php`

- **Middlewares:** Implementan una llamada a `requireAjax()` al inicio del script. Esto actúa como un firewall de aplicación, rechazando peticiones que no provengan de un cliente HTTP válido (como navegadores navegando directamente).

### 3.3 Sistema de Respuestas (`api/utils/`)

#### `response.php`

Implementa el patrón de **Negociación de Contenido**.

1.  **Detección:** Analiza las cabeceras `Accept` y `X-Requested-With`.
2.  **Ramificación:**
    - **Contexto API:** Si es una petición AJAX, serializa la respuesta como JSON estandarizado: `{ "success": boolean, "data": mixed, "error": object }`.
    - **Contexto Usuario:** Si es una petición de navegador, invoca al motor de renderizado HTML.

#### `error_page.php`

Motor de plantillas para errores.

- Genera documentos HTML5 completos con CSS embebido (Inline CSS) para asegurar la visualización correcta sin dependencias externas.
- **Modo Depuración:** Si la IP del cliente es `127.0.0.1`, inyecta un bloque de detalles técnicos (Stack Trace / Mensaje SQL) en la vista HTML.

---

## 4. Aseguramiento de Calidad (QA)

El proyecto incluye herramientas de prueba integradas en la raíz.

### Suite de Pruebas Automatizadas (`test_api.html`)

Interfaz basada en navegador para validación de integración (Integration Testing).

- **Pruebas de Seguridad:** Simula ataques de Inyección SQL (`' OR '1'='1`) y verifica que el servidor responda con `401 Unauthorized` en lugar de `200 OK`.
- **Pruebas de Carga (Stress Testing):** Utiliza `Promise.allSettled` para despachar lotes concurrentes de peticiones, permitiendo evaluar el comportamiento del servidor web y la base de datos bajo condiciones de alta concurrencia.

### Previsualización de Errores (`test_errors.html`)

Herramienta de desarrollo UI/UX. Permite verificar la consistencia visual de todas las páginas de error del sistema (400-503) mediante llamadas controladas al script `test_error.php`.

---

## 5. Glosario de Códigos de Estado

| Código  | Descripción Técnica   | Condición de Disparo                   |
| :------ | :-------------------- | :------------------------------------- |
| **200** | OK                    | Petición procesada correctamente.      |
| **201** | Created               | Recurso creado exitosamente (POST).    |
| **400** | Bad Request           | Error de validación o JSON malformado. |
| **401** | Unauthorized          | Fallo de autenticación.                |
| **403** | Forbidden             | Restricción de acceso (`requireAjax`). |
| **404** | Not Found             | Recurso o Endpoint no localizado.      |
| **500** | Internal Server Error | Excepción no controlada o fallo de BD. |
| **503** | Service Unavailable   | Mantenimiento o sobrecarga.            |
