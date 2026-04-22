-- Seed de cuentas demo con los 3 roles del sistema
-- Contraseñas: Admin123! / Profesor123! / Alumno123!

INSERT INTO usuarios (id, username, password, role, nombre, apellidos, email, email_verified_at)
VALUES
  ('role-admin',    'admin',    '$2b$10$OD8yTnRl6ZX8pmgDIs5IluhRDay0h/EyZ0k5uueYxdeofNEhaW/uO', 'administrador', 'Admin',    'Demo', 'admin@smarteconomato.local',    NOW()),
  ('role-profesor', 'profesor', '$2b$10$u9qYcLUPnaIJGMhcd5ieeuCNRcMisI0mkF9Ym0DhQQ8j.1f6bC4g.', 'profesor',      'Profesor', 'Demo', 'profesor@smarteconomato.local', NOW()),
  ('role-alumno',   'alumno',   '$2b$10$B7KkOGKytAFIZTbpHQuvpezoA.sVDmtuB0Gwl93XzxSWY59ZVlJ0m', 'alumno',        'Alumno',   'Demo', 'alumno@smarteconomato.local',   NOW())
ON CONFLICT (id) DO NOTHING;
