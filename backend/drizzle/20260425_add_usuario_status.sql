-- Migración para Supabase: añade la columna status a la tabla usuarios.
-- Los usuarios existentes se marcan como approved para no bloquear cuentas ya activas.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS status VARCHAR(20);

UPDATE usuarios
  SET status = 'approved'
  WHERE status IS NULL;

ALTER TABLE usuarios
  ALTER COLUMN status SET DEFAULT 'pending_approval';
