-- Habilitar RLS en la tabla 'mesas' si aún no está habilitado.
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores para no mezclar lógica y evitar conflictos.
DROP POLICY IF EXISTS "Admin full access on mesas" ON public.mesas;
DROP POLICY IF EXISTS "Device can read its own mesa" ON public.mesas;
DROP POLICY IF EXISTS "Public can read mesas" ON public.mesas; -- Limpiando también nombres nuevos

-- Política para Administradores: Acceso total usando app_metadata.
-- Esto se alinea con la lógica de tu aplicación (AdminPage.tsx, create-user function).
CREATE POLICY "Admin full access on mesas"
ON public.mesas
FOR ALL
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Política para Dispositivos/Público: Permitir lectura a todos.
-- La página /mesa necesita poder buscar su configuración por 'dispositivo_id' de forma anónima.
-- La seguridad aquí se basa en que el dispositivo solo conoce su propio ID (un UUID largo y secreto).
CREATE POLICY "Public can read mesas"
ON public.mesas
FOR SELECT
USING (true);
