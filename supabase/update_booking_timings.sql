-- Update clinic_config session hours to 10:00 AM - 4:00 PM and 6:30 PM - 11:00 PM IST
ALTER TABLE public.clinic_config
  ADD COLUMN IF NOT EXISTS morning_start TIME NOT NULL DEFAULT '10:00:00',
  ADD COLUMN IF NOT EXISTS morning_end TIME NOT NULL DEFAULT '16:00:00',
  ADD COLUMN IF NOT EXISTS evening_start TIME NOT NULL DEFAULT '18:30:00',
  ADD COLUMN IF NOT EXISTS evening_end TIME NOT NULL DEFAULT '23:00:00';

UPDATE public.clinic_config
SET
  morning_start = '10:00:00',
  morning_end = '16:00:00',
  evening_start = '18:30:00',
  evening_end = '23:00:00'
WHERE id = 1;

-- Helper function to check current IST time against both windows
CREATE OR REPLACE FUNCTION public.is_token_booking_open_ist()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (
    ((NOW() AT TIME ZONE 'Asia/Kolkata')::time >= TIME '10:00:00'
     AND (NOW() AT TIME ZONE 'Asia/Kolkata')::time <= TIME '16:00:00')
    OR
    ((NOW() AT TIME ZONE 'Asia/Kolkata')::time >= TIME '18:30:00'
     AND (NOW() AT TIME ZONE 'Asia/Kolkata')::time <= TIME '23:00:00')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_token_booking_open_ist() TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
