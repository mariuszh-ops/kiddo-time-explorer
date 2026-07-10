
CREATE TABLE public.user_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (place_id, user_id)
);

GRANT SELECT ON public.user_reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.user_reviews TO authenticated;
GRANT ALL ON public.user_reviews TO service_role;

ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- Anonymous & everyone can see approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON public.user_reviews FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Authenticated users can additionally see their own reviews (any status)
CREATE POLICY "Users can view their own reviews"
  ON public.user_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can insert their own reviews, forced to pending
CREATE POLICY "Users can insert their own review"
  ON public.user_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Authenticated users can update their own review (resets to pending)
CREATE POLICY "Users can update their own review"
  ON public.user_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Trigger: on UPDATE, force status back to 'pending' and bump updated_at
CREATE OR REPLACE FUNCTION public.user_reviews_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.status = 'pending';
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_reviews_before_update
  BEFORE UPDATE ON public.user_reviews
  FOR EACH ROW EXECUTE FUNCTION public.user_reviews_before_update();

CREATE INDEX user_reviews_place_id_status_idx
  ON public.user_reviews (place_id, status, created_at DESC);
