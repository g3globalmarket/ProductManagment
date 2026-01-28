# Testing Strategy

Comprehensive testing approach for Product Import Tool.

## Table of Contents

- [Testing Pyramid](#testing-pyramid)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Mocking Strategy](#mocking-strategy)
- [Test Coverage Goals](#test-coverage-goals)
- [CI/CD Integration](#cicd-integration)

---

## Testing Pyramid

```
        /\
       /  \
      / E2E \        (10%)
     /--------\
    /          \
   / Integration \  (30%)
  /----------------\
 /                  \
/     Unit Tests     \  (60%)
/--------------------\
```

**Distribution:**
- **Unit Tests:** 60% - Fast, isolated, test individual functions
- **Integration Tests:** 30% - Test component interactions
- **E2E Tests:** 10% - Test critical user flows

---

## Unit Tests

### What to Test

1. **Validation Logic**
   - Product validation rules
   - Field-level validation
   - Error message generation

2. **State Management**
   - Store actions
   - State transitions
   - Computed values

3. **Utility Functions**
   - Data transformations
   - Formatting functions
   - Helper functions

4. **Business Logic**
   - Status transitions
   - Price calculations
   - Filter/sort logic

### Example Tests

**File:** `lib/store.test.ts`

```typescript
import { validateProduct } from './store'

describe('validateProduct', () => {
  it('should validate product with all required fields', () => {
    const product = {
      nameMn: 'Test',
      descriptionMn: 'Description',
      priceMnt: 1000,
      imagesFinal: ['https://example.com/image.jpg']
    }
    const result = validateProduct(product)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should fail validation when nameMn is empty', () => {
    const product = {
      nameMn: '',
      descriptionMn: 'Description',
      priceMnt: 1000,
      imagesFinal: ['https://example.com/image.jpg']
    }
    const result = validateProduct(product)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual({
      field: 'nameMn',
      message: 'Mongolian name is required'
    })
  })

  it('should fail validation when priceMnt is zero', () => {
    const product = {
      nameMn: 'Test',
      descriptionMn: 'Description',
      priceMnt: 0,
      imagesFinal: ['https://example.com/image.jpg']
    }
    const result = validateProduct(product)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual({
      field: 'priceMnt',
      message: 'Price must be greater than 0'
    })
  })
})
```

**File:** `lib/deterministic-prng.test.ts`

```typescript
import { simulateSourceCheck } from './deterministic-prng'

describe('simulateSourceCheck', () => {
  it('should return deterministic results for same inputs', () => {
    const result1 = simulateSourceCheck('id1', 'gmarket', 'url', 10000)
    const result2 = simulateSourceCheck('id1', 'gmarket', 'url', 10000)
    expect(result1).toEqual(result2)
  })

  it('should change results across days', () => {
    // Mock different day keys
    const result1 = simulateSourceCheck('id1', 'gmarket', 'url', 10000)
    // Simulate next day
    const result2 = simulateSourceCheck('id1', 'gmarket', 'url', 10000)
    // Results may differ (not guaranteed, but likely)
  })
})
```

### Test Framework

**Recommended:** Vitest or Jest

**Setup:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## Integration Tests

### What to Test

1. **API Endpoints**
   - Request/response handling
   - Authentication/authorization
   - Error handling
   - Database interactions

2. **Service Integration**
   - Database queries
   - External API calls (mocked)
   - Queue interactions

3. **Component Integration**
   - Store + API client
   - Form submission
   - State updates

### Example Tests

**File:** `api/products.test.ts`

```typescript
import { createTestServer } from './test-utils'
import { createProduct, getProduct } from './products'

describe('Products API', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer()
  })

  afterAll(async () => {
    await server.close()
  })

  it('should create product', async () => {
    const product = await createProduct({
      sourceStore: 'gmarket',
      category: 'Skincare',
      sourceUrl: 'https://gmarket.com/product/1',
      nameOriginal: 'Test Product',
      priceKrw: 10000
    })
    expect(product.id).toBeDefined()
    expect(product.status).toBe('RAW')
  })

  it('should get product by id', async () => {
    const created = await createProduct({...})
    const product = await getProduct(created.id)
    expect(product).toEqual(created)
  })

  it('should validate product before pushing', async () => {
    const product = await createProduct({
      nameMn: '', // Invalid
      ...
    })
    await expect(updateProductStatus(product.id, 'PUSHED'))
      .rejects.toThrow('Validation failed')
  })
})
```

### Test Database

**Setup:**
- Use test database (separate from production)
- Run migrations before tests
- Clean database between tests
- Use transactions for isolation

---

## E2E Tests

### What to Test

1. **Critical User Flows**
   - Import → Review → Push
   - Edit product → Save draft
   - Bulk operations
   - Source check

2. **Error Scenarios**
   - Validation failures
   - Network errors
   - Not found errors

3. **Cross-Browser**
   - Chrome, Firefox, Safari
   - Mobile browsers

### Example Tests

**File:** `e2e/import-flow.spec.ts` (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Import Flow', () => {
  test('should import and push product', async ({ page }) => {
    // Navigate to import page
    await page.goto('/import/new')
    
    // Select store and category
    await page.selectOption('[name="store"]', 'gmarket')
    await page.selectOption('[name="category"]', 'Skincare')
    await page.fill('[name="count"]', '5')
    
    // Search
    await page.click('button:has-text("Search")')
    await page.waitForSelector('.product-card', { timeout: 5000 })
    
    // Open first product
    await page.click('.product-card:first-child button:has-text("Open")')
    await page.waitForURL(/\/import\/new\/[^/]+$/)
    
    // Edit product
    await page.fill('[name="nameMn"]', 'Test Product')
    await page.fill('[name="descriptionMn"]', 'Test Description')
    await page.fill('[name="priceMnt"]', '100000')
    
    // Save draft
    await page.click('button:has-text("Save Draft")')
    await expect(page.locator('.toast')).toContainText('Draft Saved')
    
    // Mark as ready
    await page.click('button:has-text("Mark as Ready")')
    await expect(page.locator('.toast')).toContainText('Marked as Ready')
    
    // Push
    await page.click('button:has-text("Push")')
    await expect(page.locator('.toast')).toContainText('Pushed')
    
    // Verify on dashboard
    await page.goto('/import')
    await expect(page.locator('text=Pushed')).toBeVisible()
  })
})
```

### Test Framework

**Recommended:** Playwright

**Setup:**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Mocking Strategy

### External APIs

**Translation API:**
```typescript
// __mocks__/translation-api.ts
export const translateText = jest.fn().mockResolvedValue({
  translatedText: 'Mocked Translation'
})
```

**Currency API:**
```typescript
// __mocks__/currency-api.ts
export const getExchangeRate = jest.fn().mockResolvedValue({
  rate: 3.5,
  timestamp: Date.now()
})
```

### Store Scraping

**Mock Scraper:**
```typescript
// __mocks__/scraper.ts
export const scrapeProducts = jest.fn().mockResolvedValue([
  {
    nameOriginal: 'Mock Product',
    priceKrw: 10000,
    // ... mock data
  }
])
```

### Database

**Option 1: Test Database**
- Real PostgreSQL instance
- Isolated test data
- Transactions for cleanup

**Option 2: In-Memory Database**
- SQLite in-memory
- Faster tests
- May have compatibility issues

**Option 3: Mock ORM**
- Mock database calls
- Fastest
- Less realistic

---

## Test Coverage Goals

### Minimum Coverage

- **Unit Tests:** 80% coverage
- **Integration Tests:** 70% coverage
- **E2E Tests:** Critical paths only

### Coverage by Area

| Area | Target | Priority |
|------|--------|----------|
| Validation logic | 100% | Critical |
| State management | 90% | High |
| API endpoints | 85% | High |
| UI components | 70% | Medium |
| Utility functions | 90% | Medium |

### Coverage Tools

**Vitest Coverage:**
```json
{
  "coverage": {
    "provider": "v8",
    "reporter": ["text", "json", "html"],
    "thresholds": {
      "lines": 80,
      "functions": 80,
      "branches": 75,
      "statements": 80
    }
  }
}
```

---

## CI/CD Integration

### Test Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

### Test Reports

- **Unit Tests:** Coverage report uploaded to Codecov
- **Integration Tests:** Test results in CI logs
- **E2E Tests:** Screenshots/videos on failure

---

## Test Data Management

### Fixtures

**File:** `tests/fixtures/products.ts`

```typescript
export const validProduct = {
  id: 'test-product-1',
  sourceStore: 'gmarket',
  category: 'Skincare',
  nameOriginal: 'Test Product',
  nameMn: 'Тест Бүтээгдэхүүн',
  descriptionMn: 'Тайлбар',
  priceKrw: 10000,
  priceMnt: 35000,
  imagesFinal: ['https://example.com/image.jpg'],
  status: 'RAW',
  visibility: 'public'
}

export const invalidProduct = {
  ...validProduct,
  nameMn: '', // Invalid
  imagesFinal: [] // Invalid
}
```

### Test Database Seeding

```typescript
// tests/seed.ts
export async function seedTestDatabase() {
  await db.products.createMany({
    data: [validProduct, invalidProduct]
  })
}
```

---

## Performance Testing

### Load Testing

**Tool:** k6 or Artillery

**Scenarios:**
- API endpoint load
- Concurrent user sessions
- Database query performance

**Example:**
```javascript
// load-test.js
import http from 'k6/http'

export default function() {
  http.get('https://api.example.com/products')
}
```

### Stress Testing

- Identify breaking points
- Test auto-scaling
- Database connection limits

---

## Test Maintenance

### Best Practices

1. **Keep Tests Fast**
   - Mock external dependencies
   - Use test database
   - Parallel execution

2. **Keep Tests Simple**
   - One assertion per test (when possible)
   - Clear test names
   - Arrange-Act-Assert pattern

3. **Maintain Test Data**
   - Use fixtures
   - Keep data realistic
   - Update when schema changes

4. **Review Test Failures**
   - Fix flaky tests
   - Update outdated tests
   - Remove obsolete tests

---

## File Reference

- Current Validation: `lib/store.ts` - `validateProduct()`
- Fake Data: `lib/fake-data.ts`
- Source Check: `lib/deterministic-prng.ts`

