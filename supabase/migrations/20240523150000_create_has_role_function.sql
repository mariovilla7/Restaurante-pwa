-- STEP 1: Drop all dependent policies from all tables that use the has_role function.
-- This is necessary before we can replace the function itself.
DROP POLICY IF EXISTS "Admin full access on mesas" ON public.mesas;
DROP POLICY IF EXISTS "Device can read its own mesa" ON public.mesas;
DROP POLICY IF EXISTS "Categorias admin" ON public.categorias;
DROP POLICY IF EXISTS "Platos admin" ON public.platos;
DROP POLICY IF EXISTS "Roles admin" ON public.user_roles;
-- Defensive drop for old policy names
DROP POLICY IF EXISTS "Mesas admin" ON public.mesas;

-- STEP 2: Drop and recreate the has_role function with the correct definition.
-- This ensures it has the crucial SECURITY DEFINER option.
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
CREATE OR REPLACE FUNCTION public.has_role(check_user_id uuid, check_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id AND role = check_role
  );
END;
$$;

-- STEP 3: Recreate all the necessary policies using the new, correct function.
-- Admin policy for 'mesas'
CREATE POLICY "Admin full access on mesas"
ON public.mesas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Device policy for 'mesas'
CREATE POLICY "Device can read its own mesa"
ON public.mesas FOR SELECT TO authenticated
USING (dispositivo_id = (auth.jwt() ->> 'sub'));

-- Admin policies for other tables, assuming they follow the same pattern.
CREATE POLICY "Categorias admin"
ON public.categorias FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platos admin"
ON public.platos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Roles admin"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
