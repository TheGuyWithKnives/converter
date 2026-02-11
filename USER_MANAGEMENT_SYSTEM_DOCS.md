# User Management and Credits System Documentation

## Overview

Complete user authentication and token (credits) management system for the GENZEO platform. This system handles user registration, login, password management, credit tracking, purchasing, and transaction logging.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Authentication System](#authentication-system)
4. [Credits System](#credits-system)
5. [Integration Guide](#integration-guide)
6. [API Reference](#api-reference)
7. [Security Considerations](#security-considerations)
8. [Testing](#testing)

---

## Architecture

### Technology Stack

- **Frontend:** React, TypeScript
- **Authentication:** Supabase Auth
- **Database:** PostgreSQL (Supabase)
- **Real-time:** Supabase Realtime subscriptions

### Core Components

```
src/
├── contexts/
│   └── AuthContext.tsx              # Authentication context provider
├── hooks/
│   └── useCredits.ts                # Credits management hook
├── services/
│   ├── supabaseClient.ts            # Supabase initialization
│   ├── creditsService.ts            # Credit operations
│   └── creditsWrapper.ts            # Credit deduction wrapper
├── components/
│   ├── auth/
│   │   ├── LoginModal.tsx           # Login interface
│   │   ├── RegisterModal.tsx        # Registration interface
│   │   ├── PasswordResetModal.tsx   # Password reset interface
│   │   └── AuthManager.tsx          # Auth flow coordinator
│   ├── credits/
│   │   ├── PurchaseCreditsModal.tsx # Credit purchase interface
│   │   └── TransactionHistory.tsx   # Transaction log viewer
│   └── BalanceDisplay.tsx           # User menu & balance display
```

---

## Database Schema

### Tables

#### `profiles`
Extends `auth.users` with additional user information.

```sql
id              uuid PRIMARY KEY (references auth.users)
username        text UNIQUE
full_name       text
avatar_url      text
created_at      timestamptz
updated_at      timestamptz
```

#### `user_credits`
Tracks user credit balances and statistics.

```sql
id              uuid PRIMARY KEY
user_id         uuid UNIQUE (references auth.users)
balance         integer (current credit balance)
total_purchased integer (lifetime purchased credits)
total_earned    integer (lifetime earned credits)
total_spent     integer (lifetime spent credits)
created_at      timestamptz
updated_at      timestamptz
```

#### `credit_transactions`
Complete transaction log for audit and history.

```sql
id              uuid PRIMARY KEY
user_id         uuid (references auth.users)
type            text ('purchase', 'usage', 'refund', 'bonus')
amount          integer (positive for add, negative for deduct)
balance_after   integer (balance after transaction)
description     text (human-readable description)
operation_type  text (e.g., 'IMAGE_TO_3D_MESHY6_WITH_TEXTURE')
metadata        jsonb (additional data)
created_at      timestamptz
```

#### `pricing_tiers`
Available credit packages for purchase.

```sql
id              uuid PRIMARY KEY
name            text (e.g., 'Starter', 'Pro')
credits         integer (base credit amount)
price_usd       numeric (price in USD)
bonus_credits   integer (additional bonus credits)
popular         boolean (highlight this tier)
sort_order      integer (display order)
active          boolean (available for purchase)
created_at      timestamptz
```

#### `purchase_history`
Record of all credit purchases.

```sql
id                  uuid PRIMARY KEY
user_id             uuid (references auth.users)
tier_id             uuid (references pricing_tiers)
credits_purchased   integer
amount_paid         numeric
payment_method      text
payment_status      text ('pending', 'completed', 'failed', 'refunded')
payment_provider_id text
created_at          timestamptz
```

### Database Functions

#### `handle_new_user()`
Automatically creates profile and credits account when user signs up.
- Creates profile record
- Creates credits account with 50 free credits
- Logs welcome bonus transaction

#### `deduct_credits()`
Safely deducts credits with transaction logging.
```sql
deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_operation_type text,
  p_description text,
  p_metadata jsonb
)
RETURNS jsonb
```

#### `add_credits()`
Adds credits (purchases, bonuses, refunds).
```sql
add_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text,
  p_metadata jsonb
)
RETURNS jsonb
```

---

## Authentication System

### Features

1. **User Registration**
   - Email validation
   - Password strength requirements (8+ chars, uppercase, lowercase, number)
   - Optional username and full name
   - Automatic profile creation
   - 50 free welcome credits

2. **User Login**
   - Email/password authentication
   - Session management
   - Error handling for invalid credentials

3. **Password Reset**
   - Email-based password reset
   - Secure token generation
   - Password update functionality

### Using Authentication

#### In Components

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, signIn, signUp, signOut } = useAuth();

  // Check if user is logged in
  if (!user) {
    return <LoginButton />;
  }

  // User is authenticated
  return <div>Welcome {user.email}</div>;
}
```

#### Authentication Methods

```tsx
// Register new user
const { error } = await signUp(
  'user@example.com',
  'SecurePass123',
  'username',
  'Full Name'
);

// Login
const { error } = await signIn('user@example.com', 'SecurePass123');

// Logout
await signOut();

// Request password reset
const { error } = await resetPassword('user@example.com');

// Update password (after reset)
const { error } = await updatePassword('NewSecurePass123');
```

---

## Credits System

### Credit Costs

Based on API cost details from Meshy.ai:

```typescript
CREDIT_COSTS = {
  TEXT_TO_3D_MESH_MESHY6: 20,
  TEXT_TO_3D_MESH_OTHER: 10,
  TEXT_TO_3D_TEXTURE: 10,
  IMAGE_TO_3D_MESHY6_NO_TEXTURE: 20,
  IMAGE_TO_3D_MESHY6_WITH_TEXTURE: 30,
  IMAGE_TO_3D_OTHER_NO_TEXTURE: 5,
  IMAGE_TO_3D_OTHER_WITH_TEXTURE: 15,
  MULTI_IMAGE_NO_TEXTURE: 5,
  MULTI_IMAGE_WITH_TEXTURE: 15,
  RETEXTURE: 10,
  REMESH: 5,
  AUTO_RIGGING: 5,
  ANIMATION: 3,
}
```

### Pricing Tiers

Default pricing tiers (customizable):

| Tier | Credits | Bonus | Price | Value |
|------|---------|-------|-------|-------|
| Starter | 100 | 0 | $9.99 | $0.100/credit |
| Basic | 250 | 25 | $19.99 | $0.073/credit |
| Popular | 500 | 100 | $34.99 | $0.058/credit |
| Pro | 1000 | 250 | $59.99 | $0.048/credit |
| Premium | 2500 | 750 | $129.99 | $0.040/credit |

### Using Credits System

#### In Components

```tsx
import { useCredits } from '../hooks/useCredits';

function MyComponent() {
  const { balance, loading, checkCredits, refreshCredits } = useCredits();

  // Display balance
  return <div>Balance: {balance} credits</div>;

  // Check if user has enough credits
  const hasCred its = await checkCredits(20); // 20 credits needed

  // Refresh balance after operation
  refreshCredits();
}
```

#### Credit Operations

```tsx
import { deductCredits, addCredits, getCreditTransactions } from '../services/creditsService';

// Deduct credits
const result = await deductCredits(
  userId,
  20, // amount
  'IMAGE_TO_3D_MESHY6_NO_TEXTURE',
  'Generated 3D model from image',
  { modelId: '123', imageUrl: '...' }
);

// Add credits (purchase/bonus)
const result = await addCredits(
  userId,
  100,
  'purchase',
  'Purchased Starter pack',
  { tierId: '...' }
);

// Get transaction history
const transactions = await getCreditTransactions(userId, 50);
```

#### Credit Check Before API Call

```tsx
import { checkAndDeductCredits } from '../services/creditsWrapper';

async function generateModel(imageFile: File) {
  // Check and deduct credits before API call
  const creditCheck = await checkAndDeductCredits(
    'IMAGE_TO_3D_MESHY6_WITH_TEXTURE',
    'Generated 3D model with texture',
    { filename: imageFile.name }
  );

  if (!creditCheck.allowed) {
    toast.error(creditCheck.message);
    return;
  }

  // Proceed with API call
  const model = await apiCall(imageFile);

  return model;
}
```

---

## Integration Guide

### Step 1: Wrap App with AuthProvider

Already done in `src/main.tsx`:

```tsx
import { AuthProvider } from './contexts/AuthContext';

<AuthProvider>
  <App />
</AuthProvider>
```

### Step 2: Add Credit Checks to API Services

Example integration in generation service:

```tsx
// src/services/triposrService.ts

import { checkAndDeductCredits } from './creditsWrapper';

export const generateModelFromImage = async (
  imageUrl: string,
  file: File,
  // ... other params
) => {
  // Determine credit cost based on options
  const operationType = quality === 'ultra'
    ? 'IMAGE_TO_3D_MESHY6_WITH_TEXTURE'
    : 'IMAGE_TO_3D_OTHER_NO_TEXTURE';

  // Check and deduct credits
  const creditCheck = await checkAndDeductCredits(
    operationType,
    `Generated 3D model from ${file.name}`,
    { quality, filename: file.name }
  );

  if (!creditCheck.allowed) {
    throw new Error(creditCheck.message);
  }

  // Proceed with generation
  // ... existing code
};
```

### Step 3: Update UI Components

The `BalanceDisplay` component is already integrated and shows:
- Login button (if not authenticated)
- Credit balance (if authenticated)
- User menu with:
  - Transaction history
  - Purchase credits
  - Logout

### Step 4: Handle Auth Required Actions

```tsx
import { useAuth } from '../contexts/AuthContext';

function GenerateButton() {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const handleGenerate = () => {
    if (!user) {
      setShowAuth(true); // Show login modal
      return;
    }

    // Proceed with generation
    generateModel();
  };

  return (
    <>
      <button onClick={handleGenerate}>Generate</button>
      {showAuth && <AuthManager onClose={() => setShowAuth(false)} />}
    </>
  );
}
```

---

## API Reference

### AuthContext

```tsx
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string, fullName?: string)
    => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string)
    => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string)
    => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string)
    => Promise<{ error: AuthError | null }>;
}
```

### useCredits Hook

```tsx
interface UseCreditsReturn {
  credits: UserCredits | null;
  balance: number;
  transactions: CreditTransaction[];
  loading: boolean;
  error: string | null;
  checkCredits: (requiredAmount: number) => Promise<boolean>;
  refreshCredits: () => void;
}
```

### Credits Service

```tsx
// Get user credits
getUserCredits(userId: string): Promise<UserCredits | null>

// Get transaction history
getCreditTransactions(userId: string, limit?: number): Promise<CreditTransaction[]>

// Deduct credits
deductCredits(
  userId: string,
  amount: number,
  operationType: string,
  description: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string; newBalance?: number }>

// Add credits
addCredits(
  userId: string,
  amount: number,
  type: 'purchase' | 'bonus' | 'refund',
  description: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string; newBalance?: number }>

// Get pricing tiers
getPricingTiers(): Promise<PricingTier[]>

// Check sufficient credits
checkSufficientCredits(
  userId: string,
  requiredAmount: number
): Promise<{ sufficient: boolean; currentBalance: number }>
```

---

## Security Considerations

### Authentication Security

1. **Password Requirements:**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - Strength indicator shown to users

2. **Session Management:**
   - Secure token storage
   - Automatic session refresh
   - Logout on all devices supported

3. **Password Reset:**
   - Email verification required
   - Secure token with expiration
   - One-time use tokens

### Database Security

1. **Row Level Security (RLS):**
   - All tables have RLS enabled
   - Users can only access their own data
   - Service role bypasses RLS for admin operations

2. **Credit Operations:**
   - Atomic transactions with database locks
   - Validation for sufficient balance
   - Transaction logging for audit trail
   - Negative balance prevention

3. **SQL Injection Prevention:**
   - Parameterized queries via Supabase client
   - No raw SQL from user input
   - Type validation on all inputs

### Best Practices

1. **Never expose service role key** in client code
2. **Always validate** user permissions server-side
3. **Log all credit transactions** for audit purposes
4. **Use HTTPS only** for all API calls
5. **Implement rate limiting** on expensive operations
6. **Monitor for unusual activity** (bulk credit usage, etc.)

---

## Testing

### Manual Testing Checklist

#### Authentication
- [ ] Register new user with valid data
- [ ] Register fails with invalid email
- [ ] Register fails with weak password
- [ ] Register fails with duplicate email
- [ ] Login with correct credentials
- [ ] Login fails with wrong password
- [ ] Password reset email sent
- [ ] Password update works
- [ ] Logout works correctly
- [ ] Welcome bonus (50 credits) granted

#### Credits System
- [ ] Balance displays correctly
- [ ] Purchase modal shows pricing tiers
- [ ] Purchase completes successfully
- [ ] Credits added to balance
- [ ] Transaction logged in history
- [ ] Balance updates in real-time
- [ ] Insufficient credits prevents operation
- [ ] Credit deduction works
- [ ] Transaction history displays correctly
- [ ] Filters work in transaction history

#### Integration
- [ ] Generation requires authentication
- [ ] Generation checks credits before starting
- [ ] Insufficient credits shows error
- [ ] Credits deducted after generation
- [ ] Balance updates after deduction
- [ ] Transaction logged with correct details

### Automated Testing

```tsx
// Example test for credit deduction
describe('Credit System', () => {
  it('should deduct credits on model generation', async () => {
    const userId = 'test-user-id';
    const initialBalance = 100;

    // Setup: User has 100 credits
    await setupUserWithCredits(userId, initialBalance);

    // Action: Generate model (costs 20 credits)
    await generateModel(userId, 'IMAGE_TO_3D_OTHER_NO_TEXTURE');

    // Assert: Balance should be 80
    const finalBalance = await getUserBalance(userId);
    expect(finalBalance).toBe(80);

    // Assert: Transaction logged
    const transactions = await getCreditTransactions(userId);
    expect(transactions[0].amount).toBe(-20);
    expect(transactions[0].type).toBe('usage');
  });
});
```

---

## Usage Examples

### Complete Flow Example

```tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import { checkAndDeductCredits } from '../services/creditsWrapper';
import { AuthManager } from '../components/auth/AuthManager';
import { PurchaseCreditsModal } from '../components/credits/PurchaseCreditsModal';

function ModelGenerator() {
  const { user } = useAuth();
  const { balance, refreshCredits } = useCredits();
  const [showAuth, setShowAuth] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    // Step 1: Check authentication
    if (!user) {
      setShowAuth(true);
      toast.error('Prosím přihlaste se');
      return;
    }

    // Step 2: Check and deduct credits
    const creditCheck = await checkAndDeductCredits(
      'IMAGE_TO_3D_MESHY6_WITH_TEXTURE',
      'Generated 3D model with texture'
    );

    if (!creditCheck.allowed) {
      toast.error(creditCheck.message);
      setShowPurchase(true); // Offer to buy credits
      return;
    }

    // Step 3: Proceed with generation
    setGenerating(true);
    try {
      await generateModel();
      toast.success('Model vygenerován!');
      refreshCredits(); // Update balance display
    } catch (error) {
      toast.error('Chyba při generování');
      // Credits should be refunded on error
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div>
        <p>Vaše kredity: {balance}</p>
        <p>Cena: 30 kreditů</p>
        <button onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generuji...' : 'Generovat model'}
        </button>
      </div>

      {showAuth && <AuthManager onClose={() => setShowAuth(false)} />}
      {showPurchase && <PurchaseCreditsModal onClose={() => setShowPurchase(false)} />}
    </>
  );
}
```

---

## Troubleshooting

### Common Issues

1. **"User credits account not found"**
   - Trigger may not have fired on user creation
   - Manually create credits account:
   ```sql
   INSERT INTO user_credits (user_id, balance, total_earned)
   VALUES ('user-id', 50, 50);
   ```

2. **Balance not updating in real-time**
   - Check Supabase Realtime is enabled for tables
   - Verify subscription in `useCredits` hook
   - Call `refreshCredits()` manually

3. **Credit deduction fails**
   - Check user has sufficient balance
   - Verify database function has SECURITY DEFINER
   - Check RLS policies allow service role access

4. **Password validation too strict**
   - Adjust regex in `RegisterModal.tsx`
   - Update validation in `validatePassword()` function

---

## Future Enhancements

1. **Payment Integration:**
   - Stripe payment processing
   - PayPal integration
   - Cryptocurrency payments

2. **Credit Bundles:**
   - Subscription plans
   - Team/organization accounts
   - Bulk discounts

3. **Referral System:**
   - Referral codes
   - Bonus credits for referrals
   - Affiliate program

4. **Analytics:**
   - Usage analytics
   - Cost optimization suggestions
   - Credit usage forecasting

5. **Admin Panel:**
   - User management
   - Credit adjustments
   - Transaction monitoring
   - Fraud detection

---

## Support

For issues or questions:
1. Check this documentation
2. Review database logs in Supabase dashboard
3. Check browser console for errors
4. Verify RLS policies are correct
5. Test with service role key for debugging

---

*Last Updated: 2026-02-11*
*Version: 1.0.0*
