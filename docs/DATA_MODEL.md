# Data Model

Complete documentation of data structures, schemas, and database design.

## Table of Contents

- [Product Type](#product-type)
- [Product Fields](#product-fields)
- [Draft Changes](#draft-changes)
- [Validation Result](#validation-result)
- [Store and Category](#store-and-category)
- [Production Database Schema](#production-database-schema)
- [Migration Strategy](#migration-strategy)

---

## Product Type

**File:** `types/product.ts`

The core data structure representing a product in the system.

```typescript
interface Product {
  id: string
  sourceStore: Store
  category: Category
  sourceUrl: string
  nameOriginal: string
  nameMn: string
  brand?: string
  priceKrw: number
  priceMnt: number
  descriptionOriginal: string
  descriptionMn: string
  imagesOriginal: string[]
  imagesFinal: string[]
  status: ProductStatus
  createdAt: string
  visibility: Visibility
  // Source change detection fields
  sourceBaselinePriceKrw?: number
  sourceLastCheckedPriceKrw?: number
  sourceLastCheckedInStock?: boolean
  sourceLastCheckedAt?: string
  sourcePriceChanged?: boolean
  sourceOutOfStock?: boolean
}
```

---

## Product Fields

### Identity Fields

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `id` | `string` | Yes | Generated | Unique identifier: `{store}-{category}-{index}` |
| `sourceStore` | `Store` | Yes | User selection | One of: `"gmarket"`, `"oliveyoung"`, `"auction"` |
| `category` | `Category` | Yes | User selection | Category string (varies by store) |
| `sourceUrl` | `string` | Yes | Generated | Original product URL on source store |

**Example:**
```typescript
{
  id: "gmarket-skincare-0",
  sourceStore: "gmarket",
  category: "Skincare",
  sourceUrl: "https://gmarket.com/product/gmarket-skincare-0"
}
```

### Name and Description

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `nameOriginal` | `string` | Yes | Scraped/Generated | Original product name (English/Korean) |
| `nameMn` | `string` | Yes | User input | Mongolian translation (editable) |
| `descriptionOriginal` | `string` | Yes | Scraped/Generated | Original description (English/Korean) |
| `descriptionMn` | `string` | Yes | User input | Mongolian translation (editable) |
| `brand` | `string?` | No | Scraped/User input | Brand name (optional) |

**Validation:**
- `nameMn`: Must not be empty (trimmed)
- `descriptionMn`: Must not be empty (trimmed)
- `brand`: Optional, no validation

**Example:**
```typescript
{
  nameOriginal: "Hydrating Face Cream",
  nameMn: "Арьс арчигч тос 1",
  descriptionOriginal: "Deeply hydrates and nourishes your skin.",
  descriptionMn: "Өндөр чанартай гоо сайхны бүтээгдэхүүн.",
  brand: "Laneige"
}
```

### Pricing

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `priceKrw` | `number` | Yes | Scraped/Generated | Price in Korean Won (baseline) |
| `priceMnt` | `number` | Yes | User input | Price in Mongolian Tugrik (editable) |

**Validation:**
- `priceMnt`: Must be > 0

**Conversion (MVP):**
- Fake: `priceMnt = priceKrw * 3.5` (approximate)
- Production: Real-time currency conversion API

**Example:**
```typescript
{
  priceKrw: 35000,
  priceMnt: 122500  // 35000 * 3.5
}
```

### Images

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `imagesOriginal` | `string[]` | Yes | Scraped/Generated | Original image URLs from source |
| `imagesFinal` | `string[]` | Yes | User input | Final image URLs (editable, reorderable) |

**Validation:**
- `imagesFinal`: Must have at least 1 URL

**MVP Behavior:**
- Starts with `imagesFinal = [...imagesOriginal]`
- User can add/remove/reorder
- URLs are strings (not validated for format in MVP)

**Production Behavior:**
- Images downloaded and uploaded to S3
- `imagesFinal` contains S3 URLs
- Image processing pipeline (resize, optimize)

**Example:**
```typescript
{
  imagesOriginal: [
    "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400"
  ],
  imagesFinal: [
    "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400",
    "https://images.unsplash.com/photo-1571875257727-256c39da42af?w=400"
  ]
}
```

### Status and Lifecycle

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `status` | `ProductStatus` | Yes | System | One of: `"RAW"`, `"DRAFT"`, `"READY"`, `"PUSHED"` |
| `createdAt` | `string` | Yes | System | ISO 8601 timestamp of creation |

**Status Values:**
- `RAW`: Initial state after import (default)
- `DRAFT`: User has saved changes (not validated)
- `READY`: Product is validated and ready to push
- `PUSHED`: Product is in production database

**Example:**
```typescript
{
  status: "PUSHED",
  createdAt: "2024-01-15T10:30:00.000Z"
}
```

### Visibility

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `visibility` | `Visibility` | Yes | User input | One of: `"public"`, `"hidden"` |

**Behavior:**
- `"public"`: Product visible on storefront (default)
- `"hidden"`: Product hidden from public access
- Toggleable via UI button
- Orthogonal to status (can hide any status)

**Example:**
```typescript
{
  visibility: "public"
}
```

### Source Change Detection

These fields track changes on the original store website.

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `sourceBaselinePriceKrw` | `number?` | No | System | Price when product was pushed |
| `sourceLastCheckedPriceKrw` | `number?` | No | System | Latest checked price |
| `sourceLastCheckedInStock` | `boolean?` | No | System | Latest stock status |
| `sourceLastCheckedAt` | `string?` | No | System | ISO 8601 timestamp of last check |
| `sourcePriceChanged` | `boolean?` | No | System | True if price differs from baseline |
| `sourceOutOfStock` | `boolean?` | No | System | True if product is out of stock |

**Initialization (on Push):**
```typescript
sourceBaselinePriceKrw = priceKrw
sourceLastCheckedPriceKrw = priceKrw
sourceLastCheckedInStock = true
sourceLastCheckedAt = new Date().toISOString()
sourcePriceChanged = false
sourceOutOfStock = false
```

**Update (on Source Check):**
- Compares `sourceLastCheckedPriceKrw` with `sourceBaselinePriceKrw`
- Sets `sourcePriceChanged = true` if different
- Sets `sourceOutOfStock` based on check result

**Example:**
```typescript
{
  sourceBaselinePriceKrw: 35000,
  sourceLastCheckedPriceKrw: 38500,  // Price increased
  sourceLastCheckedInStock: true,
  sourceLastCheckedAt: "2024-01-20T08:00:00.000Z",
  sourcePriceChanged: true,
  sourceOutOfStock: false
}
```

---

## Draft Changes

**File:** `types/product.ts`

Represents partial updates to a product (used in editor).

```typescript
interface DraftChanges {
  nameMn?: string
  descriptionMn?: string
  brand?: string
  priceMnt?: number
  imagesFinal?: string[]
}
```

**Behavior:**
- All fields optional
- Merged with existing product data
- Used in `updateProduct(id, changes)` action

**Example:**
```typescript
{
  nameMn: "Updated Name",
  priceMnt: 150000
}
```

---

## Validation Result

**File:** `types/product.ts`

Result of product validation.

```typescript
interface ValidationResult {
  isValid: boolean
  errors: {
    field: string
    message: string
  }[]
}
```

**Validation Rules:**
1. `nameMn`: Must not be empty (trimmed)
2. `descriptionMn`: Must not be empty (trimmed)
3. `priceMnt`: Must be > 0
4. `imagesFinal`: Must have at least 1 URL

**Example:**
```typescript
{
  isValid: false,
  errors: [
    { field: "nameMn", message: "Mongolian name is required" },
    { field: "imagesFinal", message: "At least one image is required" }
  ]
}
```

---

## Store and Category

**File:** `types/product.ts`

### Store Type

```typescript
type Store = "gmarket" | "oliveyoung" | "auction"
```

### Category Mapping

```typescript
const STORE_CATEGORIES: Record<Store, Category[]> = {
  gmarket: ["Skincare", "Makeup", "Haircare", "Fragrance", "Health"],
  oliveyoung: ["Skincare", "Makeup", "Haircare", "Body Care", "Men's Care"],
  auction: ["Electronics", "Fashion", "Home", "Beauty", "Sports"],
}
```

**Production:** Categories should be fetched from backend or config, not hardcoded.

---

## Production Database Schema

### Products Table (PostgreSQL)

```sql
CREATE TABLE products (
  id VARCHAR(255) PRIMARY KEY,
  source_store VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  source_url TEXT NOT NULL,
  
  -- Names and descriptions
  name_original TEXT NOT NULL,
  name_mn TEXT NOT NULL,
  description_original TEXT NOT NULL,
  description_mn TEXT NOT NULL,
  brand VARCHAR(255),
  
  -- Pricing
  price_krw INTEGER NOT NULL,
  price_mnt INTEGER NOT NULL,
  
  -- Images (stored as JSON array)
  images_original JSONB NOT NULL DEFAULT '[]',
  images_final JSONB NOT NULL DEFAULT '[]',
  
  -- Status and lifecycle
  status VARCHAR(20) NOT NULL CHECK (status IN ('RAW', 'DRAFT', 'READY', 'PUSHED')),
  visibility VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'hidden')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Source change detection
  source_baseline_price_krw INTEGER,
  source_last_checked_price_krw INTEGER,
  source_last_checked_in_stock BOOLEAN,
  source_last_checked_at TIMESTAMP WITH TIME ZONE,
  source_price_changed BOOLEAN DEFAULT FALSE,
  source_out_of_stock BOOLEAN DEFAULT FALSE,
  
  -- Indexes
  INDEX idx_status (status),
  INDEX idx_visibility (visibility),
  INDEX idx_source_store (source_store),
  INDEX idx_created_at (created_at),
  INDEX idx_source_last_checked_at (source_last_checked_at)
);
```

### Drafts Table (Optional - for audit trail)

```sql
CREATE TABLE product_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(255) NOT NULL REFERENCES products(id),
  user_id UUID NOT NULL,
  changes JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  INDEX idx_product_id (product_id),
  INDEX idx_user_id (user_id)
);
```

### Source Check History (Optional - for analytics)

```sql
CREATE TABLE source_check_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(255) NOT NULL REFERENCES products(id),
  price_krw INTEGER,
  in_stock BOOLEAN,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  INDEX idx_product_id (product_id),
  INDEX idx_checked_at (checked_at)
);
```

---

## Migration Strategy

### localStorage to Database

**Current (MVP):**
- Data stored in localStorage with key `product-import-store-v2`
- Zustand persist middleware handles serialization

**Migration Steps (Production):**

1. **Export Script:**
   ```typescript
   // scripts/export-localStorage.ts
   const data = localStorage.getItem('product-import-store-v2')
   const products = JSON.parse(data).state.products
   // Export to JSON file
   ```

2. **Import Script:**
   ```typescript
   // scripts/import-to-db.ts
   // Read JSON file
   // Insert into database with proper mapping
   // Handle duplicates (skip or update)
   ```

3. **Data Mapping:**
   - All fields map directly
   - Convert `imagesFinal` array to JSONB
   - Set `updated_at` = `created_at` for migrated products

### Version Migration (localStorage)

**Current Implementation:**
- Version 2 includes migration from v1
- Adds missing fields with defaults:
  - `visibility` → `"public"`
  - `sourceBaselinePriceKrw` → `priceKrw`
  - `sourceLastCheckedPriceKrw` → `priceKrw`
  - `sourceLastCheckedInStock` → `true`
  - `sourcePriceChanged` → `false`
  - `sourceOutOfStock` → `false`

**File:** `lib/store.ts` - `migrateProduct()` function

---

## Data Flow

### Import Flow (MVP)

```
User selects (store, category, count)
  ↓
generateFakeProducts() creates Product[]
  ↓
Products added to store.products[]
  ↓
Status: RAW
  ↓
User edits → Status: DRAFT
  ↓
User validates → Status: READY
  ↓
User pushes → Status: PUSHED
  ↓
Source check fields initialized
```

### Production Flow

```
User triggers import job
  ↓
Scraper fetches products from store
  ↓
Products stored in DB (status: RAW)
  ↓
Translation job runs (async)
  ↓
User reviews/edits → Status: DRAFT
  ↓
User validates → Status: READY
  ↓
User pushes → Status: PUSHED
  ↓
Images downloaded → S3 upload
  ↓
Product synced to storefront
```

---

## File Reference

- Types: `types/product.ts`
- Store: `lib/store.ts`
- Fake Data: `lib/fake-data.ts`

