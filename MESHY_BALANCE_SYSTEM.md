# Meshy Balance & Credits Management System

## Přehled systému

Tento systém umožňuje monitoring zůstatku Meshy.ai API kreditů a správu virtuálních kreditů uživatelů s automatickými notifikacemi při nízkém zůstatku.

## Jak systém funguje

### 1. Dvě úrovně kreditů

**Skutečné Meshy kredity**
- Kredity na vašem Meshy.ai účtu
- Spotřebovávají se při každém API volání
- Musí se dokupovat ručně přes Meshy.ai dashboard

**Virtuální kredity**
- Kredity, které uživatelé kupují ve vaší aplikaci
- Ukládají se v databázi (`user_profiles.credits`)
- Cena je vyšší než skutečné Meshy kredity = vaše marže

### 2. Automatické trackování balance

Po každém API volání k Meshy.ai se automaticky:
1. Provede se operace (text-to-3d, image-to-3d, atd.)
2. Zavolá se Edge Function `check-meshy-balance`
3. Načte se aktuální zůstatek z Meshy.ai
4. Uloží se do databáze (`meshy_balance_log`)
5. Zkontroluje se threshold a vytvoří se notifikace pokud je potřeba

### 3. Notifikační systém

**Automatické pop-up notifikace**
- Zobrazují se pouze adminům
- Objeví se když zůstatek klesne pod 100 kreditů
- Real-time aktualizace přes Supabase Realtime
- Tlačítko "Top Up Now" otevře Meshy.ai billing

**Dashboard notifikace**
- Zobrazují se v Admin Dashboardu
- Historie všech notifikací
- Možnost označit jako přečtené

## Databázové tabulky

### `meshy_balance_log`
```sql
- id (uuid)
- balance (integer) - Aktuální Meshy.ai zůstatek
- last_checked (timestamptz) - Kdy byl zůstatek zkontrolován
- created_at (timestamptz)
```

### `credit_pricing`
```sql
- id (uuid)
- meshy_cost (decimal) - Cena 1 Meshy kreditu (např. 0.0050 Kč)
- user_price (decimal) - Cena za 1 virtuální kredit pro uživatele (např. 0.0100 Kč)
- margin_percent (decimal) - Vaše marže v % (např. 50%)
- active (boolean) - Aktivní pricing
- created_at (timestamptz)
```

### `admin_notifications`
```sql
- id (uuid)
- type (text) - Typ notifikace ('low_balance')
- message (text) - Zpráva notifikace
- threshold (integer) - Threshold který spustil notifikaci
- current_balance (integer) - Zůstatek v době notifikace
- is_read (boolean) - Zda admin viděl notifikaci
- created_at (timestamptz)
```

## Komponenty

### Admin Dashboard (`AdminDashboard.tsx`)
Komplexní dashboard pro adminy s:
- **Aktuální Meshy.ai balance** - Zobrazení skutečného zůstatku
- **Celkové virtuální kredity** - Součet kreditů všech uživatelů
- **Profit kalkulace** - Výpočet marže a zisku
- **Balance historie** - Historie změn zůstatku
- **Pricing management** - Správa cenové struktury
- **Refresh button** - Manuální refresh balance

### Low Balance Notification (`LowBalanceNotification.tsx`)
Pop-up notifikace která:
- Zobrazuje se pouze adminům
- Sleduje real-time změny přes Supabase
- Automaticky se objeví při nízkém zůstatku
- Umožňuje přímý přechod na Meshy billing
- Lze odmítnout nebo označit jako přečtenou

### Admin Button (`AdminButton.tsx`)
Plovoucí tlačítko které:
- Zobrazuje se pouze adminům
- Otevírá Admin Dashboard
- Obsahuje LowBalanceNotification

## Edge Functions

### `check-meshy-balance`
```typescript
// URL: /functions/v1/check-meshy-balance
// Metoda: POST
// JWT: Ne (veřejná funkce)

// Funkce:
1. Zavolá Meshy.ai API pro získání balance
2. Uloží zůstatek do meshy_balance_log
3. Zavolá check_low_balance_and_notify() funkci
4. Vrátí aktuální balance
```

## Database Functions

### `get_latest_meshy_balance()`
Vrací poslední zaznamenaný zůstatek z `meshy_balance_log`.

### `check_low_balance_and_notify()`
Kontroluje zůstatek a vytváří notifikace:
- Threshold: 1000 kreditů
- Vytvoří notifikaci pokud balance < threshold
- Zabráňuje duplicitním notifikacím (1 hodina cooldown)

## Použití

### Přístup k Admin Dashboardu

1. Přihlaste se jako uživatel s `is_admin = true` v `user_profiles`
2. Klikněte na ikonu uživatele v pravém horním rohu (vedle balance)
3. V dropdown menu vyberte "Admin Dashboard" (viditelné pouze pro adminy)
4. Dashboard se otevře v overlay režimu

**Nové funkce:**
- **Editovatelné ceny**: Klikněte na ikonu tužky vedle "Credit Pricing" pro editaci
- **Manuální přidání balance**: Klikněte na + ikonu vedle Meshy.ai Balance
- **Lepší error handling**: Detailní chybové zprávy při refresh balance

### Nastavení admin práv

```sql
-- Nastavit uživatele jako admina
UPDATE user_profiles
SET is_admin = true
WHERE id = 'USER_ID';
```

### Live Balance z Meshy API

Admin Dashboard nyní zobrazuje **skutečný live balance** přímo z Meshy.ai API:

**Automatické aktualizace:**
- Balance se automaticky načte při otevření dashboardu
- Auto-refresh každých 60 sekund
- Viditelný spinner během načítání
- Zobrazení času poslední aktualizace

**Vizuální indikátory:**
- Modrý design pro normální stav (nad 100 kreditů)
- Červený design s warning ikonami pro nízký balance (pod 100 kreditů)
- Label "Live from Meshy API" pro jasnost
- Animace během refresh operace

**Výhody:**
- Vždy aktuální data z Meshy API
- Žádné cache problémy
- Okamžité upozornění na změny
- Přesné sledování spotřeby

### Manuální refresh balance

**Z Admin Dashboardu:**
- Klikněte na tlačítko "Refresh Balance" v pravém horním rohu dashboardu
- Zobrazí se spinner během načítání
- Po úspěchu se zobrazí toast notifikace s aktuálním zůstatkem
- Při chybě se zobrazí detailní chybová zpráva

**Programově:**
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/check-meshy-balance`,
  { method: 'POST' }
);
```

### Manuální přidání balance

Pro testování nebo manuální korekci můžete přidat balance přímo v dashboardu:

1. Otevřete Admin Dashboard
2. V kartě "Meshy.ai Balance" klikněte na + ikonu
3. Zadejte nový zůstatek
4. Klikněte "Add"
5. Zůstatek se přidá do historie s aktuálním časem

### Změna threshold pro notifikace

**Aktuální threshold: 100 kreditů** (změněno z původních 1000)

Notifikace se zobrazí automaticky, když balance klesne pod 100 kreditů.

Pro změnu threshold vytvořte novou migraci:

```sql
CREATE OR REPLACE FUNCTION check_low_balance_and_notify()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_bal integer;
  threshold_val integer := 50; -- Změnit na požadovanou hodnotu
BEGIN
  current_bal := get_latest_meshy_balance();

  IF current_bal < threshold_val THEN
    -- Vytvoří notifikaci pokud ještě neexistuje
  END IF;
END;
$$;
```

## Pricing & Marže

### Výchozí nastavení
```
Meshy kredit: 0.0050 Kč
Uživatelský kredit: 0.0100 Kč
Marže: 50%
```

### Jak změnit pricing

**Nový způsob (doporučeno):**
1. Otevřete Admin Dashboard
2. V sekci "Credit Pricing" klikněte na ikonu tužky (Edit)
3. Upravte hodnoty:
   - **Meshy Cost**: Skutečná cena za 1 Meshy kredit
   - **User Price**: Cena za 1 virtuální kredit pro uživatele
   - **Margin %**: Vaše marže v procentech
4. Klikněte na ikonu fajfky (Save) pro uložení
5. Staré pricing se automaticky deaktivuje a vytvoří se nový

**Starý způsob (SQL):**
```sql
-- Deaktivovat staré pricing
UPDATE credit_pricing SET active = false WHERE active = true;

-- Vytvořit nové pricing
INSERT INTO credit_pricing (meshy_cost, user_price, margin_percent, active)
VALUES (0.0060, 0.0120, 50.00, true);
```

## Příklad workflow

1. **Uživatel si koupí 1000 virtuálních kreditů**
   - Zaplatí: 1000 × 0.0100 Kč = 10 Kč
   - Přidá se do `user_profiles.credits`

2. **Uživatel vygeneruje 3D model**
   - Odečte se virtuální kredit z jeho účtu
   - API volání spotřebuje váš skutečný Meshy kredit
   - Skutečné náklady: např. 1 × 0.0050 Kč = 0.005 Kč
   - Váš profit: 0.0100 - 0.0050 = 0.005 Kč (50%)

3. **Automatické trackování**
   - Po API volání se automaticky refreshne balance
   - Zaznamená se do `meshy_balance_log`

4. **Nízký zůstatek**
   - Balance klesne pod 1000 kreditů
   - Vytvoří se notifikace v `admin_notifications`
   - Admin vidí pop-up notifikaci
   - Admin přejde na Meshy.ai a dokoupí kredity

## Monitoring & Maintenance

### Co sledovat

1. **Meshy.ai balance**
   - Pravidelně kontrolujte Admin Dashboard
   - Reagujte na low balance notifikace
   - Dokupujte kredity PŘED vypršením

2. **Virtuální vs. skutečné kredity**
   - Ujistěte se, že máte dost skutečných kreditů
   - Poměr by měl být: skutečné ≥ virtuální

3. **Profit margins**
   - Sledujte "Est. Profit" v dashboardu
   - Upravte ceny podle potřeby

### Doporučené akce

**Týdně:**
- Zkontrolovat Admin Dashboard
- Překontrolovat balance history

**Měsíčně:**
- Analyzovat profit margins
- Upravit pricing pokud je potřeba
- Vyčistit staré notifikace

**Při low balance alert:**
- OKAMŽITĚ dokoupit kredity na Meshy.ai
- Ujistit se, že balance je nad threshold

## Troubleshooting

### Notifikace se nezobrazují

1. Zkontrolujte `is_admin` flag v `user_profiles`
2. Zkontrolujte browser console pro chyby
3. Ověřte že Supabase Realtime funguje

### Balance se neaktualizuje

1. Zkontrolujte že Edge Function `check-meshy-balance` běží
2. Ověřte MESHY_API_KEY v environment variables
3. Zkontrolujte logs v Supabase Dashboard

### Pop-up se zobrazuje opakovaně

1. Klikněte na "Dismiss" nebo checkmark ikonu
2. Notifikace se označí jako `is_read = true`
3. Nová notifikace se vytvoří až po 1 hodině cooldown

## Bezpečnost

### RLS Policies

Všechny tabulky mají Row Level Security:
- Pouze adminové mohou číst balance logs
- Pouze adminové moją číst/upravovat pricing
- Pouze adminové mohou číst notifikace
- Service role může vkládat data (pro automatické trackování)

### Edge Function Security

- `check-meshy-balance`: Veřejná, ale read-only pro balance
- Používá Service Role Key pro zápis do DB
- MESHY_API_KEY není exponován na frontend

## Další rozšíření

### Možnosti pro budoucnost

1. **Automatický nákup kreditů** (NENÍ MOŽNÉ s Meshy.ai API)
2. **Email notifikace** pro nízký zůstatek
3. **SMS notifikace** pro kritický stav
4. **Predikce spotřeby** na základě historie
5. **Automatické úpravy pricing** podle poptávky
6. **Multi-tier pricing** (různé ceny pro různé plány)

## Kontakty & Podpora

Pro otázky nebo problémy:
- Zkontrolujte Supabase Dashboard logs
- Prohlédněte si Admin Dashboard pro diagnostiku
- Kontaktujte Meshy.ai support pro API problémy
