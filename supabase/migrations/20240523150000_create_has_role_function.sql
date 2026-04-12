-- Esta función comprueba si un usuario tiene un rol específico en la tabla user_roles.
-- Es el núcleo de la política de seguridad basada en roles.
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
