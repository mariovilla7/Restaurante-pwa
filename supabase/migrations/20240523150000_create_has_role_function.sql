-- Primero, eliminamos la función existente para evitar conflictos de nombres de parámetros.
-- Especificamos los tipos de los argumentos para que Postgres sepa exactamente qué función eliminar.
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Ahora, creamos la función con la lógica correcta y la configuración de seguridad.
CREATE OR REPLACE FUNCTION public.has_role(check_user_id uuid, check_role app_role)
RETURNS boolean
LANGUAGE plpgsql
-- SECURITY DEFINER es crucial. Permite que la función se ejecute con los permisos del
-- usuario que la definió (el superusuario), lo que le da acceso para leer la tabla user_roles
-- cuando se invoca desde una política de RLS.
SECURITY DEFINER
-- Establecer un search_path explícito es una buena práctica de seguridad.
SET search_path = public
AS $$
BEGIN
  -- Devuelve true si existe una fila en user_roles que coincida con el user_id y el rol proporcionados.
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id AND role = check_role
  );
END;
$$;
