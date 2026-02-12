/*
  # Aktualizace inicializační funkce pro automatické nastavení admin flagů

  1. Changes
    - Upravena funkce initialize_new_user_account()
    - Automaticky nastaví is_admin = true pro email matej.klima10@seznam.cz
    - Vytvoří user_profiles místo profiles
  
  2. Security
    - Admin flag je nastaven pouze při první inicializaci účtu
    - Běžní uživatelé mají is_admin = false
*/

-- Vytvořit veřejnou funkci pro inicializaci účtu s admin kontrolou
CREATE OR REPLACE FUNCTION initialize_new_user_account(
  p_username text DEFAULT NULL,
  p_full_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_is_admin boolean := false;
  v_profile_exists boolean;
  v_credits_exist boolean;
BEGIN
  -- Získat ID a email aktuálního uživatele
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Získat email uživatele
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Zkontrolovat, zda je uživatel admin
  IF v_user_email = 'matej.klima10@seznam.cz' THEN
    v_is_admin := true;
  END IF;

  -- Zkontrolovat, zda profil již existuje
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = v_user_id) INTO v_profile_exists;
  
  -- Zkontrolovat, zda kredity již existují
  SELECT EXISTS(SELECT 1 FROM user_credits WHERE user_id = v_user_id) INTO v_credits_exist;

  -- Pokud již vše existuje, vrátit success
  IF v_profile_exists AND v_credits_exist THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Account already initialized',
      'already_exists', true
    );
  END IF;

  -- Vytvořit profil pokud neexistuje
  IF NOT v_profile_exists THEN
    INSERT INTO user_profiles (id, username, token_balance, is_admin)
    VALUES (
      v_user_id,
      NULLIF(TRIM(COALESCE(p_username, '')), ''),
      0,
      v_is_admin
    )
    ON CONFLICT (id) DO UPDATE SET is_admin = v_is_admin;
  END IF;

  -- Vytvořit kredity pokud neexistují
  IF NOT v_credits_exist THEN
    INSERT INTO user_credits (user_id, balance, total_earned)
    VALUES (v_user_id, 50, 50)
    ON CONFLICT (user_id) DO NOTHING;

    -- Zalogovat uvítací bonus
    INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
    VALUES (v_user_id, 'bonus', 50, 50, 'Welcome bonus - 50 free credits');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account initialized successfully',
    'user_id', v_user_id,
    'is_admin', v_is_admin,
    'credits', 50
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Povolit authenticated uživatelům volat tuto funkci
GRANT EXECUTE ON FUNCTION initialize_new_user_account(text, text) TO authenticated;
