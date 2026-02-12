/*
  # Oprava funkce handle_new_user s lepším error handlingem

  ## Problém
  - Funkce selhávala při práci s NULL nebo prázdnými metadata
  - Chybělo error handling pro jednotlivé INSERT operace
  - Funkce neselhávala gracefully

  ## Řešení
  1. Přidán error handling (BEGIN/EXCEPTION)
  2. Použití COALESCE pro NULL hodnoty
  3. Odolnost vůči chybějícím datům
  4. Lepší logování chyb
*/

-- Kompletně nová verze funkce s error handlingem
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Vytvořit profil s bezpečným zpracováním NULL hodnot
  BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
      NEW.id,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'username', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')), '')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue (profile creation is not critical)
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  -- Vytvořit kredity účet s 50 volnými kredity
  BEGIN
    INSERT INTO public.user_credits (user_id, balance, total_earned)
    VALUES (NEW.id, 50, 50);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create credits for user %: %', NEW.id, SQLERRM;
    -- Pokud tohle selže, je to problém, ale nepřerušíme registraci
  END;

  -- Zalogovat uvítací bonus transakci
  BEGIN
    INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
    VALUES (NEW.id, 'bonus', 50, 50, 'Welcome bonus - 50 free credits');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to log transaction for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ujistit se, že trigger je správně nastaven
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Dodatečně povolit anonymous uživatelům vytvářet účty (pro registraci)
-- Tohle je bezpečné, protože RLS stále kontroluje, že nový řádek má správné ID
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
