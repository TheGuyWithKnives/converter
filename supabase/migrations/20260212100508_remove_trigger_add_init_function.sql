/*
  # Odstranění problematického triggeru a vytvoření manuální inicializační funkce

  ## Změny
  1. Odstraněn automatický trigger on_auth_user_created
  2. Vytvořena veřejná funkce initialize_new_user_account()
  3. Funkce se volá z frontendu po úspěšné registraci
  4. Bezpečnější a lépe ovladatelné

  ## Důvod
  - Automatický trigger způsoboval "Database error saving new user"
  - Manuální volání dává lepší kontrolu nad chybami
  - Uživatel se úspěšně zaregistruje i když profil selže
*/

-- Odstranit trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Vytvořit veřejnou funkci pro inicializaci účtu
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
  v_profile_exists boolean;
  v_credits_exist boolean;
BEGIN
  -- Získat ID aktuálního uživatele
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Zkontrolovat, zda profil již existuje
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_user_id) INTO v_profile_exists;
  
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
    INSERT INTO profiles (id, username, full_name)
    VALUES (
      v_user_id,
      NULLIF(TRIM(COALESCE(p_username, '')), ''),
      NULLIF(TRIM(COALESCE(p_full_name, '')), '')
    )
    ON CONFLICT (id) DO NOTHING;
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
