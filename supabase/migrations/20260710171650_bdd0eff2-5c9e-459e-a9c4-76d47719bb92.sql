
CREATE TABLE public.issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('zamkniete','nieaktualne-dane','zle-zdjecie','inne')),
  message TEXT NOT NULL CHECK (char_length(message) <= 2000),
  contact_email TEXT CHECK (contact_email IS NULL OR char_length(contact_email) <= 255),
  status TEXT NOT NULL DEFAULT 'nowe' CHECK (status IN ('nowe','w-toku','zalatwione','odrzucone')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.issue_reports TO anon;
GRANT INSERT ON public.issue_reports TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.issue_reports TO authenticated;
GRANT ALL ON public.issue_reports TO service_role;

ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can create a report; server locks status to 'nowe'
CREATE POLICY "Anyone can submit a report"
ON public.issue_reports FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'nowe');

-- Admins can view / update / delete
CREATE POLICY "Admins can view reports"
ON public.issue_reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.issue_reports FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reports"
ON public.issue_reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.issue_reports_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER issue_reports_before_update
BEFORE UPDATE ON public.issue_reports
FOR EACH ROW EXECUTE FUNCTION public.issue_reports_touch_updated_at();
