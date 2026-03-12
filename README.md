# Smart Economato

**Frontend:** React + TypeScript (Vite)  
**Backend:** NestJS  
**Base de datos:** PostgreSQL en Supabase (remoto).  

**No se usa XAMPP, PHP ni Apache.** Todo corre en Docker; la base de datos está en Supabase.

---

## Con Docker (recomendado)

Todo está dockerizado: frontend (React) y backend (NestJS). Un solo punto de entrada.

Si tienes XAMPP u otro servidor en el puerto 8080, deténlo antes de levantar Docker (o cambia el puerto en `docker-compose.yml`).

```bash
docker-compose up --build
```

- **App:** [http://localhost:8080](http://localhost:8080) — React (el navegador llama a `/api`, nginx hace proxy al backend).
- **API:** el backend NestJS corre en el contenedor `api`; las peticiones llegan vía proxy desde el frontend.

Variables de entorno (opcional, en un `.env` en la raíz):

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` — conexión a Supabase.

---

## Sin Docker (desarrollo local)

1. **Backend (NestJS)** — puerto 3000:
   ```bash
   cd backend && npm install && npm run start:dev
   ```

2. **Frontend (React)** — puerto 8080 (desde la raíz o desde frontend):
   ```bash
   # Desde la raíz (recomendado): arranca la app React en 8080
   npm run dev

   # O desde frontend:
   cd frontend
   cp .env.example .env
   npm install && npm run dev
   ```
   Abrir **http://localhost:8080** — verás la app React+TypeScript (no la antigua).

---

## Estructura

- `frontend/` — React + TypeScript (Vite). Se sirve con nginx en Docker.
- `backend/` — NestJS. API REST, conexión a Supabase.
- Base de datos solo en **Supabase** (PostgreSQL); no hay BD local, PHP ni XAMPP.
