# Quick Start: Authentication & Credits System

## 🚀 Getting Started

The GENZEO platform now includes a complete user management and credits system. Here's how to use it:

---

## For End Users

### 1. Creating an Account

1. Click **"Přihlásit se"** (Login) button in the top-right corner
2. Click **"Zaregistrujte se"** (Register)
3. Fill in your details:
   - **Email** (required)
   - **Password** (required - must be strong)
   - **Username** (optional)
   - **Full Name** (optional)
4. Click **"Zaregistrovat se"**
5. **You'll receive 50 free credits!** 🎁

### 2. Password Requirements

Your password must have:
- ✅ At least 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)

A strength indicator will show you how secure your password is.

### 3. Logging In

1. Click **"Přihlásit se"** (Login) button
2. Enter your email and password
3. Click **"Přihlásit se"**

### 4. Using Credits

**Your credit balance is displayed in the top-right corner.**

Credit costs for operations:
- **Text to 3D (Meshy 6):** 20 credits
- **Text to 3D (Other):** 10 credits
- **Texture Generation:** 10 credits
- **Image to 3D (Meshy 6, no texture):** 20 credits
- **Image to 3D (Meshy 6, with texture):** 30 credits
- **Image to 3D (Other, no texture):** 5 credits
- **Image to 3D (Other, with texture):** 15 credits
- **Multi-image to 3D (no texture):** 5 credits
- **Multi-image to 3D (with texture):** 15 credits
- **Retexture:** 10 credits
- **Remesh:** 5 credits
- **Auto-Rigging:** 5 credits
- **Animation:** 3 credits

### 5. Purchasing Credits

When you run low on credits:

1. Click on your **credit balance** in the top-right
2. Or click the **user icon** → **"Nakoupit kredity"**
3. Choose a credit pack:
   - **Starter:** 100 credits for $9.99
   - **Basic:** 250 + 25 bonus for $19.99
   - **Popular:** 500 + 100 bonus for $34.99 ⭐
   - **Pro:** 1000 + 250 bonus for $59.99
   - **Premium:** 2500 + 750 bonus for $129.99
4. Select payment method (Card or PayPal)
5. Click **"Dokončit nákup"** (Complete Purchase)

**Note:** This is a demo implementation. In production, real payment processing would be integrated.

### 6. Transaction History

To view your credit usage:

1. Click the **user icon** in top-right
2. Select **"Historie transakcí"** (Transaction History)
3. Filter by:
   - **Vše** (All)
   - **Nákupy** (Purchases)
   - **Použití** (Usage)

Each transaction shows:
- Description
- Date and time
- Credits added/deducted
- Balance after transaction

### 7. Password Reset

Forgot your password?

1. Click **"Přihlásit se"** (Login)
2. Click **"Zapomněli jste heslo?"** (Forgot password?)
3. Enter your email
4. Click **"Odeslat odkaz"** (Send link)
5. Check your email for reset instructions

---

## For Developers

### Database Setup

The database migration has been applied automatically. It created:
- `profiles` table for user information
- `user_credits` table for credit balances
- `credit_transactions` table for transaction history
- `pricing_tiers` table for credit packages
- `purchase_history` table for purchase records

### Environment Variables

Ensure your `.env` file has Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Key Components

**Authentication:**
- `AuthContext` - Authentication state management
- `LoginModal` - User login interface
- `RegisterModal` - User registration interface
- `PasswordResetModal` - Password reset interface
- `AuthManager` - Coordinates auth flows

**Credits:**
- `useCredits` hook - Access credit balance and transactions
- `PurchaseCreditsModal` - Credit purchase interface
- `TransactionHistory` - Transaction log viewer
- `BalanceDisplay` - Shows balance and user menu

**Services:**
- `creditsService.ts` - Credit operations
- `creditsWrapper.ts` - Credit check and deduction wrapper

### Integration Example

```typescript
import { useAuth } from './contexts/AuthContext';
import { useCredits } from './hooks/useCredits';
import { checkAndDeductCredits } from './services/creditsWrapper';

function MyComponent() {
  const { user } = useAuth();
  const { balance, refreshCredits } = useCredits();

  const handleOperation = async () => {
    // Check authentication
    if (!user) {
      toast.error('Please login');
      return;
    }

    // Check and deduct credits
    const result = await checkAndDeductCredits(
      'IMAGE_TO_3D_MESHY6_WITH_TEXTURE',
      'Generated model',
      { /* metadata */ }
    );

    if (!result.allowed) {
      toast.error(result.message);
      return;
    }

    // Proceed with operation
    await performOperation();

    // Refresh balance
    refreshCredits();
  };

  return (
    <div>
      <p>Balance: {balance} credits</p>
      <button onClick={handleOperation}>Generate</button>
    </div>
  );
}
```

### Testing Accounts

For testing, create a new account through the UI:
1. Register with any email (e.g., `test@example.com`)
2. You'll automatically receive 50 credits
3. Purchase more credits using the demo payment system

---

## Architecture Overview

### Authentication Flow

```
User Registration
  ↓
Supabase Auth creates user
  ↓
Database trigger fires
  ↓
Creates profile record
  ↓
Creates credits account (50 credits)
  ↓
Logs welcome bonus transaction
  ↓
User can login
```

### Credit Usage Flow

```
User initiates operation
  ↓
Check if user is authenticated
  ↓
Check if user has sufficient credits
  ↓
Deduct credits atomically
  ↓
Log transaction
  ↓
Perform operation
  ↓
Update balance display (real-time)
```

### Credit Purchase Flow

```
User clicks "Buy Credits"
  ↓
Select pricing tier
  ↓
Choose payment method
  ↓
Process payment (demo)
  ↓
Add credits to account
  ↓
Log transaction
  ↓
Update balance display
```

---

## Security Features

✅ **Password Strength Validation** - Enforces strong passwords
✅ **Row Level Security (RLS)** - Users can only access their own data
✅ **Atomic Transactions** - Credit operations are atomic and locked
✅ **Audit Trail** - All transactions logged
✅ **Balance Validation** - Prevents negative balances
✅ **Secure Sessions** - Token-based authentication

---

## FAQ

**Q: What happens if I run out of credits during generation?**
A: You can't start a generation without sufficient credits. The system checks before starting.

**Q: Can I get a refund if generation fails?**
A: In this demo, credits are deducted upfront. In production, you'd implement refund logic for failed operations.

**Q: Are credits shared between accounts?**
A: No, each user has their own credit balance.

**Q: How do I see my usage history?**
A: Click the user icon → "Historie transakcí"

**Q: Can I change my password?**
A: Yes, use the "Forgot Password" flow to reset it.

**Q: What happens if I delete my account?**
A: All your data (profile, credits, transactions) will be deleted due to CASCADE constraints.

**Q: Can I transfer credits to another user?**
A: Not in the current implementation. This would require additional features.

---

## Troubleshooting

**Issue: Can't login after registration**
- Solution: Check your email/password are correct
- Check browser console for errors

**Issue: Balance shows 0 after registration**
- Solution: Refresh the page
- Check database trigger is enabled
- Verify welcome bonus transaction was created

**Issue: Credits not deducted after operation**
- Solution: Check browser console for errors
- Verify you have sufficient credits
- Check RLS policies in Supabase dashboard

**Issue: Real-time updates not working**
- Solution: Verify Supabase Realtime is enabled
- Check browser has active WebSocket connection
- Try manually refreshing (click balance)

---

## Next Steps

For production deployment:

1. **Integrate Real Payments:**
   - Add Stripe or PayPal SDK
   - Implement webhook handlers
   - Add payment confirmation

2. **Email Notifications:**
   - Welcome email on registration
   - Payment receipts
   - Low balance warnings

3. **Admin Panel:**
   - User management
   - Credit adjustments
   - Analytics dashboard

4. **Enhanced Security:**
   - Rate limiting
   - IP blocking for abuse
   - Fraud detection

5. **Mobile App:**
   - Native iOS/Android apps
   - Push notifications
   - Mobile-optimized UI

---

## Support

Need help?
- 📖 Read `USER_MANAGEMENT_SYSTEM_DOCS.md` for complete documentation
- 📝 Check `INTEGRATION_EXAMPLE.md` for code examples
- 🐛 Report issues with detailed error messages
- 💡 Check browser console for debugging info

---

**Happy Creating with GENZEO! 🎨✨**
