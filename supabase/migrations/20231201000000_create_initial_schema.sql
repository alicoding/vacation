-- Create necessary tables for the vacation tracker app

-- Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  year INTEGER NOT NULL,
  province TEXT,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create vacation_bookings table
CREATE TABLE IF NOT EXISTS public.vacation_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  is_half_day BOOLEAN DEFAULT false,
  half_day_portion TEXT,
  google_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create google_tokens table
CREATE TABLE IF NOT EXISTS public.google_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Holidays are readable by all authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'holidays' 
        AND policyname = 'Holidays are viewable by all authenticated users'
    ) THEN
        CREATE POLICY "Holidays are viewable by all authenticated users"
        ON public.holidays
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END
$$;

-- Vacation bookings are only viewable, modifiable, or deletable by the owner
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'vacation_bookings' 
        AND policyname = 'Users can view their own vacation bookings'
    ) THEN
        CREATE POLICY "Users can view their own vacation bookings"
        ON public.vacation_bookings
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'vacation_bookings' 
        AND policyname = 'Users can create their own vacation bookings'
    ) THEN
        CREATE POLICY "Users can create their own vacation bookings"
        ON public.vacation_bookings
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'vacation_bookings' 
        AND policyname = 'Users can update their own vacation bookings'
    ) THEN
        CREATE POLICY "Users can update their own vacation bookings"
        ON public.vacation_bookings
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'vacation_bookings' 
        AND policyname = 'Users can delete their own vacation bookings'
    ) THEN
        CREATE POLICY "Users can delete their own vacation bookings"
        ON public.vacation_bookings
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Google tokens are only accessible by the owner
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'google_tokens' 
        AND policyname = 'Users can view their own Google tokens'
    ) THEN
        CREATE POLICY "Users can view their own Google tokens"
        ON public.google_tokens
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'google_tokens' 
        AND policyname = 'Users can create their own Google tokens'
    ) THEN
        CREATE POLICY "Users can create their own Google tokens"
        ON public.google_tokens
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'google_tokens' 
        AND policyname = 'Users can update their own Google tokens'
    ) THEN
        CREATE POLICY "Users can update their own Google tokens"
        ON public.google_tokens
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Create indexes - with column existence check
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'holidays' AND column_name = 'year'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS holidays_year_idx ON public.holidays(year)';
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'holidays' AND column_name = 'province'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS holidays_province_idx ON public.holidays(province)';
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vacation_bookings' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS vacation_bookings_user_id_idx ON public.vacation_bookings(user_id)';
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vacation_bookings' AND column_name = 'start_date'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vacation_bookings' AND column_name = 'end_date'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS vacation_bookings_date_range_idx ON public.vacation_bookings(start_date, end_date)';
  END IF;
END
$$;

-- Note: The _inspect_table_columns function has been removed since it wasn't working correctly
