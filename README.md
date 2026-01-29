# Product Import Tool - UI MVP

A UI-only MVP for importing and managing products from various stores (Gmarket, Olive Young, Auction). This is a frontend-only implementation with fake/local data for UX validation.

## Features

- **Dashboard**: Overview with summary cards and recent activity
- **Product Search**: Search products by store, category, and count
- **Product Editor**: Edit products with validation, prev/next navigation
- **Status Management**: RAW → DRAFT → READY → PUSHED workflow
- **Bulk Actions**: Select multiple products and apply actions
- **Local Persistence**: All data persists to localStorage

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Zustand (state management)
- localStorage (persistence)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Demo

### 1. Dashboard (`/import`)
- View summary cards: Total Products, Drafts, Ready to Push, Pushed
- See recent activity list
- Click "Import Products" to start

### 2. Import/Search (`/import/new`)
- Select a **Store**: Gmarket / Olive Young / Auction
- Select a **Category** (options change based on store)
- Set **Count** (default: 20)
- Click **Search**
- Wait for loading skeleton (800-1200ms simulation)
- View product cards with:
  - Image thumbnails
  - Product name (Mongolian)
  - Brand
  - Price in MNT
  - Status badge
  - Warning icon if missing fields

### 3. Product Actions
- **Open**: Opens full editor page
- **Save Draft**: Saves as DRAFT status
- **Push**: Validates and pushes (only if valid)
- **Bulk Actions**: 
  - Check multiple products
  - Use bulk bar to save draft or push multiple

### 4. Product Editor (`/import/new/[id]`)
- **Two-column layout**:
  - Left: Final (Editable) fields
  - Right: Original (Read-only) reference
- **Editable fields**:
  - Name (Mongolian) - required
  - Description (Mongolian) - required
  - Brand - optional
  - Price (MNT) - required, must be > 0
  - Images - required, at least 1
- **Image Search** (if enabled):
  - Click "+ Add Image" to open image search dialog
  - Automatically searches using product info (title, brand, store)
  - Can override with custom search query
  - Select multiple images from search results
  - Fallback: Paste URL manually
  - Uses Google Custom Search API + Gemini for English query optimization
- **Validation**:
  - Inline error messages
  - Summary at top if errors
  - Buttons disabled if invalid
- **Navigation**:
  - Prev/Next buttons
  - Keyboard shortcuts: `j` (next), `k` (prev), `Ctrl+S` (save)
- **Actions**:
  - Save Draft
  - Mark as Ready (only if valid)
  - Push (only if valid)
- **Unsaved Changes**:
  - Dialog appears when navigating away with unsaved changes
  - Options: Discard / Save Draft / Cancel

### 5. Status Workflow
- **RAW**: Initial state after import
- **DRAFT**: Saved but not validated
- **READY**: Validated and ready to push
- **PUSHED**: Successfully pushed

### 6. Filters & Search
- Search by name/brand
- Filter by status (All/RAW/DRAFT/READY/PUSHED)
- Results update in real-time

## Data Characteristics

The fake data generator creates realistic products with:
- Deterministic results (same inputs = same outputs)
- Realistic imperfections:
  - ~20% missing brand
  - ~15% missing Mongolian description
  - ~10% missing images
- This allows testing validation and warning badges

## State Persistence

All product data and edits are persisted to localStorage with key `product-import-store-v2`. The store includes automatic migration from v1 to v2. Refresh the page to see your data persist.

## Keyboard Shortcuts

- `j`: Navigate to next product (editor)
- `k`: Navigate to previous product (editor)
- `Ctrl+S` / `Cmd+S`: Save draft (editor)

## Project Structure

```
/app
  /import          # Dashboard
  /import/new      # Search + Results
  /import/new/[id] # Product Editor
/components
  /ui              # shadcn/ui components
/lib
  store.ts         # Zustand store with persistence
  fake-data.ts     # Deterministic fake data generator
/types
  product.ts       # TypeScript types
```

## Environment Variables

### Basic Setup
- `NEXT_PUBLIC_USE_API`: Set to `true` to enable MongoDB/API mode
- `MONGODB_URI`: MongoDB connection string (required for API mode)
- `MONGODB_DB`: Database name (required for API mode)
- `ALLOW_DEV_SEED`: Set to `true` to enable dev seed endpoint

### Image Search (Optional)
To enable image search functionality:
- `IMAGE_SEARCH_ENABLED`: Set to `true` to enable image search
- `GOOGLE_CLOUD_API_KEY`: Google Cloud API key for Custom Search
- `CUSTOM_SEARCH_ENGINE_ID`: Custom Search Engine ID (CX)
- `GEMINI_API_KEY`: Google AI (Gemini) API key for query optimization
- `GEMINI_MODEL`: Gemini model name (default: `gemini-2.0-flash`)
- `IMAGE_SEARCH_RIGHTS`: Optional rights filter (e.g., `cc_publicdomain,cc_attribute`)

See `.env.example` for all available environment variables.

## Notes

- **No backend required** (localStorage mode): Everything works with fake/local data
- **API mode**: Requires MongoDB connection and optional image search APIs
- **Image Search**: Uses Google Custom Search + Gemini API to find product images
- **Deterministic**: Same search inputs produce same results (localStorage mode)
- **Production-ready UI**: Polished with loading states, empty states, error handling

## Documentation

📚 **[Documentation Hub](./docs/README.md)** - Start here for complete documentation index and reading guides

Complete documentation for turning this UI-only MVP into a production-ready system:

- **[Production-Ready Blueprint](./docs/PRODUCTION_READY_BLUEPRINT.md)** - Complete system overview and roadmap
- **[Architecture](./docs/ARCHITECTURE.md)** - Current and future system architecture
- **[Features & Flows](./docs/FEATURES_AND_FLOWS.md)** - Detailed feature documentation
- **[Data Model](./docs/DATA_MODEL.md)** - Product schema and data structures
- **[State Machine](./docs/STATE_MACHINE.md)** - Product lifecycle and state transitions
- **[API Contract](./docs/API_CONTRACT.md)** - Production API specifications
- **[Production Plan](./docs/PRODUCTION_PLAN.md)** - Step-by-step migration guide
- **[Security & Compliance](./docs/SECURITY_AND_COMPLIANCE.md)** - Security requirements
- **[Operations](./docs/OPERATIONS.md)** - Deployment, monitoring, and maintenance
- **[Testing Strategy](./docs/TESTING_STRATEGY.md)** - Testing approach and coverage
- **[Roadmap](./docs/ROADMAP.md)** - Feature prioritization and future plans

## How to Use These Docs to Start Production

### For Product Managers / Stakeholders

1. Start with **[ROADMAP.md](./docs/ROADMAP.md)** to understand feature priorities
2. Review **[FEATURES_AND_FLOWS.md](./docs/FEATURES_AND_FLOWS.md)** to see current capabilities
3. Check **[PRODUCTION_PLAN.md](./docs/PRODUCTION_PLAN.md)** for timeline and phases

### For Backend Engineers

1. **Read [ARCHITECTURE.md](./docs/ARCHITECTURE.md)** to understand system design
2. **Reference [API_CONTRACT.md](./docs/API_CONTRACT.md)** for endpoint specifications
3. **Follow [DATA_MODEL.md](./docs/DATA_MODEL.md)** for database schema
4. **Implement [STATE_MACHINE.md](./docs/STATE_MACHINE.md)** for business logic
5. **Review [SECURITY_AND_COMPLIANCE.md](./docs/SECURITY_AND_COMPLIANCE.md)** for security requirements

### For Frontend Engineers

1. **Review [FEATURES_AND_FLOWS.md](./docs/FEATURES_AND_FLOWS.md)** to understand current UI behavior
2. **Check [API_CONTRACT.md](./docs/API_CONTRACT.md)** for API integration
3. **Follow [PRODUCTION_PLAN.md](./docs/PRODUCTION_PLAN.md)** Phase 1 for API client migration

### For DevOps / SRE

1. **Read [OPERATIONS.md](./docs/OPERATIONS.md)** for deployment and monitoring
2. **Review [ARCHITECTURE.md](./docs/ARCHITECTURE.md)** for infrastructure needs
3. **Check [SECURITY_AND_COMPLIANCE.md](./docs/SECURITY_AND_COMPLIANCE.md)** for security setup

### For QA / Test Engineers

1. **Review [TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md)** for testing approach
2. **Check [FEATURES_AND_FLOWS.md](./docs/FEATURES_AND_FLOWS.md)** for test scenarios
3. **Reference [STATE_MACHINE.md](./docs/STATE_MACHINE.md)** for state transition tests

### Quick Start Guide

**Week 1: Planning**
- Read all documentation
- Set up development environment
- Review architecture decisions

**Week 2-4: Backend Foundation**
- Follow [PRODUCTION_PLAN.md](./docs/PRODUCTION_PLAN.md) Phase 1-2
- Implement API per [API_CONTRACT.md](./docs/API_CONTRACT.md)
- Set up database per [DATA_MODEL.md](./docs/DATA_MODEL.md)

**Week 5+: Feature Implementation**
- Follow [PRODUCTION_PLAN.md](./docs/PRODUCTION_PLAN.md) remaining phases
- Reference [FEATURES_AND_FLOWS.md](./docs/FEATURES_AND_FLOWS.md) for behavior
- Implement [STATE_MACHINE.md](./docs/STATE_MACHINE.md) logic

## Future Enhancements (Not in MVP)

- Real store scraping
- Translation API integration
- Currency conversion API
- Backend API integration
- User authentication
- Advanced filtering and sorting

