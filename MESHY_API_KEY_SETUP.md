# Nastavení MESHY_API_KEY

Pokud dostáváte chybu "Failed to refresh: Missing MESHY_API_KEY" při načítání Admin Dashboardu, musíte nastavit MESHY_API_KEY jako secret v Supabase.

## Postup

1. Přihlaste se na [Meshy.ai Dashboard](https://app.meshy.ai)
2. Přejděte do [API Keys](https://app.meshy.ai/settings/api-keys)
3. Vytvořte nový API key nebo zkopírujte existující
4. Přihlaste se na [Supabase Dashboard](https://supabase.com/dashboard)
5. Otevřete váš projekt
6. V levém menu klikněte na **Edge Functions**
7. V horní části najděte tlačítko **Manage secrets**
8. Přidejte nový secret:
   - Name: `MESHY_API_KEY`
   - Value: [váš Meshy.ai API key]
9. Klikněte **Save**

## Ověření

Po nastavení:
1. Otevřete Admin Dashboard
2. Balance se automaticky načte z Meshy API
3. Pokud chyba přetrvává, zkontrolujte:
   - Že API key je validní (zkuste ho v Meshy.ai dashboardu)
   - Že název secretu je přesně `MESHY_API_KEY` (case-sensitive)
   - Že máte dostatečný balance na Meshy.ai účtu

## Poznámky

- Secret se automaticky aplikuje na všechny edge functions
- Není potřeba restartovat edge functions
- Secret není viditelný v kódu ani v .env souborech
- Edge funkce `check-meshy-balance` používá tento API key k načtení balance
