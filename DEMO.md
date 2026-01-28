# Quick Demo Guide

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open http://localhost:3000

## Demo Flow

### Step 1: Dashboard
- Navigate to `/import` (or root redirects there)
- See summary cards showing:
  - Total Products: 0 (initially)
  - Drafts: 0
  - Ready to Push: 0
  - Pushed: 0
- See empty "Recent Activity" section

### Step 2: Import Products
- Click "Import Products" button
- Select:
  - **Store**: Gmarket
  - **Category**: Skincare
  - **Count**: 20
- Click "Search"
- Wait ~1 second for loading skeleton
- See 20 product cards appear

### Step 3: Explore Products
- Notice some products have warning icons (missing fields)
- See status badges: RAW (default)
- Try the search filter: type "cream" or "mask"
- Try status filter: select "RAW" to see only raw products

### Step 4: Individual Actions
- Click "Open" on a product card
- Or click "Save Draft" to change status to DRAFT
- Or click "Push" (will fail if product is invalid)

### Step 5: Bulk Actions
- Check multiple product checkboxes
- See bulk action bar appear
- Click "Save Draft (Bulk)" or "Push (Bulk)"
- Notice status changes on selected products

### Step 6: Product Editor
- Click "Open" on any product
- See two-column layout:
  - **Left**: Editable fields (Final)
  - **Right**: Read-only reference (Original)
- Try editing:
  - Name (Mongolian) - required
  - Description (Mongolian) - required
  - Brand - optional
  - Price (MNT) - must be > 0
  - Images - add/remove/reorder

### Step 7: Validation
- Clear the name field
- See validation error appear
- Try to "Mark as Ready" or "Push"
- See toast notification about validation failure
- Fill in required fields
- Try again - should succeed

### Step 8: Navigation
- Use Prev/Next buttons to navigate
- Or use keyboard shortcuts:
  - `j` - next product
  - `k` - previous product
  - `Ctrl+S` / `Cmd+S` - save draft
- Make changes, then try to navigate
- See confirmation dialog for unsaved changes

### Step 9: Status Workflow
1. **RAW** → Edit product
2. **Save Draft** → Status becomes DRAFT
3. Fill all required fields
4. **Mark as Ready** → Status becomes READY (only if valid)
5. **Push** → Status becomes PUSHED (only if valid)

### Step 10: Persistence
- Refresh the page
- All your products and edits are still there!
- Data persists in localStorage

## Test Cases

### Missing Fields (Validation)
- Some products are generated with missing:
  - Brand (~20%)
  - Description (Mongolian) (~15%)
  - Images (~10%)
- These trigger warning badges and validation errors

### Status Transitions
- RAW → DRAFT: Always allowed (Save Draft)
- DRAFT → READY: Only if valid (Mark as Ready)
- READY → PUSHED: Only if valid (Push)
- Any → PUSHED: Direct push if valid

### Keyboard Shortcuts
- `j`: Next product (editor only)
- `k`: Previous product (editor only)
- `Ctrl+S` / `Cmd+S`: Save draft (editor only)

## Tips

- Products are deterministic: same store + category + count = same results
- Try different stores and categories to see different products
- Check the dashboard after importing to see stats update
- Use filters to find specific products quickly
- Bulk actions work on filtered results

