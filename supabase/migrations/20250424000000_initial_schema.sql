-- Create tables
CREATE TABLE public.users (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            email TEXT UNIQUE NOT NULL,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up row-level security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create access policies
CREATE POLICY "Users can view their own data"
  ON public.users FOR SELECT
                               USING (auth.uid() = id);
