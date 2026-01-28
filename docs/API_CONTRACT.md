# API Contract

REST API specifications for production backend.

## Table of Contents

- [Authentication](#authentication)
- [Products API](#products-api)
- [Drafts API](#drafts-api)
- [Import Jobs API](#import-jobs-api)
- [Source Check API](#source-check-api)
- [Common Patterns](#common-patterns)

---

## Authentication

### POST /api/auth/login

Authenticate user and return JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin" | "reviewer"
  }
}
```

**Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

### POST /api/auth/refresh

Refresh JWT token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "token": "new-jwt-token"
}
```

### POST /api/auth/logout

Invalidate current token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Logged out"
}
```

---

## Products API

### GET /api/products

List products with filtering, sorting, and pagination.

**Query Parameters:**
- `status`: Filter by status (RAW, DRAFT, READY, PUSHED)
- `store`: Filter by store (gmarket, oliveyoung, auction)
- `visibility`: Filter by visibility (public, hidden)
- `flag`: Filter by flag (price_changed, out_of_stock, hidden)
- `search`: Search in nameMn, nameOriginal, brand
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (createdAt, updatedAt, priceMnt)
- `order`: Sort order (asc, desc)

**Example:**
```
GET /api/products?status=PUSHED&flag=price_changed&page=1&limit=20
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "gmarket-skincare-0",
      "sourceStore": "gmarket",
      "category": "Skincare",
      "sourceUrl": "https://gmarket.com/product/...",
      "nameOriginal": "Hydrating Face Cream",
      "nameMn": "Арьс арчигч тос",
      "brand": "Laneige",
      "priceKrw": 35000,
      "priceMnt": 122500,
      "descriptionOriginal": "...",
      "descriptionMn": "...",
      "imagesOriginal": ["https://..."],
      "imagesFinal": ["https://s3..."],
      "status": "PUSHED",
      "visibility": "public",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T08:00:00.000Z",
      "sourceBaselinePriceKrw": 35000,
      "sourceLastCheckedPriceKrw": 38500,
      "sourceLastCheckedInStock": true,
      "sourceLastCheckedAt": "2024-01-20T08:00:00.000Z",
      "sourcePriceChanged": true,
      "sourceOutOfStock": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### GET /api/products/:id

Get single product by ID.

**Response (200):**
```json
{
  "id": "gmarket-skincare-0",
  // ... full product object
}
```

**Response (404):**
```json
{
  "error": "Product not found"
}
```

### POST /api/products

Create new product (typically done by import job).

**Request:**
```json
{
  "sourceStore": "gmarket",
  "category": "Skincare",
  "sourceUrl": "https://gmarket.com/product/123",
  "nameOriginal": "Product Name",
  "descriptionOriginal": "Description",
  "priceKrw": 35000,
  "imagesOriginal": ["https://..."]
}
```

**Response (201):**
```json
{
  "id": "gmarket-skincare-0",
  // ... full product object
}
```

### PATCH /api/products/:id

Update product fields (partial update).

**Request:**
```json
{
  "nameMn": "Updated Name",
  "descriptionMn": "Updated Description",
  "priceMnt": 150000,
  "imagesFinal": ["https://s3..."]
}
```

**Response (200):**
```json
{
  "id": "gmarket-skincare-0",
  // ... updated product object
}
```

### PATCH /api/products/:id/status

Update product status.

**Request:**
```json
{
  "status": "READY"
}
```

**Validation:**
- READY and PUSHED require product to be valid
- Returns 400 if validation fails

**Response (200):**
```json
{
  "id": "gmarket-skincare-0",
  "status": "READY"
}
```

**Response (400):**
```json
{
  "error": "Validation failed",
  "errors": [
    { "field": "nameMn", "message": "Mongolian name is required" }
  ]
}
```

### POST /api/products/:id/status/bulk

Bulk update product statuses.

**Request:**
```json
{
  "productIds": ["id1", "id2", "id3"],
  "status": "PUSHED"
}
```

**Response (200):**
```json
{
  "updated": 3,
  "failed": 0,
  "errors": []
}
```

**Response (207 - Partial Success):**
```json
{
  "updated": 2,
  "failed": 1,
  "errors": [
    { "productId": "id3", "error": "Validation failed" }
  ]
}
```

### PATCH /api/products/:id/visibility

Toggle product visibility.

**Request:**
```json
{
  "visibility": "hidden"
}
```

**Response (200):**
```json
{
  "id": "gmarket-skincare-0",
  "visibility": "hidden"
}
```

### POST /api/products/:id/validate

Validate product without changing status.

**Response (200):**
```json
{
  "isValid": false,
  "errors": [
    { "field": "nameMn", "message": "Mongolian name is required" }
  ]
}
```

---

## Drafts API

### GET /api/drafts

List drafts for current user.

**Query Parameters:**
- `productId`: Filter by product ID
- `page`, `limit`: Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "productId": "gmarket-skincare-0",
      "changes": {
        "nameMn": "Updated Name",
        "priceMnt": 150000
      },
      "createdAt": "2024-01-20T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### POST /api/drafts

Create or update draft.

**Request:**
```json
{
  "productId": "gmarket-skincare-0",
  "changes": {
    "nameMn": "Updated Name",
    "priceMnt": 150000
  }
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "productId": "gmarket-skincare-0",
  "changes": { ... },
  "createdAt": "2024-01-20T10:00:00.000Z"
}
```

### DELETE /api/drafts/:id

Delete draft.

**Response (204):** No content

---

## Import Jobs API

### POST /api/import/jobs

Create import job.

**Request:**
```json
{
  "store": "gmarket",
  "category": "Skincare",
  "count": 20
}
```

**Response (202):**
```json
{
  "jobId": "uuid",
  "status": "pending",
  "createdAt": "2024-01-20T10:00:00.000Z"
}
```

### GET /api/import/jobs/:jobId

Get import job status.

**Response (200):**
```json
{
  "jobId": "uuid",
  "status": "completed" | "pending" | "processing" | "failed",
  "progress": {
    "total": 20,
    "completed": 15,
    "failed": 1
  },
  "createdAt": "2024-01-20T10:00:00.000Z",
  "completedAt": "2024-01-20T10:05:00.000Z",
  "error": null
}
```

### GET /api/import/jobs/:jobId/products

Get products from import job.

**Response (200):**
```json
{
  "data": [ /* product objects */ ],
  "pagination": { ... }
}
```

---

## Source Check API

### POST /api/source-check

Trigger source check for all pushed products.

**Response (202):**
```json
{
  "jobId": "uuid",
  "status": "pending"
}
```

### POST /api/source-check/products/:id

Trigger source check for single product.

**Response (200):**
```json
{
  "id": "gmarket-skincare-0",
  "sourceLastCheckedPriceKrw": 38500,
  "sourceLastCheckedInStock": true,
  "sourceLastCheckedAt": "2024-01-20T10:00:00.000Z",
  "sourcePriceChanged": true,
  "sourceOutOfStock": false
}
```

### GET /api/source-check/history/:productId

Get source check history for product.

**Query Parameters:**
- `limit`: Number of records (default: 50)

**Response (200):**
```json
{
  "data": [
    {
      "priceKrw": 35000,
      "inStock": true,
      "checkedAt": "2024-01-19T08:00:00.000Z"
    },
    {
      "priceKrw": 38500,
      "inStock": true,
      "checkedAt": "2024-01-20T08:00:00.000Z"
    }
  ]
}
```

---

## Common Patterns

### Error Response Format

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details
  }
}
```

**Status Codes:**
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

### Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Filtering

Filter parameters are combined with AND logic:

```
GET /api/products?status=PUSHED&store=gmarket&visibility=public
```

Returns products that are:
- Status = PUSHED AND
- Store = gmarket AND
- Visibility = public

### Sorting

**Query Parameters:**
- `sort`: Field name (createdAt, updatedAt, priceMnt, nameMn)
- `order`: asc or desc (default: desc)

**Example:**
```
GET /api/products?sort=createdAt&order=asc
```

### Search

Search parameter searches across multiple fields:

```
GET /api/products?search=cream
```

Searches in: `nameMn`, `nameOriginal`, `brand`

### Authentication Headers

All authenticated endpoints require:

```
Authorization: Bearer <jwt-token>
```

### Rate Limiting

**Limits:**
- 100 requests per minute per user
- 1000 requests per hour per user

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642680000
```

**Response (429):**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## WebSocket Events (Future)

### Product Updates

**Event:** `product:updated`

**Payload:**
```json
{
  "productId": "gmarket-skincare-0",
  "changes": {
    "status": "READY"
  }
}
```

### Import Job Progress

**Event:** `import:progress`

**Payload:**
```json
{
  "jobId": "uuid",
  "progress": {
    "total": 20,
    "completed": 15
  }
}
```

---

## File Reference

- Current Store Actions: `lib/store.ts`
- Types: `types/product.ts`

