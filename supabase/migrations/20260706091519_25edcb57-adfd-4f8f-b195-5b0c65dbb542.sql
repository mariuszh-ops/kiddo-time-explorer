CREATE TABLE public.saved_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_slug text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('favorite','want_to_visit')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_slug, kind)
);

CREATE INDEX saved_activities_user_kind_idx ON public.saved_activities (user_id, kind);

GRANT SELECT, INSERT, DELETE ON public.saved_activities TO authenticated;
GRANT ALL ON public.saved_activities TO service_role;

ALTER TABLE public.saved_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved activities"
  ON public.saved_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved activities"
  ON public.saved_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved activities"
  ON public.saved_activities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
