-- This function runs when a role is inserted or updated in user_roles.
-- It copies the role into the auth.users.raw_app_meta_data field.
CREATE OR REPLACE FUNCTION public.sync_user_role_to_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- This is crucial for allowing the function to modify the auth.users table.
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- This trigger fires the function after any insert or update on the user_roles table.
CREATE OR REPLACE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_user_role_to_metadata();
