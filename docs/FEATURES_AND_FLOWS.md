# Features and Flows

Complete documentation of all user-visible features in the Product Import Tool.

## Table of Contents

- [Dashboard](#dashboard)
- [Products in Database](#products-in-database)
- [Import Search](#import-search)
- [Results List](#results-list)
- [Product Editor](#product-editor)
- [Bulk Actions](#bulk-actions)
- [Source Updates Check](#source-updates-check)

---

## Dashboard

**Route:** `/import`  
**File:** `app/import/page.tsx`

### Purpose

Main landing page showing product statistics and managing pushed products.

### Features

#### 1. Summary Cards

Four metric cards displaying:
- **Total Products**: Count of all imported products (any status)
- **Drafts**: Products with status `DRAFT`
- **Ready to Push**: Products with status `READY`
- **Pushed**: Products with status `PUSHED`

**Implementation:** Computed from `products` array using `useMemo` for performance.

#### 2. Products in Database Table

Shows only products with status `PUSHED` (considered "in database").

**Columns:**
- Thumbnail image (60x60px)
- Product name (Mongolian) + brand (secondary text)
- Store + Category
- Current MNT price
- Status badges (Price Changed, Out of Stock, Hidden)
- Actions (Hide/Unhide toggle, Open button)

**Filters:**
- Search input: Filters by `nameMn`, `nameOriginal`, or `brand`
- Flag filter: All / Price Changed / Out of Stock / Hidden
- Store filter: All / Gmarket / Olive Young / Auction

**Sorting:**
1. Flagged items first (priority: Out of Stock > Price Changed > Hidden)
2. Then by `sourceLastCheckedAt` (most recent first)

**Empty State:**
- Shows message: "No products in database yet"
- CTA button: "Import Products" (links to `/import/new`)

**Implementation Details:**
- Uses `useMemo` for filtered/sorted list
- Real-time updates as products change
- Responsive table layout

---

## Products in Database

**Route:** `/import` (Dashboard section)  
**File:** `app/import/page.tsx`

### Visibility Toggle

**Action:** Click eye icon (👁️) on any product row

**Behavior:**
- Toggles `visibility` between `"public"` and `"hidden"`
- Updates immediately in UI
- Shows toast notification
- Persists to localStorage

**Badge Display:**
- Hidden products show "Hidden" badge with eye-off icon
- Tooltip: "Product is hidden from public access"

### Open Product

**Action:** Click "Open" button on any product row

**Behavior:**
- Navigates to `/import/new/[id]` (Product Editor)
- Opens product in editor view

---

## Import Search

**Route:** `/import/new`  
**File:** `app/import/new/page.tsx`

### Purpose

Search and import products from stores using fake data generator.

### Step-by-Step Flow

1. **Select Store**
   - Dropdown: Gmarket / Olive Young / Auction
   - Selecting store enables category dropdown

2. **Select Category**
   - Options depend on selected store:
     - **Gmarket**: Skincare, Makeup, Haircare, Fragrance, Health
     - **Olive Young**: Skincare, Makeup, Haircare, Body Care, Men's Care
     - **Auction**: Electronics, Fashion, Home, Beauty, Sports
   - Resets when store changes

3. **Set Count**
   - Number input (min: 1, max: 100, default: 20)
   - Determines how many fake products to generate

4. **Click Search**
   - Validates: Both store and category must be selected
   - Shows loading skeleton (800-1200ms delay)
   - Generates fake products using deterministic algorithm
   - Merges with existing products (no duplicates)
   - Updates `currentSearchResults` in store
   - Shows toast: "Search Complete - Found X products"

### Implementation Details

**File:** `lib/fake-data.ts`

- Uses seeded random number generator for determinism
- Same (store, category, count) = same products
- Introduces realistic imperfections:
  - 20% missing brand
  - 15% missing Mongolian description
  - 10% missing images

**Loading State:**
- Shows `ProductCardSkeleton` components during search
- Number of skeletons = requested count

---

## Results List

**Route:** `/import/new` (after search)  
**File:** `app/import/new/page.tsx`

### Product Cards

Each card displays:
- Checkbox for bulk selection
- Warning icon (⚠️) if missing required fields
- Status badge (RAW / DRAFT / READY / PUSHED)
- Product image thumbnail (or placeholder)
- Product name (Mongolian, fallback to original)
- Brand (if available)
- Price in MNT (formatted with commas)
- Action buttons: Open, Save Draft, Push

### Filters

#### Search Input
- Filters by: `nameMn`, `nameOriginal`, `brand`
- Case-insensitive
- Real-time filtering

#### Status Filter
- Dropdown: All / RAW / DRAFT / READY / PUSHED
- Filters `currentSearchResults` by status

### Bulk Selection

**Select All Checkbox:**
- Appears above product grid when results exist
- Toggles selection of all filtered products
- Shows count: "Select all (X products)"

**Bulk Action Bar:**
- Appears when products are selected
- Shows: "X item(s) selected"
- Actions:
  - **Save Draft (Bulk)**: Sets all selected to `DRAFT` status
  - **Push (Bulk)**: Validates all selected, then sets to `PUSHED` if valid

**Bulk Push Validation:**
- Validates each selected product
- If any invalid, shows toast with count
- Only pushes valid products
- Clears selection after action

### Individual Actions

#### Save Draft
- Sets product status to `DRAFT`
- No validation required
- Shows toast: "Draft Saved"

#### Push
- Validates product first
- If invalid: Shows toast with error messages
- If valid: Sets status to `PUSHED`, initializes source check fields
- Shows toast: "Pushed"

**Source Check Initialization (on Push):**
- `sourceBaselinePriceKrw` = `priceKrw`
- `sourceLastCheckedPriceKrw` = `priceKrw`
- `sourceLastCheckedInStock` = `true`
- `sourceLastCheckedAt` = current timestamp
- `sourcePriceChanged` = `false`
- `sourceOutOfStock` = `false`

---

## Product Editor

**Route:** `/import/new/[id]`  
**File:** `app/import/new/[id]/page.tsx`

### Purpose

Edit product details with side-by-side comparison of original vs final data.

### Layout

**Two-Column Design:**
- **Left Column**: Final (Editable) fields
- **Right Column**: Original (Read-only) reference

### Editable Fields (Left)

#### Name (Mongolian) - Required
- Input field
- Validation: Must not be empty
- Error: "Mongolian name is required"

#### Description (Mongolian) - Required
- Textarea (min-height: 80px)
- Validation: Must not be empty
- Error: "Mongolian description is required"

#### Brand - Optional
- Input field
- No validation

#### Price (MNT) - Required
- Number input
- Validation: Must be > 0
- Error: "Price must be greater than 0"

#### Images - Required
- List of image URLs
- Each image shows:
  - Thumbnail (80x80px)
  - URL input (read-only)
  - Reorder buttons (↑ ↓)
  - Remove button (X)
- Validation: At least 1 image required
- Error: "At least one image is required"
- **Add Image**: Opens dialog to enter URL

**Image Management:**
- **Add**: Dialog with input field, validates URL format
- **Remove**: Removes image from list
- **Reorder**: Moves image up/down in list

### Read-Only Fields (Right)

- Store (sourceStore)
- Category
- Source URL
- Name (Original)
- Description (Original)
- Price (KRW)
- Original Images (grid display)

### Validation

**Real-time Validation:**
- Validates on every field change
- Shows errors inline below each field
- Shows summary card at top if errors exist

**Validation Rules:**
1. `nameMn` not empty
2. `descriptionMn` not empty
3. `priceMnt` > 0
4. `imagesFinal.length` > 0

**Action Button States:**
- **Save Draft**: Always enabled (saves even if invalid)
- **Mark as Ready**: Disabled if invalid
- **Push**: Disabled if invalid

### Navigation

#### Prev/Next Buttons
- Arrow buttons in header
- Navigate between products in current search results
- Falls back to all products if not in search results
- Disabled at boundaries

#### Keyboard Shortcuts
- `j`: Next product
- `k`: Previous product
- `Ctrl+S` / `Cmd+S`: Save draft

**Implementation:**
- Uses `useEffect` with keyboard event listener
- Prevents default browser behavior
- Only active when product exists

### Unsaved Changes Dialog

**Trigger:** Attempting to navigate away with unsaved changes

**Options:**
1. **Discard**: Navigate without saving
2. **Save Draft**: Save changes, then navigate
3. **Cancel**: Stay on current page

**Implementation:**
- Tracks `hasUnsavedChanges` state
- Intercepts navigation via `handleNavigate`
- Shows `Dialog` component

### Status Display

**Sticky Action Bar (bottom):**
- Shows current status badge
- Shows "Unsaved changes" indicator if applicable
- Action buttons: Save Draft, Mark as Ready, Push

**Status Transitions:**
- **Save Draft**: Sets to `DRAFT` (no validation)
- **Mark as Ready**: Sets to `READY` (requires validation)
- **Push**: Sets to `PUSHED` (requires validation, initializes source check)

### Edge Cases

**Product Not Found:**
- Shows empty state: "Product not found"
- Button: "Back to Search"

**Product Not in Search Results:**
- Falls back to all products for navigation
- Shows: "Product not in current search results" in header

---

## Bulk Actions

**Location:** Results List (`/import/new`)

### Selection

- Individual checkboxes on each product card
- "Select all" checkbox above grid
- Selection persists across filter changes

### Actions

#### Save Draft (Bulk)
- Sets all selected products to `DRAFT` status
- No validation required
- Clears selection after action
- Toast: "Bulk Draft Saved - X products saved as draft"

#### Push (Bulk)
- Validates all selected products
- If any invalid: Shows error toast with count
- If all valid: Sets all to `PUSHED` status
- Clears selection after action
- Toast: "Bulk Pushed - X products have been pushed"

**Implementation:**
- Uses `updateMultipleProductsStatus` from store
- Validates each product before pushing
- Atomic operation (all or nothing for validation)

---

## Source Updates Check

**Location:** Dashboard (`/import`)  
**File:** `app/import/page.tsx`

### Purpose

Simulates checking original store websites for price and stock changes.

### Current Implementation (MVP)

**Button:** "Check Source Updates"  
**Behavior:**
1. Shows loading state (800-1200ms delay)
2. For each `PUSHED` product:
   - Uses deterministic PRNG to simulate check
   - 15% chance: Out of stock
   - 25% chance (if in stock): Price change (±3% to ±12%)
   - Updates product fields:
     - `sourceLastCheckedPriceKrw`
     - `sourceLastCheckedInStock`
     - `sourceLastCheckedAt`
     - `sourcePriceChanged`
     - `sourceOutOfStock`
3. Shows toast summary:
   - "Checked X products: Y price changed, Z out of stock"

**Deterministic Algorithm:**
- File: `lib/deterministic-prng.ts`
- Seed: `productId + store + sourceUrl + dayKey`
- Same product + same day = same result
- Results change across days (simulates real-world changes)

### Production Behavior (Future)

- Scheduled job runs periodically (e.g., daily)
- Real HTTP requests to store websites
- Parses HTML/JSON responses
- Updates database
- Sends notifications for significant changes

### Status Indicators

After check, products show badges:
- **Price Changed** (orange): `sourcePriceChanged === true`
- **Out of Stock** (red): `sourceOutOfStock === true`
- **Hidden** (gray): `visibility === "hidden"`

Tooltips explain each badge.

---

## Edge Cases and Error Handling

### Empty States

- **No products imported**: Empty state with CTA
- **No search results**: "No products match your filters"
- **Product not found**: "Product not found" with back button

### Validation Failures

- Inline error messages
- Summary card at top of editor
- Action buttons disabled when invalid
- Toast notifications for bulk validation failures

### localStorage Failures

- Migration function has try-catch
- Falls back to empty state on migration failure
- Logs errors to console
- `onRehydrateStorage` handler logs rehydration errors

### Navigation Edge Cases

- Product not in search results: Falls back to all products
- Unsaved changes: Shows confirmation dialog
- Invalid product ID: Shows not found state

---

## File Reference

- Dashboard: `app/import/page.tsx`
- Import/Search: `app/import/new/page.tsx`
- Product Editor: `app/import/new/[id]/page.tsx`
- Store Logic: `lib/store.ts`
- Fake Data: `lib/fake-data.ts`
- Source Check Simulation: `lib/deterministic-prng.ts`
- Types: `types/product.ts`

