# Backend NestJS - Smart Economato

API REST del proyecto. **Frontend:** React + TypeScript. **Base de datos:** PostgreSQL en Supabase (remoto). Sin PHP.

## Instalación

```bash
cd backend
npm install
```

## Base de datos (Supabase)

Toda la persistencia está en **PostgreSQL en Supabase**. No se usa base de datos local.

Variables de entorno: crea un archivo `.env` en `backend/` (copia de `.env.example`) con:

- `DB_HOST` – host del pooler (ej. `aws-0-eu-central-1.pooler.supabase.com`; en Supabase: Project Settings → Database → Connection pooling)
- `DB_PORT` – `6543`
- `DB_NAME` – `postgres`
- `DB_USER` – usuario (ej. `postgres.TU_PROJECT_REF`)
- `DB_PASS` – contraseña de la base de datos
- `ALLOWED_ORIGINS` – orígenes permitidos para CORS (ej. `http://localhost:8081`)

La conexión usa **SSL** por defecto (obligatorio en Supabase). Si falla la conexión, comprueba usuario/contraseña y que el proyecto Supabase no esté pausado.

## Ejecución

```bash
npm run start:dev
```

La API queda en **http://localhost:3000/api** (variable `PORT`).

Health checks disponibles:

- `GET /api/health`
- `GET /api/ready`

## Con Docker

El `docker-compose` de la raíz levanta el backend en el contenedor `api` (puerto 3000). El frontend (React) se sirve en el puerto 8081 y hace proxy de `/api` a este backend.

## Rutas principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/login` | Login |
| GET/POST | `/api/usuarios` | Usuarios |
| GET/POST | `/api/categorias` | Categorías |
| GET/POST/PUT/DELETE | `/api/proveedores` | Proveedores |
| GET/POST/PUT | `/api/productos` | Productos |
| GET/POST/PUT | `/api/pedidos` | Pedidos |
| GET/POST | `/api/bajas` | Bajas |
| GET/POST | `/api/movimientos` | Movimientos |
| GET/POST | `/api/auditoria` | Auditoría |
| GET | `/api/informes?tipo=...` | Informes |
| GET/POST/DELETE | `/api/rendimientos` | Rendimientos |

Si en Supabase no existe la tabla `rendimientos`, créala desde el SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS rendimientos (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    ingrediente TEXT NOT NULL,
    peso_bruto DECIMAL(10,3) NOT NULL,
    peso_neto DECIMAL(10,3) NOT NULL,
    desperdicio DECIMAL(10,3) NOT NULL,
    rendimiento DECIMAL(5,2) NOT NULL,
    merma DECIMAL(5,2) NOT NULL,
    observaciones TEXT,
    usuario_id INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
