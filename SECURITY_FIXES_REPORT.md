# Security Fixes Report

Datum: 2026-02-12

## Přehled oprav

Byly opraveny všechny kritické a důležité bezpečnostní a výkonnostní problémy hlášené Supabase.

## 1. Chybějící Index na Foreign Key

**Problém:** Tabulka `purchase_history` měla foreign key bez indexu, což způsobovalo pomalé dotazy.

**Oprava:**
```sql
CREATE INDEX idx_purchase_history_tier_id ON purchase_history(tier_id);
```

**Dopad:** Výrazně rychlejší queries na purchase_history při JOIN operacích.

---

## 2. RLS Performance Optimalizace

**Problém:** 16 RLS policies používalo `auth.uid()` přímo, což způsobovalo re-evaluaci pro každý řádek. Při velkém množství dat to výrazně zpomaluje dotazy.

**Oprava:** Všechny policies byly upraveny na pattern `(select auth.uid())`, který se vyhodnotí pouze jednou pro celý dotaz.

**Opravené tabulky:**
- `credit_transactions` - 1 policy
- `user_profiles` - 3 policies
- `token_transactions` - 2 policies
- `profiles` - 3 policies
- `user_credits` - 1 policy
- `purchase_history` - 1 policy
- `meshy_balance_log` - 1 policy
- `credit_pricing` - 2 policies
- `admin_notifications` - 2 policies

**Příklad změny:**
```sql
-- PŘED (pomalé)
USING (user_id = auth.uid())

-- PO (rychlé)
USING (user_id = (select auth.uid()))
```

**Dopad:** Až 10x rychlejší queries při velkém množství řádků.

---

## 3. Duplicitní Permissive Policies

**Problém:** Tabulka `credit_pricing` měla dva SELECT policies pro stejnou roli, což je neefektivní.

**Oprava:** Policies byly konsolidovány:
- `Only admins can view pricing` - pouze SELECT
- `Only admins can manage pricing` - INSERT, UPDATE, DELETE (ALL bez SELECT)

**Dopad:** Čistší a rychlejší policy evaluation.

---

## 4. Function Search Path Security

**Problém:** 10 funkcí mělo mutable search_path, což je bezpečnostní riziko (možnost SQL injection přes search_path manipulation).

**Oprava:** Všechny funkce mají nyní `SET search_path = public, pg_temp`.

**Opravené funkce:**
- `cleanup_old_rate_limits()`
- `cleanup_expired_cache()`
- `update_updated_at_column()`
- `create_user_profile()`
- `deduct_tokens()`
- `add_tokens()`
- `deduct_credits()`
- `add_credits()`
- `get_latest_meshy_balance()`
- `check_low_balance_and_notify()`

**Dopad:** Eliminace bezpečnostního rizika search_path injection.

---

## 5. RLS Policies "Always True"

**Problém:** 3 policies měly `WITH CHECK (true)` pro authenticated roli, což efektivně vypíná RLS.

**Oprava:** Policies byly změněny na `service_role` only:

```sql
-- admin_notifications
CREATE POLICY "Service role can create notifications"
  ON admin_notifications FOR INSERT
  TO service_role  -- pouze service_role, ne authenticated
  WITH CHECK (true);

-- meshy_balance_log
CREATE POLICY "Service role can insert balance logs"
  ON meshy_balance_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- rate_limits
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Dopad:** Tyto tabulky jsou nyní správně chráněné - běžní authenticated uživatelé k nim nemají přístup, pouze service_role (edge functions).

---

## Neřešené Issues

### Unused Indexes
**Status:** IGNOROVÁNO

Supabase hlásí 13 nepoužitých indexů. Tyto indexy jsou:
- Připravené pro budoucí růst aplikace
- Některé jsou použity, ale zatím ne často (cache, rate limiting)
- Ponechány pro optimalizaci queries při růstu dat

**Akce:** Monitorovat usage, případně odebrat po 6 měsících pokud zůstanou nepoužité.

### Auth DB Connection Strategy
**Status:** VYŽADUJE KONFIGURACI

Toto je konfigurace na úrovni Supabase projektu, ne SQL.

**Akce:** V Supabase Dashboard → Settings → Database → změnit connection pool strategy z fixed na percentage-based.

### Leaked Password Protection
**Status:** VYŽADUJE KONFIGURACI

Toto je konfigurace Auth nastavení.

**Akce:** V Supabase Dashboard → Authentication → Policies → zapnout "Block leaked passwords".

---

## Souhrn

### ✅ Opraveno SQL migracemi:
- Chybějící index na foreign key
- 16 RLS policies optimalizováno
- Duplicitní policies vyřešeny
- 10 funkcí zabezpečeno search_path
- 3 "always true" policies opraveny

### ⚠️ Vyžaduje manuální konfiguraci:
- Auth DB connection strategy (Supabase Dashboard)
- Leaked password protection (Supabase Dashboard)

### ℹ️ Monitorovat:
- 13 unused indexes (zkontrolovat za 6 měsíců)

## Testování

Po aplikaci migrace byly provedeny následující testy:
- ✅ Build projektu úspěšný
- ✅ RLS policies fungují správně
- ✅ Edge functions fungují (service_role přístup zachován)
- ✅ Admin dashboard funkční

## Doporučení

1. **Okamžitě:** Žádné další akce - všechny kritické SQL issues jsou opraveny
2. **Tento týden:** Nastavit Auth DB connection strategy a leaked password protection v Supabase Dashboard
3. **Za 6 měsíců:** Zkontrolovat usage unused indexes a případně je odebrat pokud zůstávají nepoužité
