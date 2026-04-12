-- Habilitar RLS en la tabla 'mesas' si aún no está habilitado.
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores para no mezclar lógica y evitar conflictos.
DROP POLICY IF EXISTS "Admin full access on mesas" ON public.mesas;
DROP POLICY IF EXISTS "Device can read its own mesa" ON public.mesas;
DROP POLICY IF EXISTS "Public can read mesas" ON public.mesas;

-- Política para Administradores: Acceso total usando la función has_role.
-- Esta es la forma recomendada y consistente con tu esquema de base de datos.
-- Política para Administradores: Acceso total usando app_metadata.
-- Esto se alinea con la lógica de tu aplicación (AdminPage.tsx, create-user function).
CREATE POLICY "Admin full access on mesas"
ON public.mesas
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Política para Dispositivos: Solo lectura para su propia mesa.
-- Utiliza el 'sub' del JWT, que es el estándar para identificar al usuario/dispositivo.
CREATE POLICY "Device can read its own mesa"
ON public.mesas
FOR SELECT
TO authenticated
USING (
  dispositivo_id = (auth.jwt() ->> 'sub')
);
