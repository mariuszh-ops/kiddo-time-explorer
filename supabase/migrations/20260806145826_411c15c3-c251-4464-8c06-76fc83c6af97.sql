CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "Admins can view all reviews" ON public.user_reviews;
DROP POLICY "Admins can update all reviews" ON public.user_reviews;
DROP POLICY "Admins can delete reviews" ON public.user_reviews;
DROP POLICY "Admins can view reports" ON public.issue_reports;
DROP POLICY "Admins can update reports" ON public.issue_reports;
DROP POLICY "Admins can delete reports" ON public.issue_reports;

CREATE POLICY "Admins can view all reviews" ON public.user_reviews FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update all reviews" ON public.user_reviews FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete reviews" ON public.user_reviews FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can view reports" ON public.issue_reports FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update reports" ON public.issue_reports FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete reports" ON public.issue_reports FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.user_reviews_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);