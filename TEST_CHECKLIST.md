# Testing Checklist - Post-Audit Fixes

This checklist verifies all fixes from the audit report.

---

## Prerequisites

### localStorage Mode
- No prerequisites (default mode)

### API Mode
- Set `NEXT_PUBLIC_USE_API=true` in `.env.local`
- Set `MONGODB_URI` and `MONGODB_DB` in `.env.local`
- MongoDB connection working

---

## Test 1: Display Field Consistency (Fix #1)

### Setup
1. In API mode, ensure you have a product with `title` but empty `nameMn` (or vice versa)
2. Or create one via seed endpoint

### Steps
- [ ] Open dashboard (`/import`)
- [ ] Product with `title` should display correctly (not blank)
- [ ] Open product editor (`/import/new/[id]`)
- [ ] Editor should show `title` value in nameMn field (auto-filled)
- [ ] Edit nameMn field
- [ ] Save draft
- [ ] Refresh page
- [ ] Both `title` and `nameMn` should have the same value
- [ ] UI should still display the name correctly

### Expected Result
✅ Product name displays consistently across all UI components
✅ Editing `nameMn` syncs to `title` in API mode
✅ No "saved but not visible" behavior

---

## Test 2: API-Mode Search/Import Persistence (Fix #2)

### Setup
- Set `NEXT_PUBLIC_USE_API=true`
- Clear browser localStorage (or use incognito)
- Ensure MongoDB is connected

### Steps
- [ ] Go to `/import/new`
- [ ] Select store: Gmarket
- [ ] Select category: Skincare
- [ ] Set count: 5
- [ ] Click "Search"
- [ ] Wait for products to appear
- [ ] **CRITICAL:** Refresh the page (F5)
- [ ] Products should still be visible
- [ ] Go to dashboard (`/import`)
- [ ] Products should appear in stats
- [ ] Check MongoDB directly (optional): products should be in DB

### Expected Result
✅ Products persist after page refresh
✅ Products saved to MongoDB
✅ No data loss

---

## Test 3: Baseline Initialization on PUSH (Fix #3)

### Setup
- Have a product in READY or DRAFT status
- Note the current `priceKrw` or `priceMnt` value

### Steps
- [ ] Open product editor
- [ ] Optionally edit priceMnt (to test mutation scenario)
- [ ] Click "Push"
- [ ] Product status changes to PUSHED
- [ ] Go to dashboard
- [ ] Find the pushed product
- [ ] Check source check fields:
  - [ ] `sourceBaselinePriceKrw` should be set
  - [ ] `sourceLastCheckedPriceKrw` should equal baseline
  - [ ] `sourceLastCheckedAt` should be recent timestamp
  - [ ] `sourcePriceChanged` should be `false`
  - [ ] `sourceOutOfStock` should be `false`

### Expected Result
✅ Baseline fields initialized correctly
✅ Baseline uses price BEFORE any mutations
✅ Fields set even if price was edited before push

---

## Test 4: Visibility Toggle Toast (Fix #4)

### Setup
- Have a product with `visibility: "public"`

### Steps
- [ ] Go to dashboard (`/import`)
- [ ] Find a product with visibility toggle button
- [ ] Click visibility toggle (eye icon)
- [ ] **CRITICAL:** Check toast message
- [ ] Toast should say "Product Hidden" (not "Product Unhidden")
- [ ] Click toggle again
- [ ] Toast should say "Product is now public" (not "Product Hidden")

### Expected Result
✅ Toast shows correct NEXT state (not current state)
✅ Message matches actual action taken

---

## Test 5: End-to-End Flow (All Fixes Combined)

### localStorage Mode
- [ ] Search products → products appear
- [ ] Edit product → changes save
- [ ] Push product → status = PUSHED, baseline initialized
- [ ] Refresh page → products persist
- [ ] Dashboard shows correct stats
- [ ] Source check works for pushed products

### API Mode
- [ ] Search products → products saved to DB
- [ ] Refresh page → products load from DB
- [ ] Edit product → changes persist in DB
- [ ] Push product → baseline fields initialized correctly
- [ ] Dashboard shows products from DB
- [ ] Display fields consistent (title/nameMn)
- [ ] Visibility toggle works with correct toast

---

## Test 6: Edge Cases

### Empty Fields
- [ ] Product with only `title` (no nameMn) → displays correctly
- [ ] Product with only `nameMn` (no title) → displays correctly
- [ ] Product with neither → shows "Untitled" or fallback

### Duplicate Products
- [ ] Search same store/category twice
- [ ] Duplicates should be skipped (deduplication)
- [ ] No duplicate products in DB

### Invalid Data
- [ ] Try to push invalid product → validation should prevent
- [ ] Try to edit blocked fields → should be ignored with warning

---

## Regression Tests

### localStorage Mode (Should Still Work)
- [ ] All original MVP functionality intact
- [ ] No breaking changes to localStorage persistence
- [ ] Fake data generation still works

### API Mode (New Functionality)
- [ ] API mode doesn't break when MongoDB unavailable (graceful error)
- [ ] Switching between modes doesn't cause data loss

---

## Quick Verification Script

Run this in browser console after testing:

```javascript
// Check display helper works
const { getDisplayTitle } = require('@/lib/utils')
const product = { title: 'Test', nameMn: '' }
console.log('Display title:', getDisplayTitle(product)) // Should be 'Test'

// Check store state
const store = useProductStore.getState()
console.log('Products count:', store.products.length)
console.log('API mode:', process.env.NEXT_PUBLIC_USE_API === 'true')
```

---

## Success Criteria

All tests should pass:
- ✅ Display fields consistent across UI
- ✅ API mode persists to DB
- ✅ Baseline initialized correctly
- ✅ Toast messages accurate
- ✅ No regressions in localStorage mode
- ✅ No TypeScript errors
- ✅ No console errors

---

## Known Limitations

1. **Source Check**: Still simulated (not real scraping)
2. **Deduplication**: Based on slug/sourceUrl (may need refinement)
3. **Pagination**: Not implemented (large lists may be slow)
4. **Authentication**: Not implemented (dev routes unprotected)

---

## Reporting Issues

If any test fails:
1. Note the test number and step
2. Check browser console for errors
3. Check MongoDB (if API mode)
4. Check network tab for failed API calls
5. Report with steps to reproduce

