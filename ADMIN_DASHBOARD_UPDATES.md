# Admin Dashboard - Aktualizace

## Přehled změn

Byly provedeny následující vylepšení Admin Dashboardu:

### 1. Přesunutí přístupu k dashboardu

**Předtím:**
- Plovoucí tlačítko "Admin" v pravém horním rohu obrazovky
- Vždy viditelné pro adminy

**Nyní:**
- Přístup přes dropdown menu u ikony uživatele
- Integrováno s ostatními funkcemi účtu (Historie transakcí, Nakoupit kredity, Odhlásit se)
- Čistší UI bez překrývajících se prvků

**Jak používat:**
1. Klikněte na ikonu uživatele v pravém horním rohu (vedle balance)
2. V dropdown menu vyberte "Admin Dashboard"
3. Dashboard se otevře v overlay režimu
4. Pro zavření klikněte na "Zavřít" v pravém horním rohu

---

### 2. Interaktivní editace dat

#### Editace pricing (ceny kreditů)

**Předtím:**
- Pouze zobrazení aktuálních cen
- Změna možná pouze přes SQL příkazy v databázi

**Nyní:**
- Vizuální editor přímo v dashboardu
- Klikněte na ikonu tužky (✏️) vedle "Credit Pricing"
- Upravte následující pole:
  - **Meshy Cost** - Skutečná cena za 1 Meshy kredit (např. 0.0050 Kč)
  - **User Price** - Cena za 1 virtuální kredit pro uživatele (např. 0.0100 Kč)
  - **Margin %** - Vaše marže v procentech (např. 50%)
- Profit se přepočítává v reálném čase
- Klikněte na ikonu fajfky (✓) pro uložení
- Staré pricing se automaticky deaktivuje

**Výhody:**
- Žádné SQL příkazy
- Okamžitý vizuální feedback
- Automatická kalkulace profitu
- Bezpečné ukládání s validací

#### Manuální přidání balance

**Nová funkce:**
- Klikněte na ikonu plus (+) vedle Meshy.ai Balance
- Zadejte nový zůstatek
- Klikněte "Add"
- Zůstatek se přidá do historie s aktuálním časem

**Použití:**
- Testování systému
- Manuální korekce při nesrovnalostech
- Inicializace dat

---

### 3. Vylepšené chybové hlášení

**Předtím:**
- Obecné chybové zprávy
- Těžko dohledatelné příčiny problémů

**Nyní:**
- Detailní error handling při refresh balance
- Konkrétní chybové zprávy z API
- Toast notifikace s popisem chyby
- Lepší debugování v konzoli

**Příklady chybových zpráv:**
- "Failed to refresh: Missing MESHY_API_KEY"
- "Failed to refresh: Meshy API error: Invalid API key"
- "Failed to refresh balance" (obecná chyba s technickými detaily v konzoli)

**Toast notifikace:**
- ✅ Úspěch: "Balance refreshed: 5000 credits"
- ❌ Chyba: "Failed to refresh: [konkrétní důvod]"
- ✅ Úspěch při editaci: "Pricing updated successfully"
- ❌ Chyba při editaci: "Failed to update pricing"

---

## Technické změny

### Komponenty

**Odstraněno:**
- `src/components/AdminButton.tsx` - Již není potřeba

**Upraveno:**
- `src/components/BalanceDisplay.tsx` - Přidán admin dashboard a notifikace
- `src/components/admin/AdminDashboard.tsx` - Kompletně přepsán s editací
- `src/App.tsx` - Odstraněn import AdminButton

### Nové funkce v AdminDashboard

```typescript
// Editace pricing
const [editingPricing, setEditingPricing] = useState(false);
const [editedPricing, setEditedPricing] = useState({...});
const savePricing = async () => {...}

// Manuální přidání balance
const [showAddBalance, setShowAddBalance] = useState(false);
const [newBalance, setNewBalance] = useState('');
const addBalanceManually = async () => {...}

// Vylepšený refresh balance s error handling
const refreshBalance = async () => {
  try {
    // Detailní error handling
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to refresh balance');
    }
    // ...
  } catch (error) {
    toast.error(`Failed to refresh: ${(error as Error).message}`);
  }
}
```

---

## Co zůstalo stejné

- **Edge Function** `check-meshy-balance` - Beze změny
- **Databázová struktura** - Beze změny
- **Low Balance Notification** - Stále funguje
- **RLS policies** - Beze změny
- **Automatické trackování balance** - Stále aktivní po každém API volání

---

## Migration guide

### Pro vývojáře

1. Spusťte `npm run build` pro rebuild projektu
2. Zkontrolujte, že komponenta `AdminButton` již není importována
3. Testujte admin dashboard přes dropdown menu
4. Ověřte funkčnost editace pricing
5. Otestujte manuální přidání balance

### Pro adminy

1. Přihlaste se do aplikace
2. Najděte ikonu uživatele v pravém horním rohu
3. Klikněte a vyberte "Admin Dashboard"
4. Vyzkoušejte nové funkce:
   - Editace pricing
   - Manuální přidání balance
   - Refresh balance s lepšími chybovými zprávami

---

## Časté otázky

**Q: Kde je tlačítko "Admin"?**
A: Bylo přesunuto do dropdown menu u ikony uživatele (vedle balance displaye).

**Q: Jak změním ceny kreditů?**
A: V Admin Dashboardu klikněte na ikonu tužky vedle "Credit Pricing" a upravte hodnoty.

**Q: Co když udělám chybu při editaci pricing?**
A: Klikněte na X ikonu pro zrušení změn. Nebo jednoduše upravte hodnoty znovu a uložte.

**Q: Můžu přidat balance ručně?**
A: Ano, klikněte na + ikonu vedle Meshy.ai Balance v dashboardu.

**Q: Proč mi refresh balance vrací chybu?**
A: Zkontrolujte:
  - Máte platný MESHY_API_KEY v environment variables?
  - Je Edge Function `check-meshy-balance` spuštěna?
  - Máte aktivní připojení k internetu?
  - Podívejte se do browser console pro detaily

**Q: Jak se vrátím na původní zobrazení?**
A: Klikněte na "Zavřít" v pravém horním rohu dashboardu nebo klikněte mimo overlay.

---

## Budoucí vylepšení (návrhy)

- [ ] Editace threshold pro low balance notifikace v UI
- [ ] Historie změn pricing
- [ ] Graf balance v čase
- [ ] Export dat do CSV/Excel
- [ ] Email notifikace při nízkém zůstatku
- [ ] Bulk operace pro uživatele
- [ ] Predikce spotřeby kreditů
- [ ] API rate limiting dashboard

---

## Kontakt

Pro otázky nebo problémy:
- Zkontrolujte Supabase Dashboard logs
- Prohlédněte si Admin Dashboard diagnostiku
- Kontaktujte Meshy.ai support pro API problémy
