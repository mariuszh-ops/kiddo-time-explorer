CREATE TABLE public.user_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id integer NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ratings TO authenticated;
GRANT ALL ON public.user_ratings TO service_role;

ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ratings"
ON public.user_ratings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ratings"
ON public.user_ratings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON public.user_ratings FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON public.user_ratings FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.user_ratings_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_ratings_before_update
BEFORE UPDATE ON public.user_ratings
FOR EACH ROW EXECUTE FUNCTION public.user_ratings_touch_updated_at();

CREATE OR REPLACE FUNCTION public.get_activity_rating(activity_id integer)
RETURNS TABLE (avg_rating numeric, ratings_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT round(avg(r.rating)::numeric, 1) AS avg_rating, count(*)::bigint AS ratings_count
  FROM public.user_ratings r
  WHERE r.activity_id = get_activity_rating.activity_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_activity_rating(integer) TO anon, authenticated;