-- 1. Habilitar RLS en la tabla 'mesas' si aún no está habilitado.
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas de INSERT en 'mesas' para evitar conflictos.
DROP POLICY IF EXISTS "Allow admin to insert mesas" ON public.mesas;

-- 3. Crear la nueva política de INSERT.
-- Esta política permite a un usuario insertar una nueva fila en 'mesas'
-- si su rol, almacenado en los metadatos de autenticación, es 'admin'.
CREATE POLICY "Allow admin to insert mesas"
ON public.mesas
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 4. Asegurarse de que los administradores también puedan ver, actualizar y eliminar mesas.
DROP POLICY IF EXISTS "Allow admin full access to mesas" ON public.mesas;

CREATE POLICY "Allow admin full access to mesas"
ON public.mesas
FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 5. Permitir que los dispositivos (tablets) lean la información de su propia mesa.
-- Esto es crucial para que la tablet de la mesa sepa qué mesa es.
DROP POLICY IF EXISTS "Allow device to read its own mesa" ON public.mesas;

CREATE POLICY "Allow device to read its own mesa"
ON public.mesas
FOR SELECT
TO authenticated
USING (
  dispositivo_id = (auth.jwt() ->> 'sub')
);
