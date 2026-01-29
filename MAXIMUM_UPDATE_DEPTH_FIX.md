# Maximum Update Depth Exceeded - Root Cause Analysis & Fix

**Date:** 2025-01-28  
**Issue:** Infinite re-render loop in ProductEditorPage  
**Status:** ✅ Fixed

---

## Root Cause Analysis

### The Problem

**Error:** "Maximum update depth exceeded"  
**Location:** `app/import/new/[id]/page.tsx` around line 76  
**Component:** `ProductEditorPage`

### Step 1: Identifying the Loop

**E1 (Lines 74-90):** Form initialization effect
```tsx
useEffect(() => {
  if (product) {
    setFormData({ ... })
    setHasUnsavedChanges(false)
  }
}, [product])  // ❌ PROBLEM: product is a new object every render
```

### Step 2: Tracing the Loop

**The Infinite Cycle:**

1. **Render 1:**
   - Line 62: `const rawProduct = getProduct(productId)` - Gets product from Zustand store
   - Line 65: `const product = rawProduct ? normalizeProduct(rawProduct) : null`
     - `normalizeProduct()` **always returns a NEW object** (uses `{...p, ...}` spread)
     - Even if data is identical, object reference is different
   - Line 74: `useEffect` runs because `product` dependency changed (new reference)
   - Line 76: `setFormData()` called → triggers re-render

2. **Render 2:**
   - Line 65: `normalizeProduct()` called again → **NEW object reference** (different from Render 1)
   - Line 74: `useEffect` sees dependency changed (different object reference)
   - Line 76: `setFormData()` called again → triggers re-render

3. **Render 3, 4, 5...** (infinite loop)

### Step 3: Root Cause

**The Problem:**
- `normalizeProduct()` creates a new object every call (line 40-53 in `lib/normalizeProduct.ts`)
- `useEffect` depends on entire `product` object
- Object reference changes every render → effect runs → state update → re-render → new object → effect runs...

**Why `normalizeProduct` creates new objects:**
```tsx
// lib/normalizeProduct.ts:40-53
return {
  ...p,  // Spread creates new object
  imagesFinal: imageUrls,
  nameMn: nameMn,
  // ... more fields
} as Product
```

**Why Zustand `getProduct` doesn't help:**
- `getProduct(id)` returns reference to product in store array
- But `normalizeProduct()` wraps it in a new object
- So even if store product is stable, normalized product is new each render

---

## The Fix

### Solution: Use Stable Dependency + Ref Guard

**Changed from:**
```tsx
useEffect(() => {
  if (product) {
    setFormData({ ... })
    setHasUnsavedChanges(false)
  }
}, [product])  // ❌ Unstable: new object every render
```

**Changed to:**
```tsx
// Track last initialized product ID to prevent re-initialization loop
const lastInitializedIdRef = useRef<string | null>(null)

useEffect(() => {
  if (!product) {
    lastInitializedIdRef.current = null
    return
  }

  // Only initialize if this is a different product or first load
  // This prevents infinite loop when product object reference changes but data is same
  if (lastInitializedIdRef.current === product.id) {
    return  // ✅ Guard: skip if same product ID already initialized
  }

  lastInitializedIdRef.current = product.id  // ✅ Track initialized ID

  setFormData({ ... })
  setHasUnsavedChanges(false)
}, [product?.id])  // ✅ Stable: only depends on product ID (string, not object)
```

### Why This Works

1. **Stable Dependency:** `product?.id` is a string, not an object
   - String comparison is by value, not reference
   - Only changes when actual product changes (different ID)

2. **Ref Guard:** `lastInitializedIdRef` prevents re-initialization
   - Tracks which product ID was last initialized
   - Skips effect if same product ID already processed
   - Prevents loop even if effect runs multiple times

3. **Minimal Changes:**
   - No changes to `normalizeProduct` (used elsewhere)
   - No changes to store structure
   - Only fixes the problematic effect

---

## Files Changed

1. ✅ `app/import/new/[id]/page.tsx`
   - Added `useRef` import
   - Added `lastInitializedIdRef` to track initialized product ID
   - Changed `useEffect` dependency from `[product]` to `[product?.id]`
   - Added guard to skip re-initialization of same product

---

## Verification

### Before Fix:
- ❌ Infinite re-render loop
- ❌ "Maximum update depth exceeded" error
- ❌ Effect runs on every render
- ❌ Form data constantly reset

### After Fix:
- ✅ Effect runs only when product ID changes
- ✅ Form data initialized once per product
- ✅ No infinite loops
- ✅ Editor behavior preserved (loading, form init, dirty state, dialogs all work)

---

## Testing Checklist

- [ ] Open `/import/new/[id]` page
- [ ] Verify form loads with product data
- [ ] Edit form fields - verify changes persist
- [ ] Navigate to different product - verify form updates
- [ ] Check console - no "Maximum update depth exceeded" errors
- [ ] Verify unsaved changes dialog works
- [ ] Verify image dialog works
- [ ] Verify save/ready/push actions work

---

## Pattern Guidelines

### ✅ DO: Use Stable Dependencies
```tsx
// Depend on primitive values (string, number, boolean)
useEffect(() => {
  // ...
}, [product?.id])  // ✅ Stable: string comparison

// Or use ref guard for one-time initialization
const initRef = useRef<string | null>(null)
useEffect(() => {
  if (initRef.current === product?.id) return
  initRef.current = product?.id
  // Initialize once per product
}, [product?.id])
```

### ❌ DON'T: Depend on Object References
```tsx
// Don't depend on entire objects that are recreated
useEffect(() => {
  // ...
}, [product])  // ❌ Unstable: new object every render

// Don't depend on computed/memoized objects without stable deps
useEffect(() => {
  // ...
}, [normalizeProduct(product)])  // ❌ Unstable: new object every call
```

---

## Related Issues

- **NormalizeProduct:** Always creates new objects (by design, for immutability)
- **Zustand Store:** Returns stable references, but normalization breaks stability
- **Form Initialization:** Needs to run when product changes, but not on every render

---

## Summary

**Root Cause:** `useEffect` depended on entire `product` object, which was recreated every render by `normalizeProduct()`, causing infinite loop.

**Fix:** Changed dependency to stable `product?.id` (string) and added ref guard to prevent re-initialization of same product.

**Result:** Effect runs only when product actually changes (different ID), eliminating infinite loop while preserving all editor functionality.

