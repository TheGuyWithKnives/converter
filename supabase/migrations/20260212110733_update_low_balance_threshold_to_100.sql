/*
  # Update Low Balance Notification Threshold to 100

  Changes the threshold for low balance notifications from 1000 credits to 100 credits.
  This provides earlier warning when Meshy.ai API credits are running low.

  Changes:
  - Updates `check_low_balance_and_notify()` function threshold from 1000 to 100 credits
*/

CREATE OR REPLACE FUNCTION check_low_balance_and_notify()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_bal integer;
  threshold_val integer := 100;
BEGIN
  current_bal := get_latest_meshy_balance();
  
  IF current_bal < threshold_val THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_notifications
      WHERE type = 'low_balance'
      AND is_read = false
      AND current_balance <= threshold_val
      AND created_at > now() - interval '1 hour'
    ) THEN
      INSERT INTO admin_notifications (type, message, threshold, current_balance)
      VALUES (
        'low_balance',
        'Meshy.ai balance is below ' || threshold_val || ' credits',
        threshold_val,
        current_bal
      );
    END IF;
  END IF;
END;
$$;
