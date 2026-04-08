-- Update role constraint to include Standard_User
ALTER TABLE forge_users DROP CONSTRAINT IF EXISTS forge_users_role_check;
ALTER TABLE forge_users ADD CONSTRAINT forge_users_role_check CHECK (role IN ('Super_User', 'Admin', 'HR', 'Executive', 'IT_Tech', 'User', 'Standard_User'));

-- Trigger to auto-provision forge_users profile on first login
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Get the first organization as a default
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;

  INSERT INTO public.forge_users (id, full_name, role, organization_id, work_status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
    'Standard_User',
    default_org_id,
    'Offline'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
