/*
  # Security Fixes
  
  1. Fix: Add explicit search_path to security definer functions
     - Prevents potential search path hijacking vulnerabilities
     - Targets: cleanup_old_rate_limits(), cleanup_expired_cache()
     
  2. Fix: Restrict 'rate_limits' RLS policy
     - The previous policy was missing "TO service_role"
     - This unintentionally allowed public access to the table
     - New policy explicitly restricts access to service_role only
*/

-- 1. Fix Function Search Paths
ALTER FUNCTION cleanup_old_rate_limits() SET search_path = 'public';
ALTER FUNCTION cleanup_expired_cache() SET search_path = 'public';

-- 2. Fix RLS Policy for rate_limits
-- First drop the insecure policy
DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limits;

-- Recreate it strictly for the service_role
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);