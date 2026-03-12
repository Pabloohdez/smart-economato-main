# Smart Economato

**Frontend:** React + TypeScript (Vite)  
**Backend:** NestJS  
**Base de datos:** PostgreSQL en Supabase (remoto). Sin PHP.

---

## Con Docker (recomendado)

Todo está dockerizado: frontend (React) y backend (NestJS). Un solo punto de entrada.

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

2. **Frontend (React)** — puerto 5173:
   ```bash
   cd frontend
   cp .env.example .env
   # Editar .env: VITE_API_URL=http://localhost:3000/api
   npm install && npm run dev
   ```
   Abrir [http://localhost:5173](http://localhost:5173).

---

## Estructura

- `frontend/` — React + TypeScript (Vite). Se sirve con nginx en Docker.
- `backend/` — NestJS. API REST, conexión a Supabase.
- Base de datos solo en **Supabase** (PostgreSQL); no hay BD local ni PHP.
