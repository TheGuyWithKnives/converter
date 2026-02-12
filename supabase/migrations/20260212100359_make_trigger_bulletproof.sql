/*
  # Bulletproof handle_new_user trigger

  ## Změny
  - Trigger NIKDY neselže, i když selžou jednotlivé INSERT operace
  - Přidán komplexní error handling
  - Funkce vrací NEW i při chybách
  - Všechny operace jsou optional (best-effort)
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_username text;
  v_full_name text;
BEGIN
  -- Extrahovat metadata bezpečně
  BEGIN
    v_username := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'username', '')), '');
    v_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  EXCEPTION WHEN OTHERS THEN
    v_username := NULL;
    v_full_name := NULL;
  END;

  -- Vytvořit profil (neblokující - pokud selže, pokračujeme)
  BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
      NEW.id,
      v_username,
      v_full_name,
      NULL
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorujeme chyby při vytváření profilu
    NULL;
  END;

  -- Vytvořit kredity účet (neblokující)
  BEGIN
    INSERT INTO public.user_credits (user_id, balance, total_earned)
    VALUES (NEW.id, 50, 50)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorujeme chyby při vytváření kreditů
    NULL;
  END;

  -- Zalogovat transakci (neblokující)
  BEGIN
    INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
    VALUES (NEW.id, 'bonus', 50, 50, 'Welcome bonus - 50 free credits');
  EXCEPTION WHEN OTHERS THEN
    -- Ignorujeme chyby při logování transakce
    NULL;
  END;

  -- VŽDY vrátit NEW, aby registrace proběhla
  RETURN NEW;
END;
$$;

-- Ujistit se, že trigger existuje
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
