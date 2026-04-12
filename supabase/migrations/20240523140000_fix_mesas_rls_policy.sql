-- Habilitar RLS en la tabla 'mesas' si aún no está habilitado.
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas para evitar conflictos.
DROP POLICY IF EXISTS "Allow admin full access to mesas" ON public.mesas;
DROP POLICY IF EXISTS "Allow admin to insert mesas" ON public.mesas;
DROP POLICY IF EXISTS "Allow device to read its own mesa" ON public.mesas;

-- Crear una política única y clara para los administradores.
-- Esto concede permiso para TODAS las acciones (SELECT, INSERT, UPDATE, DELETE)
-- si el rol del usuario en el token JWT es 'admin'.
CREATE POLICY "Admin full access on mesas"
ON public.mesas
FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Crear una política para que los dispositivos (tablets) puedan leer su propia información.
-- Esto es crucial para el funcionamiento de la aplicación en la mesa.
-- La política asume que el 'device_id' en la tabla 'mesas' coincide con el 'user_id' (sub) del dispositivo autenticado.
CREATE POLICY "Device can read its own mesa"
ON public.mesas
FOR SELECT
TO authenticated
USING (
  dispositivo_id = (auth.jwt() ->> 'sub')
);
