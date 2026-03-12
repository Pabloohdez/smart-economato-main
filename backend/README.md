# API NestJS - Smart Economato

Réplica del backend PHP (carpeta `api`) en NestJS. **Base de datos: PostgreSQL en Supabase** (remoto). No se usa ninguna base de datos en local.

## Instalación

```bash
cd backend
npm install
```

## Base de datos (Supabase)

Toda la persistencia está en **PostgreSQL en Supabase**. No hace falta instalar ni ejecutar PostgreSQL en tu máquina.

La conexión usa el **connection pooler** de Supabase (puerto 6543). Por defecto se usan las mismas credenciales que en `api/config.php`. Para cambiarlas, variables de entorno (o `.env` en `backend/`):

- `DB_HOST` – host del pooler (ej. `aws-1-eu-west-1.pooler.supabase.com`)
- `DB_PORT` – `6543`
- `DB_NAME` – `postgres`
- `DB_USER` – usuario del proyecto Supabase
- `DB_PASS` – contraseña

## Ejecución

```bash
npm run start:dev
```

La API queda en **http://localhost:3000/api** (puerto configurable con la variable de entorno `PORT`).

## Rutas (sin `.php`)

| PHP (antes)     | NestJS (ahora)   |
|-----------------|------------------|
| `/api/login.php` | `POST /api/login` |
| `/api/usuarios.php` | `GET /api/usuarios?id=`, `POST /api/usuarios` |
| `/api/categorias.php` | `GET/POST /api/categorias` |
| `/api/proveedores.php` | `GET/POST/PUT/DELETE /api/proveedores` |
| `/api/productos.php` | `GET/POST/PUT /api/productos` |
| `/api/pedidos.php` | `GET/POST/PUT /api/pedidos` |
| `/api/bajas.php` | `GET/POST /api/bajas` |
| `/api/movimientos.php` | `GET/POST /api/movimientos` |
| `/api/auditoria.php` | `GET/POST /api/auditoria` |
| `/api/informes.php` | `GET /api/informes?tipo=dashboard|gastos_mensuales|usuarios` |

## Cambios en el frontend

Sustituir las URLs que usan `.php` por la misma ruta sin extensión:

- `http://localhost:8080/api/login.php` → `http://localhost:3000/api/login`
- `http://localhost:8080/api/productos.php` → `http://localhost:3000/api/productos`
- Y así con el resto de recursos.

Puedes definir una base URL y reutilizarla:

```js
const API_URL = 'http://localhost:3000/api';
fetch(`${API_URL}/productos`)   // en lugar de /productos.php
fetch(`${API_URL}/pedidos?id=1`)
```

Para **crear usuario**, el frontend puede apuntar a la misma API:  
`POST http://localhost:3000/api/usuarios` (en lugar de `http://localhost:4000/usuarios`).
