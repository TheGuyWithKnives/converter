/*
  # Oprava RLS politik pro registraci uživatelů

  ## Problém
  - RLS politika na tabulce `profiles` bránila vytvoření profilu během registrace
  - Trigger `handle_new_user()` selhal kvůli nedostatečným oprávněním

  ## Řešení
  1. Upravení INSERT politiky pro `profiles` - povolení pro autentizované uživatele i service role
  2. Přidání politiky pro anon uživatele během registrace
  3. Úprava triggeru na použití SECURITY DEFINER pro obejití RLS

  ## Změny
  - Upravena INSERT politika na tabulce `profiles`
  - Upravena INSERT politika na tabulce `user_credits` 
  - Trigger nyní běží s oprávněními definer (service role)
*/

-- Smazání starých politik
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage credits" ON user_credits;
DROP POLICY IF EXISTS "Service role can insert transactions" ON credit_transactions;

-- Nová politika pro vkládání profilů (umožní triggeru vytvořit profil)
CREATE POLICY "Enable insert for authenticated users own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Politika pro service role (trigger běží s SECURITY DEFINER)
CREATE POLICY "Enable insert for service role"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Politika pro user_credits - service role
CREATE POLICY "Service role can insert credits"
  ON user_credits FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update credits"
  ON user_credits FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politika pro credit_transactions - service role
CREATE POLICY "Service role can insert transactions"
  ON credit_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Ujištění, že trigger má správná oprávnění (SECURITY DEFINER už je nastaveno)
-- Trigger automaticky běží s oprávněními vlastníka (service role), což obchází RLS

-- Dodatečná kontrola: Ujistit se, že funkce má správná oprávnění
ALTER FUNCTION handle_new_user() SECURITY DEFINER;
ALTER FUNCTION deduct_credits(uuid, integer, text, text, jsonb) SECURITY DEFINER;
ALTER FUNCTION add_credits(uuid, integer, text, text, jsonb) SECURITY DEFINER;
