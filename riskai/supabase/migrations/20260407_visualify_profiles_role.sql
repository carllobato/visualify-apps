-- Job title / function (UI "Role"); was only in auth user_metadata.role.
ALTER TABLE public.visualify_profiles
  ADD COLUMN IF NOT EXISTS role text;

COMMENT ON COLUMN public.visualify_profiles.role IS 'Optional job title (e.g. Risk manager). Legacy copies may exist in auth.users raw_user_meta_data.role.';
