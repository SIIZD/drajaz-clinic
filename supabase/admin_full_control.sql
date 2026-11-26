-- Ensure clinic_config has configurable timing, fee, and geofence fields
ALTER TABLE public.clinic_config
  ADD COLUMN IF NOT EXISTS weekday_fee INT NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS sunday_fee INT NOT NULL DEFAULT 400,
  ADD COLUMN IF NOT EXISTS avg_mins_per_patient INT NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS morning_start TIME NOT NULL DEFAULT '10:00:00',
  ADD COLUMN IF NOT EXISTS morning_end TIME NOT NULL DEFAULT '16:00:00',
  ADD COLUMN IF NOT EXISTS evening_start TIME NOT NULL DEFAULT '18:30:00',
  ADD COLUMN IF NOT EXISTS evening_end TIME NOT NULL DEFAULT '23:00:00',
  ADD COLUMN IF NOT EXISTS clinic_lat DOUBLE PRECISION NOT NULL DEFAULT 19.8880,
  ADD COLUMN IF NOT EXISTS clinic_lng DOUBLE PRECISION NOT NULL DEFAULT 75.3421,
  ADD COLUMN IF NOT EXISTS geofence_radius_m DOUBLE PRECISION NOT NULL DEFAULT 150.0,
  ADD COLUMN IF NOT EXISTS qr_secret TEXT NOT NULL DEFAULT 'DRAJAZ_V8QR5X_SECRET';

INSERT INTO public.clinic_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_get_config(p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.clinic_config;
BEGIN
  IF NOT public._check_pin('ADMIN', p_pin) THEN
    RAISE EXCEPTION 'Unauthorized Admin PIN';
  END IF;
  SELECT * INTO v_cfg FROM public.clinic_config WHERE id = 1;
  RETURN to_jsonb(v_cfg);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_config(
  p_pin TEXT,
  p_weekday_fee INT,
  p_sunday_fee INT,
  p_avg_mins INT,
  p_morning_start TIME,
  p_morning_end TIME,
  p_evening_start TIME,
  p_evening_end TIME,
  p_clinic_lat DOUBLE PRECISION,
  p_clinic_lng DOUBLE PRECISION,
  p_geofence_radius_m DOUBLE PRECISION,
  p_qr_secret TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.clinic_config;
BEGIN
  IF NOT public._check_pin('ADMIN', p_pin) THEN
    RAISE EXCEPTION 'Unauthorized Admin PIN';
  END IF;

  UPDATE public.clinic_config
  SET
    weekday_fee = GREATEST(50, COALESCE(p_weekday_fee, 300)),
    sunday_fee = GREATEST(50, COALESCE(p_sunday_fee, 400)),
    avg_mins_per_patient = GREATEST(1, LEAST(60, COALESCE(p_avg_mins, 7))),
    morning_start = COALESCE(p_morning_start, TIME '10:00:00'),
    morning_end = COALESCE(p_morning_end, TIME '16:00:00'),
    evening_start = COALESCE(p_evening_start, TIME '18:30:00'),
    evening_end = COALESCE(p_evening_end, TIME '23:00:00'),
    clinic_lat = COALESCE(p_clinic_lat, 19.8880),
    clinic_lng = COALESCE(p_clinic_lng, 75.3421),
    geofence_radius_m = GREATEST(20, COALESCE(p_geofence_radius_m, 150.0)),
    qr_secret = COALESCE(NULLIF(btrim(p_qr_secret), ''), 'DRAJAZ_V8QR5X_SECRET')
  WHERE id = 1
  RETURNING * INTO v_cfg;

  RETURN to_jsonb(v_cfg);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_manage_token(
  p_pin TEXT,
  p_token_id UUID,
  p_status TEXT DEFAULT NULL,
  p_payment_status TEXT DEFAULT NULL,
  p_payment_mode TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.queue_tokens;
BEGIN
  IF NOT public._check_pin('ADMIN', p_pin) THEN
    RAISE EXCEPTION 'Unauthorized Admin PIN';
  END IF;

  IF p_status = 'IN_CABIN' THEN
    UPDATE public.queue_tokens
    SET status = 'COMPLETED'
    WHERE session_date = (SELECT session_date FROM public.queue_tokens WHERE id = p_token_id)
      AND status = 'IN_CABIN'
      AND id <> p_token_id;
  END IF;

  UPDATE public.queue_tokens
  SET
    status = COALESCE(NULLIF(p_status, ''), status),
    payment_status = COALESCE(NULLIF(p_payment_status, ''), payment_status),
    payment_mode = CASE
      WHEN p_payment_status = 'UNPAID' THEN 'NONE'
      ELSE COALESCE(NULLIF(p_payment_mode, ''), payment_mode)
    END
  WHERE id = p_token_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Token not found';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_session_tokens(
  p_pin TEXT,
  p_session_date DATE,
  p_shift_slot TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  IF NOT public._check_pin('ADMIN', p_pin) THEN
    RAISE EXCEPTION 'Unauthorized Admin PIN';
  END IF;

  DELETE FROM public.queue_tokens
  WHERE session_date = p_session_date
    AND (p_shift_slot IS NULL OR p_shift_slot = '' OR p_shift_slot = 'ALL' OR shift_slot = p_shift_slot);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_config(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_config(TEXT, INT, INT, INT, TIME, TIME, TIME, TIME, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_token(TEXT, UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_session_tokens(TEXT, DATE, TEXT) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
