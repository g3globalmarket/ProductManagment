# Documentation Hub

Central index for all Product Import Tool documentation.

## Start Here

**New to the project?** Read in this order:

1. **[DOCUMENTATION_SUMMARY.md](./DOCUMENTATION_SUMMARY.md)** - Overview of all documentation
2. **[PRODUCTION_READY_BLUEPRINT.md](./PRODUCTION_READY_BLUEPRINT.md)** - Complete system overview and how everything works
3. **[PRODUCTION_PLAN.md](./PRODUCTION_PLAN.md)** - Step-by-step migration plan with phases
4. **[EXECUTION_CHECKLIST.md](./EXECUTION_CHECKLIST.md)** - Actionable task checklist for implementation

**Quick Start:**
- [README.md](../README.md) - Quick start guide and demo instructions

---

## Documentation Index

### Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [PRODUCTION_READY_BLUEPRINT.md](./PRODUCTION_READY_BLUEPRINT.md) | **Complete system overview** - How everything works, flows, architecture, roadmap | Everyone |
| [FEATURES_AND_FLOWS.md](./FEATURES_AND_FLOWS.md) | **User-facing features** - Detailed feature docs with UI flows | Product, Frontend, QA |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **System architecture** - Current MVP and production design | Backend, DevOps |
| [DATA_MODEL.md](./DATA_MODEL.md) | **Data structures** - Types, schemas, database design | Backend, Frontend |
| [STATE_MACHINE.md](./STATE_MACHINE.md) | **Product lifecycle** - Status transitions and rules | Frontend, Backend |

### Production Planning

| Document | Purpose | Audience |
|----------|---------|----------|
| [PRODUCTION_PLAN.md](./PRODUCTION_PLAN.md) | **Migration roadmap** - 10-phase plan from MVP to production | Project Managers, Tech Leads |
| [API_CONTRACT.md](./API_CONTRACT.md) | **REST API specs** - Endpoints, requests, responses, errors | Backend Engineers |
| [SECURITY_AND_COMPLIANCE.md](./SECURITY_AND_COMPLIANCE.md) | **Security requirements** - Auth, RBAC, validation, compliance | Security, Backend |
| [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) | **Testing approach** - Unit, integration, E2E tests | QA, Engineers |
| [OPERATIONS.md](./OPERATIONS.md) | **Deployment & ops** - CI/CD, monitoring, scaling | DevOps, SRE |

### Planning & Roadmap

| Document | Purpose | Audience |
|----------|---------|----------|
| [ROADMAP.md](./ROADMAP.md) | **Feature backlog** - Prioritized future features | Product, Engineering |

---

## Recommended Reading Order

### For Frontend Engineers

1. [PRODUCTION_READY_BLUEPRINT.md](./PRODUCTION_READY_BLUEPRINT.md) - Section 3 (UI/UX Architecture), Section 6 (User Flows)
2. [FEATURES_AND_FLOWS.md](./FEATURES_AND_FLOWS.md) - All sections
3. [STATE_MACHINE.md](./STATE_MACHINE.md) - Product lifecycle
4. [API_CONTRACT.md](./API_CONTRACT.md) - When building API client

### For Backend Engineers

1. [PRODUCTION_READY_BLUEPRINT.md](./PRODUCTION_READY_BLUEPRINT.md) - Section 4 (Data Model), Section 7 (Roadmap)
2. [DATA_MODEL.md](./DATA_MODEL.md) - Complete schema
3. [API_CONTRACT.md](./API_CONTRACT.md) - All endpoints
4. [ARCHITECTURE.md](./ARCHITECTURE.md) - Production architecture
5. [SECURITY_AND_COMPLIANCE.md](./SECURITY_AND_COMPLIANCE.md) - Auth and security

### For DevOps Engineers

1. [PRODUCTION_READY_BLUEPRINT.md](./PRODUCTION_READY_BLUEPRINT.md) - Section 2 (How to Run), Section 7 (Roadmap)
2. [OPERATIONS.md](./OPERATIONS.md) - Deployment and monitoring
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - Infrastructure design
4. [SECURITY_AND_COMPLIANCE.md](./SECURITY_AND_COMPLIANCE.md) - Security requirements

### For Product Managers

1. [PRODUCTION_READY_BLUEPRINT.md](./PRODUCTION_READY_BLUEPRINT.md) - Section 1 (Overview), Section 6 (User Flows)
2. [FEATURES_AND_FLOWS.md](./FEATURES_AND_FLOWS.md) - All features
3. [ROADMAP.md](./ROADMAP.md) - Future plans
4. [PRODUCTION_PLAN.md](./PRODUCTION_PLAN.md) - Migration timeline

### For QA Engineers

1. [FEATURES_AND_FLOWS.md](./FEATURES_AND_FLOWS.md) - All user flows
2. [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) - Testing approach
3. [STATE_MACHINE.md](./STATE_MACHINE.md) - Status transitions to test
4. [PRODUCTION_READY_BLUEPRINT.md](./PRODUCTION_READY_BLUEPRINT.md) - Section 6 (User Flows)

---

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| PRODUCTION_READY_BLUEPRINT.md | ✅ Complete | 2024 |
| FEATURES_AND_FLOWS.md | ✅ Complete | 2024 |
| ARCHITECTURE.md | ✅ Complete | 2024 |
| DATA_MODEL.md | ✅ Complete | 2024 |
| STATE_MACHINE.md | ✅ Complete | 2024 |
| PRODUCTION_PLAN.md | ✅ Complete | 2024 |
| API_CONTRACT.md | ✅ Complete | 2024 |
| SECURITY_AND_COMPLIANCE.md | ✅ Complete | 2024 |
| TESTING_STRATEGY.md | ✅ Complete | 2024 |
| OPERATIONS.md | ✅ Complete | 2024 |
| ROADMAP.md | ✅ Complete | 2024 |

---

## Key Concepts

### Product Lifecycle

**Status Flow:** `RAW` → `DRAFT` → `READY` → `PUSHED`

- **RAW**: Initial state after import (fake data)
- **DRAFT**: Saved but not validated
- **READY**: Validated and ready to push
- **PUSHED**: Successfully pushed to production

See [STATE_MACHINE.md](./STATE_MACHINE.md) for complete details.

### Current State (MVP)

- **UI-only**: No backend, no real APIs
- **Fake data**: Deterministic fake product generation
- **localStorage**: All data persists to browser storage
- **No auth**: Single role (admin/reviewer)

### Production Target

- **Backend API**: REST endpoints for all operations
- **Database**: PostgreSQL with proper schema
- **Authentication**: JWT with RBAC (Admin/Reviewer roles)
- **Real scraping**: Actual product import from stores
- **Translation**: Real translation API integration
- **Monitoring**: Full observability stack

See [PRODUCTION_PLAN.md](./PRODUCTION_PLAN.md) for migration steps.

---

## Quick Reference

### Routes

- `/` → Redirects to `/import`
- `/import` → Dashboard
- `/import/new` → Search + Results
- `/import/new/[id]` → Product Editor

### Key Files

- `lib/store.ts` - Zustand store (state management)
- `types/product.ts` - TypeScript types
- `lib/fake-data.ts` - Fake data generator
- `app/import/page.tsx` - Dashboard
- `app/import/new/page.tsx` - Search page
- `app/import/new/[id]/page.tsx` - Editor

### localStorage Key

- `product-import-store-v2` - Main product store

---

## Contributing to Documentation

When updating documentation:

1. **Keep it accurate** - Reference actual file paths and line numbers
2. **Update the blueprint** - If you change behavior, update PRODUCTION_READY_BLUEPRINT.md
3. **Cross-reference** - Link between related documents
4. **Version notes** - Document what changed and when

---

**Last Updated:** 2024  
**Maintained By:** Engineering Team

