# Credit System Integration Example

## How to Integrate Credits into Existing Services

This guide shows how to add credit checking and deduction to your existing API services.

---

## Example: Image to 3D Generation Service

### Before Integration

```typescript
// services/triposrService.ts (original)

export const generateModelFromImage = async (
  imageUrl: string,
  file: File,
  quality: QualityPreset
) => {
  // Direct API call without credit check
  const response = await fetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ imageUrl, quality })
  });

  return await response.json();
};
```

### After Integration

```typescript
// services/triposrService.ts (with credits)

import { checkAndDeductCredits, getCreditCost } from './creditsWrapper';
import { CREDIT_COSTS } from './creditsService';
import toast from 'react-hot-toast';

export const generateModelFromImage = async (
  imageUrl: string,
  file: File,
  quality: QualityPreset,
  withTexture: boolean = false
) => {
  // Step 1: Determine credit cost based on options
  let operationType: keyof typeof CREDIT_COSTS;

  if (quality === 'ultra') {
    operationType = withTexture
      ? 'IMAGE_TO_3D_MESHY6_WITH_TEXTURE'
      : 'IMAGE_TO_3D_MESHY6_NO_TEXTURE';
  } else {
    operationType = withTexture
      ? 'IMAGE_TO_3D_OTHER_WITH_TEXTURE'
      : 'IMAGE_TO_3D_OTHER_NO_TEXTURE';
  }

  const creditCost = getCreditCost(operationType);

  // Step 2: Check and deduct credits BEFORE API call
  const creditCheck = await checkAndDeductCredits(
    operationType,
    `Generated 3D model from ${file.name}`,
    {
      quality,
      withTexture,
      filename: file.name,
      fileSize: file.size,
    }
  );

  // Step 3: Handle insufficient credits
  if (!creditCheck.allowed) {
    toast.error(creditCheck.message || 'Nedostatek kreditů', {
      duration: 5000,
      icon: '💳',
    });

    throw new Error(creditCheck.message);
  }

  // Step 4: Proceed with API call
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ imageUrl, quality, withTexture })
    });

    if (!response.ok) {
      throw new Error('API call failed');
    }

    const result = await response.json();

    // Step 5: Show success message with credit usage
    toast.success(
      `Model vygenerován! Použito ${creditCost} kreditů`,
      {
        icon: '✨',
        duration: 3000,
      }
    );

    return result;

  } catch (error) {
    // Step 6: Handle errors (credits already deducted)
    // Note: In production, you might want to refund credits on API errors
    console.error('Generation failed:', error);
    throw error;
  }
};
```

---

## Example: Text to 3D Generation

```typescript
import { checkAndDeductCredits } from './creditsWrapper';

export const generateModelFromText = async (
  prompt: string,
  modelType: 'preview' | 'refine' = 'preview'
) => {
  // Determine operation type
  const operationType = modelType === 'preview'
    ? 'TEXT_TO_3D_MESH_MESHY6' // 20 credits
    : 'TEXT_TO_3D_TEXTURE'; // 10 credits

  // Check and deduct credits
  const creditCheck = await checkAndDeductCredits(
    operationType,
    `Generated ${modelType} model from text: "${prompt.substring(0, 50)}..."`,
    { prompt, modelType }
  );

  if (!creditCheck.allowed) {
    throw new Error(creditCheck.message);
  }

  // Call API
  const result = await apiCall(prompt, modelType);
  return result;
};
```

---

## Example: Model Enhancement (Rigging)

```typescript
import { checkAndDeductCredits } from './creditsWrapper';

export const rigModel = async (modelUrl: string) => {
  // Rigging costs 5 credits
  const creditCheck = await checkAndDeductCredits(
    'AUTO_RIGGING',
    'Applied auto-rigging to model',
    { modelUrl }
  );

  if (!creditCheck.allowed) {
    throw new Error(creditCheck.message);
  }

  // Call rigging API
  const result = await rigModelAPI(modelUrl);
  return result;
};
```

---

## Example: Component Integration

### Before - Direct Generation Call

```tsx
function GeneratorComponent() {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const model = await generateModelFromImage(imageUrl, file, 'quality');
      setModel(model);
    } catch (error) {
      toast.error('Chyba při generování');
    } finally {
      setGenerating(false);
    }
  };

  return <button onClick={handleGenerate}>Generate</button>;
}
```

### After - With Auth and Credit Checks

```tsx
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import { getCreditCost } from '../services/creditsWrapper';
import { AuthManager } from '../components/auth/AuthManager';
import { PurchaseCreditsModal } from '../components/credits/PurchaseCreditsModal';

function GeneratorComponent() {
  const { user } = useAuth();
  const { balance, refreshCredits } = useCredits();
  const [generating, setGenerating] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  // Get credit cost for display
  const creditCost = getCreditCost('IMAGE_TO_3D_MESHY6_WITH_TEXTURE');
  const canAfford = balance >= creditCost;

  const handleGenerate = async () => {
    // Check authentication first
    if (!user) {
      setShowAuth(true);
      toast.error('Prosím přihlaste se pro generování modelů');
      return;
    }

    // Check if user can afford
    if (!canAfford) {
      setShowPurchase(true);
      toast.error(`Potřebujete ${creditCost} kreditů (máte ${balance})`);
      return;
    }

    setGenerating(true);
    try {
      // This function now handles credit deduction internally
      const model = await generateModelFromImage(imageUrl, file, 'quality', true);
      setModel(model);

      // Refresh credit balance
      refreshCredits();

    } catch (error) {
      if (error.message.includes('kreditů')) {
        // Credit-related error
        setShowPurchase(true);
      }
      toast.error(error.message || 'Chyba při generování');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div>
        <p className="text-sm text-brand-muted mb-2">
          Cena: {creditCost} kreditů
          {!canAfford && (
            <span className="text-red-400 ml-2">
              (Nedostatek kreditů)
            </span>
          )}
        </p>

        <button
          onClick={handleGenerate}
          disabled={generating || !canAfford}
          className="btn-primary"
        >
          {generating ? 'Generuji...' : 'Generovat model'}
        </button>

        {!canAfford && (
          <button
            onClick={() => setShowPurchase(true)}
            className="btn-secondary ml-2"
          >
            Nakoupit kredity
          </button>
        )}
      </div>

      {showAuth && (
        <AuthManager
          initialView="login"
          onClose={() => setShowAuth(false)}
        />
      )}

      {showPurchase && (
        <PurchaseCreditsModal
          onClose={() => setShowPurchase(false)}
        />
      )}
    </>
  );
}
```

---

## Quick Integration Checklist

For each API operation that should consume credits:

1. **Import the wrapper:**
   ```typescript
   import { checkAndDeductCredits, getCreditCost } from './creditsWrapper';
   ```

2. **Determine operation type:**
   ```typescript
   const operationType = 'IMAGE_TO_3D_MESHY6_WITH_TEXTURE';
   ```

3. **Add credit check before API call:**
   ```typescript
   const creditCheck = await checkAndDeductCredits(
     operationType,
     'Description of operation',
     { /* metadata */ }
   );

   if (!creditCheck.allowed) {
     throw new Error(creditCheck.message);
   }
   ```

4. **Update component to handle auth:**
   ```typescript
   const { user } = useAuth();

   if (!user) {
     // Show login modal
     return;
   }
   ```

5. **Show credit cost in UI:**
   ```typescript
   const { balance } = useCredits();
   const cost = getCreditCost(operationType);
   const canAfford = balance >= cost;
   ```

6. **Refresh balance after operation:**
   ```typescript
   const { refreshCredits } = useCredits();

   // After successful operation
   refreshCredits();
   ```

---

## Error Handling Patterns

### Pattern 1: Show Purchase Modal on Insufficient Credits

```typescript
try {
  await generateModel();
} catch (error) {
  if (error.message.includes('Nedostatek kreditů')) {
    setShowPurchaseModal(true);
  }
  toast.error(error.message);
}
```

### Pattern 2: Disable Button When Can't Afford

```tsx
const canAfford = balance >= getCreditCost('OPERATION_TYPE');

<button disabled={!canAfford || generating}>
  {canAfford ? 'Generate' : 'Nedostatek kreditů'}
</button>
```

### Pattern 3: Show Cost Warning

```tsx
{balance < getCreditCost('OPERATION_TYPE') && (
  <div className="warning">
    Nedostatečný počet kreditů.
    <button onClick={() => setShowPurchase(true)}>
      Nakoupit kredity
    </button>
  </div>
)}
```

---

## Testing Integration

```typescript
// Test that credits are deducted
it('should deduct credits on model generation', async () => {
  const initialBalance = 100;
  await setupUser(userId, initialBalance);

  await generateModel(imageUrl, file, 'quality');

  const finalBalance = await getBalance(userId);
  expect(finalBalance).toBe(initialBalance - 30); // 30 credit cost
});

// Test that generation fails with insufficient credits
it('should fail when insufficient credits', async () => {
  await setupUser(userId, 10); // Only 10 credits

  await expect(
    generateModel(imageUrl, file, 'quality') // Needs 30
  ).rejects.toThrow('Nedostatek kreditů');
});

// Test that credits are not deducted on API error
it('should refund credits on API failure', async () => {
  const initialBalance = 100;
  await setupUser(userId, initialBalance);

  mockAPIToFail();

  try {
    await generateModel(imageUrl, file, 'quality');
  } catch (error) {
    // Expected to fail
  }

  // TODO: Implement refund logic
  const finalBalance = await getBalance(userId);
  expect(finalBalance).toBe(initialBalance); // Credits refunded
});
```

---

## Production Considerations

1. **Refund on Failure:**
   ```typescript
   try {
     await apiCall();
   } catch (error) {
     // Refund credits on API failure
     await addCredits(userId, creditCost, 'refund', 'API call failed');
     throw error;
   }
   ```

2. **Rate Limiting:**
   - Add rate limiting to prevent abuse
   - Track requests per user per time period
   - Implement cooldown periods for expensive operations

3. **Monitoring:**
   - Log all credit transactions
   - Monitor for unusual patterns
   - Alert on bulk credit deductions
   - Track conversion rates (credits → successful operations)

4. **Error Recovery:**
   - Implement retry logic with idempotency
   - Store operation state for recovery
   - Handle partial failures gracefully

---

This integration pattern ensures that:
- ✅ Users must be authenticated
- ✅ Credits are checked before operations
- ✅ Insufficient credits are handled gracefully
- ✅ Balance updates in real-time
- ✅ Transaction history is maintained
- ✅ Users can purchase more credits easily
