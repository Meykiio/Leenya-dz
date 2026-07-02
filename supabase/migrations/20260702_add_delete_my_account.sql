-- delete_my_account: authenticated users can delete their own account + all data
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_biz_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Superadmin accounts cannot be deleted';
  END IF;

  FOR v_biz_id IN SELECT id FROM businesses WHERE owner_id = v_user_id LOOP
    DELETE FROM reviews WHERE business_id = v_biz_id;
    DELETE FROM feedback WHERE business_id = v_biz_id;
    DELETE FROM queue_tickets WHERE business_id = v_biz_id;
    DELETE FROM bookings WHERE business_id = v_biz_id;
    DELETE FROM queue_counters WHERE business_id = v_biz_id;
  END LOOP;

  DELETE FROM businesses WHERE owner_id = v_user_id;
  DELETE FROM reviews WHERE client_id = v_user_id;
  DELETE FROM queue_tickets WHERE client_id = v_user_id;
  DELETE FROM bookings WHERE client_id = v_user_id;

  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
