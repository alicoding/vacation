-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- User policies (users can only access their own data)
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Account policies
CREATE POLICY "Users can view their own accounts"
  ON public.accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Session policies
CREATE POLICY "Users can access their own sessions"
  ON public.sessions
  FOR ALL
  USING (auth.uid() = user_id);

-- Vacation bookings policies
CREATE POLICY "Users can view their own vacation bookings"
  ON public.vacation_bookings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vacation bookings"
  ON public.vacation_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vacation bookings"
  ON public.vacation_bookings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vacation bookings"
  ON public.vacation_bookings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Holiday policies (readable by any authenticated user)
CREATE POLICY "Holidays are viewable by all authenticated users"
  ON public.holidays
  FOR SELECT
  USING (auth.role() = 'authenticated');
